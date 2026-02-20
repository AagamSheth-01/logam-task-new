/**
 * Attendance Dashboard Controller Hook
 * MVC Pattern - Controller Layer for Attendance Dashboard
 * Handles business logic and state management for attendance operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

const useAttendanceDashboard = (user) => {
  // Core state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Attendance data state
  const [todayRecord, setTodayRecord] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState(null);

  // Action states
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);

  // Helper function to convert time string to hours
  const timeStringToHours = useCallback((timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  }, []);

  // Helper function to format hours back to time string
  const hoursToTimeString = useCallback((hours) => {
    if (!hours || hours === 0) return '0:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  }, []);

  // Calculate monthly statistics
  const calculateMonthlyStats = useCallback((records) => {
    if (!records || records.length === 0) {
      setMonthlyStats({
        totalDays: 0,
        present: 0,
        absent: 0,
        halfDay: 0,
        office: 0,
        wfh: 0,
        totalHours: '0:00',
        averageHours: '0:00',
        attendanceRate: 0
      });
      return;
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === currentMonth &&
             recordDate.getFullYear() === currentYear;
    });

    const presentRecords = monthlyRecords.filter(r => r.status === 'present');
    const absentRecords = monthlyRecords.filter(r => r.status === 'absent');
    const halfDayRecords = monthlyRecords.filter(r => r.status === 'half-day');

    // Calculate total hours properly
    const totalHoursNum = monthlyRecords.reduce((total, record) => {
      if (record.totalHours) {
        return total + timeStringToHours(record.totalHours);
      }
      return total;
    }, 0);

    const stats = {
      totalDays: monthlyRecords.length,
      present: presentRecords.length,
      absent: absentRecords.length,
      halfDay: halfDayRecords.length,
      office: monthlyRecords.filter(r => r.workType === 'office' || r.workMode === 'office').length,
      wfh: monthlyRecords.filter(r => r.workType === 'wfh' || r.workMode === 'wfh').length,
      totalHours: hoursToTimeString(totalHoursNum),
      averageHours: presentRecords.length > 0 ? hoursToTimeString(totalHoursNum / presentRecords.length) : '0:00',
      attendanceRate: monthlyRecords.length > 0 ? ((presentRecords.length / monthlyRecords.length) * 100).toFixed(1) : 0
    };

    setMonthlyStats(stats);
  }, [timeStringToHours, hoursToTimeString]);

  // Find today's record from attendance records using India timezone
  const findTodayRecord = useCallback((records) => {
    if (!records || records.length === 0) return null;

    // Use India timezone to match backend date format
    const nowInIndia = new Date();
    const indiaOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
    const utc = nowInIndia.getTime() + (nowInIndia.getTimezoneOffset() * 60000);
    const indiaTime = new Date(utc + (indiaOffset * 60000));
    const todayIndia = indiaTime.toISOString().split('T')[0]; // YYYY-MM-DD format in India timezone

    console.log('Looking for today\'s record with date:', todayIndia);
    console.log('Available records:', records.map(r => ({ date: r.date, clockIn: r.clockIn, clockOut: r.clockOut })));

    const todayRecord = records.find(record => record.date === todayIndia) || null;

    if (todayRecord) {
      console.log('Found today\'s record:', todayRecord);
    } else {
      console.log('No record found for today');
    }

    return todayRecord;
  }, []);

  // Load attendance data
  const loadAttendanceData = useCallback(async (showLoading = true) => {
    if (!user?.tenantId) return;

    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Load attendance records via API
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attendance?tenantId=${user.tenantId}&user=${user.username}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }

      const data = await response.json();
      const records = data.data || [];

      setAttendanceRecords(records);

      // Find today's record
      const todaysRecord = findTodayRecord(records);
      setTodayRecord(todaysRecord);

      // Calculate monthly stats
      calculateMonthlyStats(records);

    } catch (err) {
      console.error('Failed to load attendance data:', err);
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.tenantId, user?.username, findTodayRecord, calculateMonthlyStats]);

  // Refresh data
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadAttendanceData(false);
  }, [loadAttendanceData]);

  // Clock in function
  const clockIn = useCallback(async (workType = 'office', notes = '') => {
    if (!user?.tenantId || clockInLoading) return false;

    try {
      setClockInLoading(true);
      setError(null);

      // Use India timezone for consistency
      const nowInIndia = new Date();
      // Convert to India timezone (UTC+5:30)
      const indiaOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
      const utc = nowInIndia.getTime() + (nowInIndia.getTimezoneOffset() * 60000);
      const indiaTime = new Date(utc + (indiaOffset * 60000));

      const clockInTime = `${indiaTime.getHours().toString().padStart(2, '0')}:${indiaTime.getMinutes().toString().padStart(2, '0')}`;
      const todayDate = indiaTime.toISOString().split('T')[0]; // YYYY-MM-DD format

      const attendanceData = {
        username: user.username,
        workMode: workType,
        workType: workType,
        clockIn: clockInTime,
        status: 'present',
        notes: notes || null,
        date: todayDate
      };

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attendance?tenantId=${user.tenantId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(attendanceData)
      });

      if (!response.ok) {
        throw new Error('Failed to mark attendance');
      }

      // Refresh data to get updated records - force reload
      console.log('Clock in successful, refreshing attendance data...');
      await loadAttendanceData(false);

      // Double-check by loading again after a short delay to ensure data consistency
      setTimeout(async () => {
        console.log('Double-checking attendance data...');
        await loadAttendanceData(false);
      }, 1000);

      return true;
    } catch (err) {
      console.error('Clock in failed:', err);
      setError(err.message || 'Failed to clock in');
      return false;
    } finally {
      setClockInLoading(false);
    }
  }, [user?.tenantId, user?.username, clockInLoading, loadAttendanceData]);

  // Clock out function
  const clockOut = useCallback(async () => {
    if (!user?.tenantId || !todayRecord?.clockIn || clockOutLoading) return false;

    try {
      setClockOutLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attendance/clock-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to clock out');
      }

      // Refresh data to get updated records - force reload
      console.log('Clock out successful, refreshing attendance data...');
      await loadAttendanceData(false);

      // Double-check by loading again after a short delay to ensure data consistency
      setTimeout(async () => {
        console.log('Double-checking attendance data after clock out...');
        await loadAttendanceData(false);
      }, 1000);

      return true;
    } catch (err) {
      console.error('Clock out failed:', err);
      setError(err.message || 'Failed to clock out');
      return false;
    } finally {
      setClockOutLoading(false);
    }
  }, [user?.tenantId, user?.username, todayRecord?.clockIn, clockOutLoading, loadAttendanceData]);

  // Export attendance data
  const exportAttendance = useCallback(async (format = 'json') => {
    if (!user?.tenantId) return null;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attendance/export?tenantId=${user.tenantId}&user=${user.username}&format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export attendance data');
      }

      const exportData = await response.json();
      return exportData;
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.message || 'Failed to export attendance data');
      return null;
    }
  }, [user?.tenantId, user?.username]);

  // Computed values for UI
  const canClockIn = useMemo(() => {
    return !todayRecord?.clockIn && !clockInLoading && !clockOutLoading;
  }, [todayRecord, clockInLoading, clockOutLoading]);

  const canClockOut = useMemo(() => {
    return todayRecord?.clockIn && !todayRecord?.clockOut && !clockInLoading && !clockOutLoading;
  }, [todayRecord, clockInLoading, clockOutLoading]);

  const workStatus = useMemo(() => {
    if (!todayRecord) return 'not_started';
    if (todayRecord.clockOut) return 'completed';
    if (todayRecord.clockIn) return 'in_progress';
    return 'not_started';
  }, [todayRecord]);

  const stats = useMemo(() => {
    if (!attendanceRecords) return null;

    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    return {
      total,
      present,
      absent,
      attendanceRate
    };
  }, [attendanceRecords]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load data on mount and user change
  useEffect(() => {
    if (user?.tenantId && user?.username) {
      console.log('Loading attendance data for user:', user.username);
      loadAttendanceData();
    }
  }, [user?.tenantId, user?.username, loadAttendanceData]);

  // Refresh data when user focuses back on the page/tab
  useEffect(() => {
    const handleFocus = () => {
      console.log('Page focused, refreshing attendance data...');
      if (user?.tenantId && user?.username) {
        loadAttendanceData(false);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user?.tenantId && user?.username) {
        console.log('Page visible again, refreshing attendance data...');
        loadAttendanceData(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.tenantId, user?.username, loadAttendanceData]);

  // Return controller interface
  return {
    // Data
    todayRecord,
    attendanceRecords,
    monthlyStats,
    stats,

    // Loading states
    loading,
    refreshing,
    clockInLoading,
    clockOutLoading,

    // Error state
    error,

    // Computed states
    canClockIn,
    canClockOut,
    workStatus,

    // Actions
    clockIn,
    clockOut,
    refresh,
    exportAttendance,
    clearError,

    // Utilities
    loadAttendanceData
  };
};

export default useAttendanceDashboard;