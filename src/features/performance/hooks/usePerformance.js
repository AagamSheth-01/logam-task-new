/**
 * usePerformance Hook
 */

import { useEffect, useCallback } from 'react';
import usePerformanceStore from '../store/performanceStore.js';
import performanceApi from '../api/performanceApi.js';

export function usePerformance(initialFilters = {}, options = {}) {
  const { autoLoad = true } = options;

  const {
    metrics,
    userPerformance,
    teamPerformance,
    leaderboard,
    loading,
    error,
    filters,
    setMetrics,
    setUserPerformance,
    setTeamPerformance,
    setLeaderboard,
    setLoading,
    setError,
    setFilters
  } = usePerformanceStore();

  const loadMetrics = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await performanceApi.getPerformanceMetrics(mergedFilters);

      if (response.success) {
        setMetrics(response.metrics || response.data);
      }
    } catch (err) {
      console.error('Error loading performance metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setMetrics, setLoading, setError]);

  const loadUserPerformance = useCallback(async (userId, customFilters = {}) => {
    try {
      const response = await performanceApi.getUserPerformance(userId, customFilters);

      if (response.success) {
        setUserPerformance(response.performance || response.data);
      }
    } catch (err) {
      console.error('Error loading user performance:', err);
      setError(err.message);
    }
  }, [setUserPerformance, setError]);

  const loadTeamPerformance = useCallback(async (customFilters = {}) => {
    try {
      const response = await performanceApi.getTeamPerformance(customFilters);

      if (response.success) {
        setTeamPerformance(response.performance || response.data);
      }
    } catch (err) {
      console.error('Error loading team performance:', err);
      setError(err.message);
    }
  }, [setTeamPerformance, setError]);

  const loadLeaderboard = useCallback(async (customFilters = {}) => {
    try {
      const response = await performanceApi.getLeaderboard(customFilters);

      if (response.success) {
        setLeaderboard(response.leaderboard || response.data || []);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err.message);
    }
  }, [setLeaderboard, setError]);

  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadMetrics(initialFilters);
    }
  }, [autoLoad]);

  return {
    metrics,
    userPerformance,
    teamPerformance,
    leaderboard,
    loading,
    error,
    filters,
    loadMetrics,
    loadUserPerformance,
    loadTeamPerformance,
    loadLeaderboard,
    setFilters
  };
}

export default usePerformance;
