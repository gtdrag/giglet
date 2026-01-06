import { create } from 'zustand';

export type TabPage = 'map' | 'dashboard' | 'mileage';

interface TabNavigationState {
  currentPage: TabPage;
  setCurrentPage: (page: TabPage) => void;
}

export const useTabNavigationStore = create<TabNavigationState>((set) => ({
  currentPage: 'map',
  setCurrentPage: (page) => set({ currentPage: page }),
}));
