import { create } from 'zustand';
import { auth } from '@/lib/api';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  setUser: (user: any) => void;
  fetchProfile: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  fetchProfile: async () => {
    // If user is already loaded, don't fetch again
    if (get().user) return;
    
    set({ isLoading: true });
    try {
      const res = await auth.getProfile();
      if (res.success) {
        set({ user: res.data });
      } else {
        set({ user: null });
      }
    } catch (error) {
      console.error("Auth store fetch error:", error);
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },
  logout: () => {
    auth.logout();
    set({ user: null });
  }
}));
