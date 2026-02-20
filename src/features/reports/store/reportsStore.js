/**
 * Reports Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useReportsStore = create(
  devtools(
    (set, get) => ({
      reports: [],
      selectedReport: null,
      loading: false,
      error: null,
      generating: false,
      filters: {
        startDate: null,
        endDate: null,
        reportType: null,
        userId: null,
        clientId: null
      },

      setReports: (reports) => set({ reports }),
      setSelectedReport: (report) => set({ selectedReport: report }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setGenerating: (generating) => set({ generating }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

      addReport: (report) => set((state) => ({
        reports: [report, ...state.reports]
      })),

      removeReport: (reportId) => set((state) => ({
        reports: state.reports.filter(r => r.id !== reportId)
      })),

      reset: () => set({
        reports: [],
        selectedReport: null,
        error: null,
        generating: false
      })
    }),
    { name: 'Reports Store' }
  )
);

export default useReportsStore;
