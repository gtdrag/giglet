import { Platform } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decrypt, encrypt } from '../utils/encryption';
import { logger } from '../utils/logger';
import { doorDashService, DoorDashSession, DoorDashDelivery } from '../services/platforms/doordash.service';
import { PlatformSyncJobData } from '../lib/queue';

// Session cache to avoid re-login on every sync
const sessionCache = new Map<string, { session: DoorDashSession; encryptedSession: string }>();

/**
 * Process a platform sync job
 * This is called by the worker for each queued sync
 */
export async function processPlatformSync(data: PlatformSyncJobData): Promise<void> {
  const { platformAccountId, userId, isInitialSync } = data;

  // Get platform account
  const account = await prisma.platformAccount.findUnique({
    where: { id: platformAccountId },
  });

  if (!account) {
    throw new Error(`Platform account not found: ${platformAccountId}`);
  }

  if (account.status === 'DISCONNECTED') {
    logger.info('Skipping sync for disconnected account', { platformAccountId });
    return;
  }

  // Update status to syncing
  await prisma.platformAccount.update({
    where: { id: platformAccountId },
    data: { status: 'SYNCING' },
  });

  try {
    // Route to appropriate platform handler
    switch (account.platform) {
      case Platform.DOORDASH:
        await syncDoorDash(account.id, userId, account.encryptedCreds, isInitialSync, account.lastSyncAt);
        break;
      case Platform.UBEREATS:
        // TODO: Implement Uber Eats sync
        logger.warn('Uber Eats sync not yet implemented', { platformAccountId });
        break;
      default:
        throw new Error(`Unknown platform: ${account.platform}`);
    }

    // Update status to connected (success)
    await prisma.platformAccount.update({
      where: { id: platformAccountId },
      data: {
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });

    logger.info('Platform sync completed successfully', {
      platformAccountId,
      platform: account.platform,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update status to error
    await prisma.platformAccount.update({
      where: { id: platformAccountId },
      data: {
        status: 'ERROR',
        lastSyncError: errorMessage,
      },
    });

    // Clear session cache on error (may need re-login)
    sessionCache.delete(platformAccountId);

    logger.error('Platform sync failed', {
      platformAccountId,
      platform: account.platform,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Sync DoorDash account
 */
async function syncDoorDash(
  accountId: string,
  userId: string,
  encryptedCreds: string,
  isInitialSync: boolean,
  lastSyncAt: Date | null
): Promise<void> {
  // Determine sync date range
  let syncSince: Date;

  if (isInitialSync) {
    // Initial sync: get last 30 days
    syncSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (lastSyncAt) {
    // Incremental sync: get since last sync
    syncSince = lastSyncAt;
  } else {
    // Fallback: last 7 days
    syncSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }

  logger.info('Starting DoorDash sync', {
    accountId,
    isInitialSync,
    syncSince: syncSince.toISOString(),
  });

  // Get or create session
  let session = await getOrCreateSession(accountId, encryptedCreds);

  // Fetch earnings
  const result = await doorDashService.fetchEarnings(session, syncSince);

  // Store deliveries
  if (result.deliveries.length > 0) {
    await storeDeliveries(accountId, userId, Platform.DOORDASH, result.deliveries);
  }

  // Update session cache with new cookies
  if (result.sessionCookies.length > 0) {
    const updatedSession: DoorDashSession = {
      cookies: result.sessionCookies,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    sessionCache.set(accountId, {
      session: updatedSession,
      encryptedSession: encrypt(JSON.stringify(updatedSession)),
    });
  }

  logger.info('DoorDash sync completed', {
    accountId,
    deliveriesFound: result.deliveries.length,
  });
}

/**
 * Get existing session from cache or create new one
 */
async function getOrCreateSession(accountId: string, encryptedCreds: string): Promise<DoorDashSession> {
  // Check cache first
  const cached = sessionCache.get(accountId);
  if (cached && cached.session.expiresAt > new Date()) {
    // Verify session is still valid
    const isValid = await doorDashService.checkSession(cached.session);
    if (isValid) {
      logger.debug('Using cached session', { accountId });
      return cached.session;
    }
  }

  // Need to login
  logger.info('Creating new DoorDash session', { accountId });

  const decryptedCreds = JSON.parse(decrypt(encryptedCreds)) as {
    email: string;
    password: string;
  };

  const session = await doorDashService.login(decryptedCreds);

  // Cache the session
  sessionCache.set(accountId, {
    session,
    encryptedSession: encrypt(JSON.stringify(session)),
  });

  return session;
}

/**
 * Store deliveries in database (upsert to handle duplicates)
 */
async function storeDeliveries(
  platformAccountId: string,
  userId: string,
  platform: Platform,
  deliveries: DoorDashDelivery[]
): Promise<void> {
  logger.info('Storing deliveries', {
    platformAccountId,
    count: deliveries.length,
  });

  // Use transaction for batch insert
  await prisma.$transaction(
    deliveries.map((delivery) =>
      prisma.delivery.upsert({
        where: {
          platform_externalId: {
            platform,
            externalId: delivery.externalId,
          },
        },
        update: {
          earnings: delivery.earnings,
          tip: delivery.tip,
          basePay: delivery.basePay,
          restaurantName: delivery.restaurantName,
          deliveredAt: delivery.deliveredAt,
        },
        create: {
          userId,
          platformAccountId,
          platform,
          externalId: delivery.externalId,
          earnings: delivery.earnings,
          tip: delivery.tip,
          basePay: delivery.basePay,
          restaurantName: delivery.restaurantName,
          deliveredAt: delivery.deliveredAt,
        },
      })
    )
  );

  logger.info('Deliveries stored successfully', {
    platformAccountId,
    count: deliveries.length,
  });
}
