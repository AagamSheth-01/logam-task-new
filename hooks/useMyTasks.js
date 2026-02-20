/**
 * My Tasks Hook
 * MVC Pattern implementation for user's personal tasks management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useMyTasksStore = create(
  persist(
    (set, get) => ({
      // State
      tasks: [],
      loading: false,
      error: null,
      lastUpdated: null,

      // Cache duration: 2 minutes for tasks (more frequent updates)
      CACHE_DURATION: 2 * 60 * 1000,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setTasks: (tasks) => set({
        tasks,
        lastUpdated: Date.now(),
        error: null
      }),

      // Check if data is stale
      isDataStale: () => {
        const { lastUpdated, CACHE_DURATION } = get();
        if (!lastUpdated) return true;
        return Date.now() - lastUpdated > CACHE_DURATION;
      },

      // Fetch user's tasks
      fetchMyTasks: async (force = false) => {
        const { tasks, isDataStale, setLoading, setError, setTasks } = get();

        // Return cached data if it's fresh and not forced
        if (!force && tasks.length > 0 && !isDataStale()) {
          return tasks;
        }

        setLoading(true);
        setError(null);

        try {
          const response = await fetch('/api/tasks', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          const data = await response.json();

          if (data.success) {
            setTasks(data.tasks || []);
            set({ loading: false });
            return data.tasks || [];
          } else {
            throw new Error(data.error || 'Failed to fetch tasks');
          }
        } catch (error) {
          console.error('Failed to fetch my tasks:', error);
          setError(error.message || 'Failed to load tasks');
          set({ loading: false });
          throw error;
        }
      },

      // Update a task
      updateTask: async (taskId, updates) => {
        const { tasks, setTasks, setLoading, setError } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updates)
          });

          const data = await response.json();

          if (data.success) {
            // Update task in local state
            const updatedTasks = tasks.map(task =>
              task.id === taskId ? { ...task, ...updates } : task
            );
            setTasks(updatedTasks);

            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('taskUpdated', {
              detail: { taskId, updates }
            }));

            set({ loading: false });
            return data.task;
          } else {
            throw new Error(data.error || 'Failed to update task');
          }
        } catch (error) {
          console.error('Failed to update task:', error);
          setError(error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Delete a task
      deleteTask: async (taskId) => {
        const { tasks, setTasks, setLoading, setError } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          const data = await response.json();

          if (data.success) {
            // Remove task from local state
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            setTasks(updatedTasks);

            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('taskDeleted', {
              detail: { taskId }
            }));

            set({ loading: false });
            return true;
          } else {
            throw new Error(data.error || 'Failed to delete task');
          }
        } catch (error) {
          console.error('Failed to delete task:', error);
          setError(error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Create a new task
      createTask: async (taskData) => {
        const { tasks, setTasks, setLoading, setError } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(taskData)
          });

          const data = await response.json();

          if (data.success) {
            // Add new task to local state
            const updatedTasks = [...tasks, data.task];
            setTasks(updatedTasks);

            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('taskCreated', {
              detail: { task: data.task }
            }));

            set({ loading: false });
            return data.task;
          } else {
            throw new Error(data.error || 'Failed to create task');
          }
        } catch (error) {
          console.error('Failed to create task:', error);
          setError(error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Export tasks
      exportTasks: async (format = 'csv') => {
        const { tasks, setLoading, setError } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch('/api/tasks/export', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              tasks: tasks,
              format: format
            })
          });

          if (response.ok) {
            // Create blob and download file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `my-tasks-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            set({ loading: false });
            return true;
          } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to export tasks');
          }
        } catch (error) {
          console.error('Failed to export tasks:', error);
          setError(error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Refresh tasks (force refetch)
      refreshTasks: async () => {
        return await get().fetchMyTasks(true);
      },

      // Clear cache and state
      clearCache: () => {
        set({
          tasks: [],
          lastUpdated: null,
          error: null
        });
      }
    }),
    {
      name: 'my-tasks-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the tasks and timestamp, not loading states
      partialize: (state) => ({
        tasks: state.tasks,
        lastUpdated: state.lastUpdated
      })
    }
  )
);

export default useMyTasksStore;