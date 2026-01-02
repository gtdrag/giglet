import { create } from 'zustand';
import * as platformService from '../services/platforms';
import type { Platform, PlatformAccount, ConnectPlatformInput } from '../services/platforms';

interface PlatformState {
  platforms: PlatformAccount[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPlatforms: () => Promise<void>;
  connectPlatform: (input: ConnectPlatformInput) => Promise<void>;
  disconnectPlatform: (platform: Platform) => Promise<void>;
  clearError: () => void;
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  platforms: [],
  isLoading: false,
  error: null,

  fetchPlatforms: async () => {
    set({ isLoading: true, error: null });
    try {
      const platforms = await platformService.getPlatforms();
      set({ platforms, isLoading: false });
    } catch (error) {
      if (error instanceof platformService.PlatformError) {
        set({ isLoading: false, error: error.message });
      } else {
        set({ isLoading: false, error: 'Failed to load platforms' });
      }
    }
  },

  connectPlatform: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const account = await platformService.connectPlatform(input);
      // Add or update the platform in the list
      const currentPlatforms = get().platforms;
      const existingIndex = currentPlatforms.findIndex((p) => p.platform === input.platform);
      if (existingIndex >= 0) {
        const updated = [...currentPlatforms];
        updated[existingIndex] = account;
        set({ platforms: updated, isLoading: false });
      } else {
        set({ platforms: [...currentPlatforms, account], isLoading: false });
      }
    } catch (error) {
      if (error instanceof platformService.PlatformError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Failed to connect platform' });
      throw error;
    }
  },

  disconnectPlatform: async (platform) => {
    set({ isLoading: true, error: null });
    try {
      await platformService.disconnectPlatform(platform);
      // Update the platform status in the list
      const currentPlatforms = get().platforms;
      const updated = currentPlatforms.map((p) =>
        p.platform === platform ? { ...p, status: 'DISCONNECTED' as const } : p
      );
      set({ platforms: updated, isLoading: false });
    } catch (error) {
      if (error instanceof platformService.PlatformError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Failed to disconnect platform' });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
