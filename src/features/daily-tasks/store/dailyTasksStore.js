/**
 * Daily Tasks Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useDailyTasksStore = create(
  devtools(
    (set, get) => ({
      dailyTasks: [],
      selectedTask: null,
      loading: false,
      error: null,
      filters: {
        date: null,
        status: null,
        userId: null
      },

      setDailyTasks: (dailyTasks) => set({ dailyTasks }),
      setSelectedTask: (task) => set({ selectedTask: task }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

      addDailyTask: (task) => set((state) => ({
        dailyTasks: [task, ...state.dailyTasks]
      })),

      updateDailyTaskInList: (taskId, updates) => set((state) => ({
        dailyTasks: state.dailyTasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      })),

      removeDailyTask: (taskId) => set((state) => ({
        dailyTasks: state.dailyTasks.filter(t => t.id !== taskId)
      })),

      reset: () => set({
        dailyTasks: [],
        selectedTask: null,
        error: null
      })
    }),
    { name: 'Daily Tasks Store' }
  )
);

export default useDailyTasksStore;
