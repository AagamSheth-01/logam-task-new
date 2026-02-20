/**
 * useAttendance Hook
 * Custom hook for attendance data fetching and management
 * Combines Zustand store with API calls
 */

import { useEffect, useCallback } from 'react';
import useAttendanceStore from '../store/attendanceStore.js';
import attendanceApi from '../api/attendanceApi.js';

/**
 * Hook for fetching and managing user attendance data
 * @param {string} username - Username to fetch attendance for
 * @param {Object} options - Hook options
 * @returns {Object} Attendance data and methods
 */
export function useAttendance(username, options = {}) {
  const {
    autoLoad = true,
    skipCache = false
  } = options;

  // Get state and actions from store
  const {
    todayRecord,
    attendanceStats,
    loading,
    error,
    setLoading,
    setError,
    setAttendanceData,
    isCacheValid,
    invalidateCache
  } = useAttendanceStore();

  /**
   * Load attendance data
   */
  const loadAttendance = useCallback(async (forceRefresh = false) => {
    if (!username) {
      setLoading(false);
      return;
    }

    try {
      // Check cache first (unless force refresh or skip cache)
      if (!forceRefresh && !skipCache && isCacheValid()) {
        console.log('Using cached attendance data');
        return;
      }

      setLoading(true);
      setError(null);

      // Calculate date range for current month
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const startOfMonth = `${year}-${month}-01`;
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      // Fetch both today's record and month's stats in parallel
      const [todayData, monthData] = await Promise.all([
        attendanceApi.getTodayAttendance(username),
        attendanceApi.getAttendanceRange(username, startOfMonth, endOfMonth)
      ]);

      let newTodayRecord = null;
      let newStats = { thisMonth: { present: 0, total: 0, rate: 0 } };

      // Process today's data
      if (todayData?.success) {
        newTodayRecord = todayData.todayRecord;
      }

      // Process month's data
      if (monthData?.success && monthData.stats) {
        newStats = {
          thisMonth: {
            present: monthData.stats.presentDays || 0,
            total: monthData.stats.totalDays || 0,
            rate: Math.round(monthData.stats.attendanceRate || 0)
          }
        };
      }

      // Update store
      setAttendanceData(newTodayRecord, newStats);

    } catch (err) {
      console.error('Error loading attendance:', err);
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [username, skipCache, isCacheValid, setLoading, setError, setAttendanceData]);

  /**
   * Mark attendance (clock in)
   */
  const markAttendance = useCallback(async (data) => {
    try {
      setLoading(true);
      const result = await attendanceApi.markAttendance(data);

      // Invalidate cache and reload
      invalidateCache();
      await loadAttendance(true);

      // Dispatch event for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('attendanceUpdated'));
      }

      return result;
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadAttendance, invalidateCache, setLoading, setError]);

  /**
   * Clock out
   */
  const clockOut = useCallback(async (attendanceId, data) => {
    try {
      setLoading(true);
      const result = await attendanceApi.clockOut(attendanceId, data);

      // Invalidate cache and reload
      invalidateCache();
      await loadAttendance(true);

      // Dispatch event for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('attendanceUpdated'));
      }

      return result;
    } catch (err) {
      console.error('Error clocking out:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadAttendance, invalidateCache, setLoading, setError]);

  /**
   * Refresh attendance data
   */
  const refresh = useCallback(() => {
    invalidateCache();
    return loadAttendance(true);
  }, [loadAttendance, invalidateCache]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && username) {
      loadAttendance();
    }
  }, [username, autoLoad]); // Only run when username or autoLoad changes

  // Listen for attendance updates from other components
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = () => {
      invalidateCache();
      loadAttendance(true);
    };

    window.addEventListener('attendanceUpdated', handleUpdate);
    return () => window.removeEventListener('attendanceUpdated', handleUpdate);
  }, [loadAttendance, invalidateCache]);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (!document.hidden && !isCacheValid()) {
        loadAttendance(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadAttendance, isCacheValid]);

  return {
    // Data
    todayRecord,
    attendanceStats,
    loading,
    error,

    // Methods
    markAttendance,
    clockOut,
    refresh,
    loadAttendance
  };
}

export default useAttendance;
