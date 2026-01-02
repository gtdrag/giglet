import api from './api';

export type Platform = 'DOORDASH' | 'UBEREATS';
export type PlatformStatus = 'CONNECTED' | 'SYNCING' | 'SYNC_ERROR' | 'DISCONNECTED';

export interface PlatformAccount {
  id: string;
  platform: Platform;
  status: PlatformStatus;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
}

export interface ConnectPlatformInput {
  platform: Platform;
  email: string;
  password: string;
}

export class PlatformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlatformError';
  }
}

/**
 * Get all connected platforms for the user
 */
export async function getPlatforms(): Promise<PlatformAccount[]> {
  try {
    const response = await api.get('/platforms');
    return response.data.data.platforms;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to fetch platforms';
    throw new PlatformError(message);
  }
}

/**
 * Connect a platform with credentials
 */
export async function connectPlatform(input: ConnectPlatformInput): Promise<PlatformAccount> {
  try {
    const response = await api.post('/platforms/connect', input);
    return response.data.data;
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to connect platform';
    throw new PlatformError(message);
  }
}

/**
 * Disconnect a platform
 */
export async function disconnectPlatform(platform: Platform): Promise<void> {
  try {
    await api.post('/platforms/disconnect', { platform });
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || 'Failed to disconnect platform';
    throw new PlatformError(message);
  }
}
