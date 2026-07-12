import { create } from 'zustand';
import type { AuthContext } from '@shared/types';
import { authService } from '@/services/api';

interface AuthStore extends AuthContext {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('authToken'),
  isAuthenticated: !!localStorage.getItem('authToken'),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await authService.login(email, password);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  checkAuth: () => {
    const token = authService.getToken();
    set({
      isAuthenticated: !!token,
      token,
    });
  },
}));
