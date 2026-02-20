/**
 * Performance Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const usePerformanceStore = create(
  devtools(
    (set, get) => ({
      metrics: null,
      userPerformance: null,
      teamPerformance: null,
      leaderboard: [],
      loading: false,
      error: null,
      filters: {
        startDate: null,
        endDate: null,
        userId: null,
        metricType: null
      },

      setMetrics: (metrics) => set({ metrics }),
      setUserPerformance: (userPerformance) => set({ userPerformance }),
      setTeamPerformance: (teamPerformance) => set({ teamPerformance }),
      setLeaderboard: (leaderboard) => set({ leaderboard }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

      reset: () => set({
        metrics: null,
        userPerformance: null,
        teamPerformance: null,
        leaderboard: [],
        error: null
      })
    }),
    { name: 'Performance Store' }
  )
);

export default usePerformanceStore;
