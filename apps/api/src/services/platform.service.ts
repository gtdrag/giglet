import { Platform, PlatformStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import { errors } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import type { ConnectPlatformInput } from '../schemas/platform.schema';

export interface PlatformAccountResponse {
  id: string;
  platform: Platform;
  status: PlatformStatus;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  createdAt: Date;
}

export interface PlatformCredentials {
  email: string;
  password: string;
}

class PlatformService {
  /**
   * Connect a platform account for a user
   * Encrypts credentials before storing
   */
  async connectPlatform(
    userId: string,
    input: ConnectPlatformInput
  ): Promise<PlatformAccountResponse> {
    const { platform, email, password } = input;

    // Check if already connected
    const existing = await prisma.platformAccount.findUnique({
      where: {
        userId_platform: { userId, platform },
      },
    });

    if (existing && existing.status !== 'DISCONNECTED') {
      throw errors.conflict(`${platform} account is already connected`);
    }

    // Encrypt credentials
    const credentials: PlatformCredentials = { email, password };
    const encryptedCreds = encrypt(JSON.stringify(credentials));

    // Create or update platform account
    const account = await prisma.platformAccount.upsert({
      where: {
        userId_platform: { userId, platform },
      },
      update: {
        encryptedCreds,
        status: 'CONNECTED',
        lastSyncError: null,
      },
      create: {
        userId,
        platform,
        encryptedCreds,
        status: 'CONNECTED',
      },
    });

    logger.info('Platform account connected', {
      userId,
      platform,
      accountId: account.id,
    });

    // TODO: Trigger initial sync job here
    // For now, just return the account

    return this.formatAccountResponse(account);
  }

  /**
   * Get all platform accounts for a user
   */
  async getUserPlatforms(userId: string): Promise<PlatformAccountResponse[]> {
    const accounts = await prisma.platformAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map(this.formatAccountResponse);
  }

  /**
   * Get a specific platform account
   */
  async getPlatformAccount(
    userId: string,
    platform: Platform
  ): Promise<PlatformAccountResponse | null> {
    const account = await prisma.platformAccount.findUnique({
      where: {
        userId_platform: { userId, platform },
      },
    });

    return account ? this.formatAccountResponse(account) : null;
  }

  /**
   * Disconnect a platform account
   * Keeps the record but marks as disconnected and clears credentials
   */
  async disconnectPlatform(
    userId: string,
    platform: Platform
  ): Promise<void> {
    const account = await prisma.platformAccount.findUnique({
      where: {
        userId_platform: { userId, platform },
      },
    });

    if (!account) {
      throw errors.notFound(`${platform} account not found`);
    }

    await prisma.platformAccount.update({
      where: { id: account.id },
      data: {
        status: 'DISCONNECTED',
        encryptedCreds: '', // Clear credentials
        lastSyncError: null,
      },
    });

    logger.info('Platform account disconnected', {
      userId,
      platform,
      accountId: account.id,
    });
  }

  /**
   * Get decrypted credentials for a platform (internal use only)
   */
  async getCredentials(
    userId: string,
    platform: Platform
  ): Promise<PlatformCredentials | null> {
    const account = await prisma.platformAccount.findUnique({
      where: {
        userId_platform: { userId, platform },
      },
    });

    if (!account || account.status === 'DISCONNECTED' || !account.encryptedCreds) {
      return null;
    }

    try {
      const decrypted = decrypt(account.encryptedCreds);
      return JSON.parse(decrypted) as PlatformCredentials;
    } catch (error) {
      logger.error('Failed to decrypt credentials', { userId, platform, error });
      return null;
    }
  }

  /**
   * Update sync status for a platform
   */
  async updateSyncStatus(
    accountId: string,
    status: PlatformStatus,
    error?: string
  ): Promise<void> {
    await prisma.platformAccount.update({
      where: { id: accountId },
      data: {
        status,
        lastSyncAt: status === 'CONNECTED' ? new Date() : undefined,
        lastSyncError: error || null,
      },
    });
  }

  private formatAccountResponse(account: {
    id: string;
    platform: Platform;
    status: PlatformStatus;
    lastSyncAt: Date | null;
    lastSyncError: string | null;
    createdAt: Date;
  }): PlatformAccountResponse {
    return {
      id: account.id,
      platform: account.platform,
      status: account.status,
      lastSyncAt: account.lastSyncAt,
      lastSyncError: account.lastSyncError,
      createdAt: account.createdAt,
    };
  }
}

export const platformService = new PlatformService();
