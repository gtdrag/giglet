import { create } from 'zustand';
import * as authService from '../services/auth';
import { isLoggedIn, logout as logoutService } from '../services/auth';

export interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuthenticated: (auth: boolean) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  checkAuthStatus: () => Promise<void>;
  register: (input: authService.RegisterInput) => Promise<void>;
  login: (input: authService.LoginInput) => Promise<void>;
  appleAuth: (input: authService.AppleAuthInput) => Promise<void>;
  googleAuth: (input: authService.GoogleAuthInput) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,

  setAuthenticated: (auth) => set({ isAuthenticated: auth }),

  setUser: (user) => set({ isAuthenticated: true, user, isLoading: false, error: null }),

  logout: async () => {
    await logoutService();
    set({ isAuthenticated: false, user: null, error: null });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  checkAuthStatus: async () => {
    try {
      const loggedIn = await isLoggedIn();
      set({ isAuthenticated: loggedIn, isLoading: false });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.register(input);
      set({
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof authService.AuthError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Registration failed. Please try again.' });
      throw error;
    }
  },

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.login(input);
      set({
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof authService.AuthError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Login failed. Please try again.' });
      throw error;
    }
  },

  appleAuth: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.appleAuth(input);
      set({
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof authService.AuthError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Apple Sign In failed. Please try again.' });
      throw error;
    }
  },

  googleAuth: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.googleAuth(input);
      set({
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof authService.AuthError) {
        set({ isLoading: false, error: error.message });
        throw error;
      }
      set({ isLoading: false, error: 'Google Sign In failed. Please try again.' });
      throw error;
    }
  },
}));
