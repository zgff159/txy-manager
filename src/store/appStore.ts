import { create } from 'zustand';

export type PageKey = 'dashboard' | 'cvm' | 'lh' | 'domain' | 'traffic' | 'billing' | 'cos' | 'accounts';

interface AppState {
  currentPage: PageKey;
  sidebarCollapsed: boolean;
  selectedRegion: string;
  trafficRegionA: string;
  trafficRegionB: string;
  setCurrentPage: (page: PageKey) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedRegion: (region: string) => void;
  setTrafficRegionA: (region: string) => void;
  setTrafficRegionB: (region: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  selectedRegion: 'ap-guangzhou',
  trafficRegionA: 'ap-hongkong',
  trafficRegionB: 'na-siliconvalley',

  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setTrafficRegionA: (region) => set({ trafficRegionA: region }),
  setTrafficRegionB: (region) => set({ trafficRegionB: region }),
}));
