import { create } from 'zustand';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  setAuthenticated: (auth: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  login: (user) => set({ isAuthenticated: true, user, isLoading: false }),
  logout: () => set({ isAuthenticated: false, user: null }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
