/**
 * Dashboard Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useDashboardStore = create(
  devtools(
    (set, get) => ({
      summary: null,
      stats: null,
      recentActivity: [],
      upcomingTasks: [],
      loading: false,
      error: null,
      dateRange: {
        startDate: null,
        endDate: null
      },

      setSummary: (summary) => set({ summary }),
      setStats: (stats) => set({ stats }),
      setRecentActivity: (recentActivity) => set({ recentActivity }),
      setUpcomingTasks: (upcomingTasks) => set({ upcomingTasks }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setDateRange: (dateRange) => set({ dateRange: { ...get().dateRange, ...dateRange } }),

      reset: () => set({
        summary: null,
        stats: null,
        recentActivity: [],
        upcomingTasks: [],
        error: null
      })
    }),
    { name: 'Dashboard Store' }
  )
);

export default useDashboardStore;
