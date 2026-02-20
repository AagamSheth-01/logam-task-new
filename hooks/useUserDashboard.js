/**
 * User Dashboard Hook
 * MVC Pattern implementation for user dashboard
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dashboardApi } from '../src/features/dashboard/api/dashboardApi';
import { getIndiaDate } from '../lib/timezoneClient';

const useUserDashboardStore = create(
  persist(
    (set, get) => ({
      // State
      dashboardData: null,
      attendanceData: null,
      tasksData: null,
      loading: false,
      error: null,
      lastUpdated: null,

      // Cache duration: 5 minutes
      CACHE_DURATION: 5 * 60 * 1000,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setDashboardData: (data) => set({
        dashboardData: data,
        lastUpdated: Date.now(),
        error: null
      }),

      // Check if data is stale
      isDataStale: () => {
        const { lastUpdated, CACHE_DURATION } = get();
        if (!lastUpdated) return true;
        return Date.now() - lastUpdated > CACHE_DURATION;
      },

      // Fetch user dashboard data
      fetchUserDashboard: async (force = false) => {
        const { dashboardData, isDataStale, setLoading, setError, setDashboardData } = get();

        // Return cached data if it's fresh and not forced
        if (!force && dashboardData && !isDataStale()) {
          return dashboardData;
        }

        setLoading(true);
        setError(null);

        try {
          // Get current date for attendance
          const today = getIndiaDate();
          const [year, month] = today.split('-');
          const startOfMonth = `${year}-${month}-01`;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

          // Fetch all user dashboard data in parallel
          const [
            attendanceData,
            tasksSummary,
            upcomingTasks,
            recentActivity
          ] = await Promise.all([
            // Dashboard-optimized attendance data
            fetch('/api/dashboard/attendance', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }).then(res => res.json()),

            // User's task summary
            dashboardApi.getSummary(),

            // Upcoming tasks
            dashboardApi.getUpcomingTasks(),

            // Recent activity
            dashboardApi.getRecentActivity()
          ]);

          // Process attendance data
          const attendanceStats = attendanceData.success ? attendanceData.data : {
            today: null,
            thisMonth: {
              present: 0,
              total: 0,
              rate: 0
            }
          };

          // Combine all data
          const combinedData = {
            attendance: attendanceStats,
            tasks: {
              summary: tasksSummary.success ? tasksSummary.data : {
                total: 0,
                completed: 0,
                pending: 0,
                overdue: 0
              },
              upcoming: upcomingTasks.success ? upcomingTasks.data : [],
              recentActivity: recentActivity.success ? recentActivity.data : []
            },
            lastUpdated: Date.now()
          };

          setDashboardData(combinedData);
          set({ loading: false });

          return combinedData;

        } catch (error) {
          console.error('Failed to fetch user dashboard data:', error);
          setError(error.message || 'Failed to load dashboard data');
          set({ loading: false });
          throw error;
        }
      },

      // Fetch user tasks
      fetchUserTasks: async (filters = {}) => {
        try {
          setLoading(true);
          setError(null);

          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              action: 'getUserTasks',
              filters
            })
          });

          const data = await response.json();

          if (data.success) {
            set({
              tasksData: data.tasks,
              loading: false,
              error: null
            });
            return data.tasks;
          } else {
            throw new Error(data.error || 'Failed to fetch tasks');
          }
        } catch (error) {
          console.error('Failed to fetch user tasks:', error);
          setError(error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Update attendance status
      updateAttendance: async (attendanceData) => {
        try {
          setLoading(true);
          setError(null);

          const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(attendanceData)
          });

          const result = await response.json();

          if (result.success) {
            // Refresh dashboard data after attendance update
            await get().fetchUserDashboard(true);

            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('attendanceUpdated'));

            set({ loading: false });
            return result;
          } else {
            throw new Error(result.error || 'Failed to update attendance');
          }
        } catch (error) {
          console.error('Failed to update attendance:', error);
          setError(error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Refresh all data
      refreshDashboard: async () => {
        return await get().fetchUserDashboard(true);
      },

      // Clear cache and state
      clearCache: () => {
        set({
          dashboardData: null,
          attendanceData: null,
          tasksData: null,
          lastUpdated: null,
          error: null
        });
      }
    }),
    {
      name: 'user-dashboard-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the data, not the loading states
      partialize: (state) => ({
        dashboardData: state.dashboardData,
        attendanceData: state.attendanceData,
        tasksData: state.tasksData,
        lastUpdated: state.lastUpdated
      })
    }
  )
);

export default useUserDashboardStore;