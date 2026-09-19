import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  loginWithOTP: (phone: string, code: string, idToken: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (phone: string, nickname: string, password?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (phone, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.passwordLogin(phone, password);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Login failed',
          });
          throw err;
        }
      },

      loginWithOTP: async (phone, code, idToken) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.verifyOtp(phone, code, idToken);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Verification failed',
          });
          throw err;
        }
      },

      loginWithGoogle: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.googleLogin(idToken);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Google login failed',
          });
          throw err;
        }
      },

      register: async (phone, nickname, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.register(phone, nickname, password);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Registration failed',
          });
          throw err;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
