/**
 * Duplicate Task Manager Hook
 * MVC Pattern implementation for duplicate task management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import httpClient from '../src/shared/api/httpClient';

const useDuplicateTaskManagerStore = create(
  persist(
    (set, get) => ({
      // State
      stats: null,
      loading: false,
      cleaning: false,
      message: { type: '', text: '' },
      lastUpdated: null,

      // Cache duration: 5 minutes
      CACHE_DURATION: 5 * 60 * 1000,

      // Actions
      setLoading: (loading) => set({ loading }),
      setCleaning: (cleaning) => set({ cleaning }),
      setMessage: (message) => set({ message }),
      clearMessage: () => set({ message: { type: '', text: '' } }),

      // Check if data is stale
      isDataStale: () => {
        const { lastUpdated, CACHE_DURATION } = get();
        if (!lastUpdated) return true;
        return Date.now() - lastUpdated > CACHE_DURATION;
      },

      // Load duplicate task statistics
      loadStats: async (force = false) => {
        const { stats, isDataStale, setLoading, setMessage } = get();

        // Return cached data if it's fresh and not forced
        if (!force && stats && !isDataStale()) {
          return stats;
        }

        setLoading(true);

        try {
          const response = await httpClient.get('/tasks/duplicates', { action: 'stats' });

          if (response.success) {
            set({
              stats: response.stats || {},
              loading: false,
              lastUpdated: Date.now(),
              message: { type: '', text: '' }
            });

            return response.stats || {};
          } else {
            throw new Error(response.message || 'Failed to load stats');
          }
        } catch (error) {
          console.error('Error loading duplicate stats:', error);
          const errorMessage = error.message === 'No authentication token found'
            ? 'Please login again to view duplicate task statistics'
            : error.message || 'Network error loading stats';

          setMessage({ type: 'error', text: errorMessage });
          set({ loading: false });
          throw error;
        }
      },

      // Clean up duplicate tasks
      cleanupDuplicates: async () => {
        const { setCleaning, setMessage, loadStats } = get();

        // Confirmation handled by UI component
        setCleaning(true);
        setMessage({ type: '', text: '' });

        try {
          const response = await httpClient.post('/tasks/duplicates', { action: 'cleanup' });

          if (response.success) {
            setMessage({ type: 'success', text: response.message });

            // Reload stats after cleanup
            await loadStats(true);

            return { success: true, message: response.message };
          } else {
            throw new Error(response.message || 'Failed to cleanup duplicates');
          }
        } catch (error) {
          console.error('Error cleaning up duplicates:', error);
          const errorMessage = error.message === 'No authentication token found'
            ? 'Please login again to perform cleanup'
            : error.message || 'Network error during cleanup';

          setMessage({ type: 'error', text: errorMessage });
          return { success: false, message: errorMessage };
        } finally {
          setCleaning(false);
        }
      },

      // Refresh stats (force reload)
      refreshStats: () => get().loadStats(true),

      // Get summary statistics
      getSummary: () => {
        const { stats } = get();

        if (!stats) {
          return {
            totalTasks: 0,
            uniqueTasks: 0,
            duplicateGroups: 0,
            totalDuplicates: 0,
            hasDuplicates: false
          };
        }

        return {
          totalTasks: stats.totalTasks || 0,
          uniqueTasks: stats.uniqueTasks || 0,
          duplicateGroups: stats.duplicateGroups || 0,
          totalDuplicates: stats.totalDuplicates || 0,
          hasDuplicates: (stats.totalDuplicates || 0) > 0,
          duplicateDetails: stats.duplicateDetails || []
        };
      },

      // Get status badge color
      getStatusBadgeColor: (status) => {
        switch (status) {
          case 'done':
            return 'bg-green-100 text-green-800';
          case 'pending':
            return 'bg-yellow-100 text-yellow-800';
          case 'in_progress':
            return 'bg-blue-100 text-blue-800';
          default:
            return 'bg-gray-100 text-gray-800';
        }
      },

      // Clear cache and state
      clearCache: () => set({
        stats: null,
        lastUpdated: null,
        message: { type: '', text: '' }
      })
    }),
    {
      name: 'duplicate-task-manager-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the stats data, not loading states or messages
      partialize: (state) => ({
        stats: state.stats,
        lastUpdated: state.lastUpdated
      })
    }
  )
);

export default useDuplicateTaskManagerStore;