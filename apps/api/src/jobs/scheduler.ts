import { prisma } from '../lib/prisma';
import { enqueuePlatformSync, getPlatformSyncQueue } from '../lib/queue';
import { logger } from '../utils/logger';

// Sync interval: 4 hours
const SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000;

// Stagger jobs to avoid thundering herd
const STAGGER_DELAY_MS = 5000; // 5 seconds between jobs

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the scheduler for recurring platform syncs
 */
export async function startScheduler(): Promise<void> {
  if (schedulerInterval) {
    logger.warn('Scheduler already running');
    return;
  }

  logger.info('Starting platform sync scheduler', {
    intervalHours: SYNC_INTERVAL_MS / (60 * 60 * 1000),
  });

  // Run immediately on start, then every 4 hours
  await scheduleAllPlatformSyncs();

  schedulerInterval = setInterval(async () => {
    await scheduleAllPlatformSyncs();
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Platform sync scheduler stopped');
  }
}

/**
 * Schedule syncs for all connected platform accounts
 */
async function scheduleAllPlatformSyncs(): Promise<void> {
  logger.info('Scheduling platform syncs for all connected accounts');

  try {
    // Get all connected platform accounts
    const accounts = await prisma.platformAccount.findMany({
      where: {
        status: {
          in: ['CONNECTED', 'ERROR'], // Also retry errored accounts
        },
      },
      select: {
        id: true,
        userId: true,
        platform: true,
        lastSyncAt: true,
      },
    });

    if (accounts.length === 0) {
      logger.info('No connected platform accounts to sync');
      return;
    }

    logger.info('Found accounts to sync', { count: accounts.length });

    // Enqueue sync jobs with staggered delays
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];

      try {
        await enqueuePlatformSync(
          {
            platformAccountId: account.id,
            userId: account.userId,
            isInitialSync: false,
          },
          {
            delay: i * STAGGER_DELAY_MS, // Stagger jobs
          }
        );
      } catch (error) {
        // Log but continue with other accounts
        logger.error('Failed to enqueue sync job', {
          accountId: account.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Platform syncs scheduled', { count: accounts.length });
  } catch (error) {
    logger.error('Failed to schedule platform syncs', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get scheduler status
 */
export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}

/**
 * Manually trigger sync for all platforms (for admin/testing)
 */
export async function triggerAllSyncs(): Promise<number> {
  await scheduleAllPlatformSyncs();

  const queue = getPlatformSyncQueue();
  return queue.getWaitingCount();
}
