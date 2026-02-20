/**
 * Recurring Tasks Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useRecurringTasksStore = create(
  devtools(
    (set, get) => ({
      recurringTasks: [],
      selectedTask: null,
      loading: false,
      error: null,
      filters: {
        status: null,
        frequency: null,
        clientId: null
      },

      setRecurringTasks: (recurringTasks) => set({ recurringTasks }),
      setSelectedTask: (task) => set({ selectedTask: task }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

      addRecurringTask: (task) => set((state) => ({
        recurringTasks: [task, ...state.recurringTasks]
      })),

      updateRecurringTaskInList: (taskId, updates) => set((state) => ({
        recurringTasks: state.recurringTasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      })),

      removeRecurringTask: (taskId) => set((state) => ({
        recurringTasks: state.recurringTasks.filter(t => t.id !== taskId)
      })),

      reset: () => set({
        recurringTasks: [],
        selectedTask: null,
        error: null
      })
    }),
    { name: 'Recurring Tasks Store' }
  )
);

export default useRecurringTasksStore;
