/**
 * Tasks Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useTasksStore = create(
  devtools(
    (set, get) => ({
      tasks: [],
      selectedTask: null,
      loading: false,
      error: null,
      filters: {
        status: null,
        assignedTo: null,
        priority: null,
        clientId: null
      },

      setTasks: (tasks) => set({ tasks }),
      setSelectedTask: (task) => set({ selectedTask: task }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

      addTask: (task) => set((state) => ({
        tasks: [task, ...state.tasks]
      })),

      updateTaskInList: (taskId, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      })),

      removeTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
      })),

      reset: () => set({
        tasks: [],
        selectedTask: null,
        error: null
      })
    }),
    { name: 'Tasks Store' }
  )
);

export default useTasksStore;
