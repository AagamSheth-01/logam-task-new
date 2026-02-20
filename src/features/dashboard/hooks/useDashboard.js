/**
 * useDashboard Hook
 */

import { useEffect, useCallback } from 'react';
import useDashboardStore from '../store/dashboardStore.js';
import dashboardApi from '../api/dashboardApi.js';

export function useDashboard(options = {}) {
  const { autoLoad = true } = options;

  const {
    summary,
    stats,
    recentActivity,
    upcomingTasks,
    loading,
    error,
    dateRange,
    setSummary,
    setStats,
    setRecentActivity,
    setUpcomingTasks,
    setLoading,
    setError,
    setDateRange
  } = useDashboardStore();

  const loadSummary = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardApi.getSummary(params);

      if (response.success && response.data) {
        // API returns { data: { summary, performance } }
        setSummary(response.data.summary || response.data);
        // Also set performance/stats if available
        if (response.data.performance) {
          setStats(response.data.performance);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard summary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setSummary, setStats, setLoading, setError]);

  const loadStats = useCallback(async (params = {}) => {
    try {
      const response = await dashboardApi.getStats(params);

      if (response.success) {
        setStats(response.stats || response.data);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message);
    }
  }, [setStats, setError]);

  const loadRecentActivity = useCallback(async (params = {}) => {
    try {
      const response = await dashboardApi.getRecentActivity(params);

      if (response.success) {
        setRecentActivity(response.activity || response.data || []);
      }
    } catch (err) {
      console.error('Error loading recent activity:', err);
      setError(err.message);
    }
  }, [setRecentActivity, setError]);

  const loadUpcomingTasks = useCallback(async (params = {}) => {
    try {
      const response = await dashboardApi.getUpcomingTasks(params);

      if (response.success) {
        setUpcomingTasks(response.tasks || response.data || []);
      }
    } catch (err) {
      console.error('Error loading upcoming tasks:', err);
      setError(err.message);
    }
  }, [setUpcomingTasks, setError]);

  const loadAllDashboardData = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadSummary(params),
        loadStats(params),
        loadRecentActivity(params),
        loadUpcomingTasks(params)
      ]);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadSummary, loadStats, loadRecentActivity, loadUpcomingTasks, setLoading, setError]);

  useEffect(() => {
    if (autoLoad) {
      loadAllDashboardData();
    }
  }, [autoLoad]);

  return {
    summary,
    stats,
    recentActivity,
    upcomingTasks,
    loading,
    error,
    dateRange,
    loadSummary,
    loadStats,
    loadRecentActivity,
    loadUpcomingTasks,
    loadAllDashboardData,
    setDateRange
  };
}

export default useDashboard;
