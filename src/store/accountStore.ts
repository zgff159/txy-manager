import { create } from 'zustand';

export interface AccountInfo {
  id: string;
  name: string;
  secretId: string;
  accountType: 'main' | 'sub';
  createdAt: number;
}

interface AccountState {
  accounts: AccountInfo[];
  currentAccountId: string | null;
  loading: boolean;
  setAccounts: (accounts: AccountInfo[]) => void;
  setCurrentAccount: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  loadAccounts: () => Promise<void>;
  addAccount: (name: string, secretId: string, secretKey: string, accountType?: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getCurrentAccount: () => AccountInfo | undefined;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  currentAccountId: null,
  loading: false,

  setAccounts: (accounts) => set({ accounts }),
  setCurrentAccount: (id) => {
    set({ currentAccountId: id });
    // Clear caches synchronously via IPC
    try { window.api.client.clearCache(); } catch {}
  },
  setLoading: (loading) => set({ loading }),

  loadAccounts: async () => {
    set({ loading: true });
    try {
      const accounts = await window.api.accounts.list();
      set({ accounts });
      if (accounts.length > 0 && !get().currentAccountId) {
        set({ currentAccountId: accounts[0].id });
      }
    } finally {
      set({ loading: false });
    }
  },

  addAccount: async (name, secretId, secretKey, accountType = 'main') => {
    await window.api.accounts.add(name, secretId, secretKey, accountType);
    await get().loadAccounts();
  },

  deleteAccount: async (id) => {
    await window.api.accounts.delete(id);
    const state = get();
    if (state.currentAccountId === id) {
      const remaining = state.accounts.filter((a) => a.id !== id);
      set({ currentAccountId: remaining.length > 0 ? remaining[0].id : null });
    }
    await get().loadAccounts();
  },

  getCurrentAccount: () => {
    const state = get();
    return state.accounts.find((a) => a.id === state.currentAccountId);
  },
}));
