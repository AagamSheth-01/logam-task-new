/**
 * Settings Store
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useSettingsStore = create(
  devtools(
    persist(
      (set, get) => ({
        settings: {},
        attendanceSettings: {},
        userPreferences: {},
        notificationSettings: {},
        organizationSettings: {},
        loading: false,
        error: null,

        setSettings: (settings) => set({ settings }),
        setAttendanceSettings: (attendanceSettings) => set({ attendanceSettings }),
        setUserPreferences: (userPreferences) => set({ userPreferences }),
        setNotificationSettings: (notificationSettings) => set({ notificationSettings }),
        setOrganizationSettings: (organizationSettings) => set({ organizationSettings }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),

        updateSettings: (updates) => set((state) => ({
          settings: { ...state.settings, ...updates }
        })),

        updateUserPreferences: (updates) => set((state) => ({
          userPreferences: { ...state.userPreferences, ...updates }
        })),

        updateNotificationSettings: (updates) => set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...updates }
        })),

        reset: () => set({
          settings: {},
          attendanceSettings: {},
          userPreferences: {},
          notificationSettings: {},
          organizationSettings: {},
          error: null
        })
      }),
      {
        name: 'settings-storage',
        partialize: (state) => ({
          userPreferences: state.userPreferences,
          notificationSettings: state.notificationSettings
        })
      }
    ),
    { name: 'Settings Store' }
  )
);

export default useSettingsStore;
