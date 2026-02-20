/**
 * Global Auth Store
 * Manages authentication state across the application
 * Uses Zustand with persistence to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,

      // Actions
      login: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
        // Clear other stores if needed
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }));
      },

      // Getters
      getUser: () => get().user,
      getToken: () => get().token,
      isAdmin: () => get().user?.role?.toLowerCase() === 'admin',
    }),
    {
      name: 'auth-storage', // localStorage key
      // Only persist specific fields
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
