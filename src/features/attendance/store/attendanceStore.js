/**
 * Attendance Store
 * Manages attendance state using Zustand
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useAttendanceStore = create(
  devtools(
    (set, get) => ({
      // State
      todayRecord: null,
      attendanceStats: {
        thisMonth: { present: 0, total: 0, rate: 0 }
      },
      loading: false,
      error: null,

      // Cache management
      lastFetch: null,
      cacheExpiry: 30 * 1000, // 30 seconds

      // Actions
      setTodayRecord: (record) => set({ todayRecord: record }),

      setAttendanceStats: (stats) => set({ attendanceStats: stats }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      reset: () => set({
        todayRecord: null,
        attendanceStats: { thisMonth: { present: 0, total: 0, rate: 0 } },
        error: null,
        lastFetch: null
      }),

      // Update both today record and stats
      setAttendanceData: (todayRecord, stats) => set({
        todayRecord,
        attendanceStats: stats,
        lastFetch: Date.now(),
        error: null
      }),

      // Check if cache is valid
      isCacheValid: () => {
        const { lastFetch, cacheExpiry } = get();
        if (!lastFetch) return false;
        return Date.now() - lastFetch < cacheExpiry;
      },

      // Invalidate cache
      invalidateCache: () => set({ lastFetch: null })
    }),
    { name: 'Attendance Store' } // DevTools name
  )
);

export default useAttendanceStore;
