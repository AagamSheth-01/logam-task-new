/**
 * Enhanced Attendance Controller Hook
 * MVC Pattern implementation for comprehensive attendance management
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  getIndiaDate,
  getIndiaLocaleTimeString,
  getIndiaDateTime
} from '../lib/timezoneClient';
import { robustLocationService } from '../lib/robustLocationService';

const useAttendance = (user) => {
  // Core state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Attendance data
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);

  // UI state
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'history', 'analytics'
  const [selectedMonth, setSelectedMonth] = useState(new Date(getIndiaDate()).getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date(getIndiaDate()).getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'present', 'absent', 'holiday'

  // Clock in/out state
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [workType, setWorkType] = useState('office');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Get current location with robust error handling
  const getCurrentLocation = useCallback(async (allowFallback = true) => {
    setLocationLoading(true);
    setLocationError('');

    try {
      const locationData = await robustLocationService.getCurrentPosition({
        allowFallback,
        timeout: 15000,
        enableHighAccuracy: true
      });

      // Validate location
      const validation = robustLocationService.validateLocation(locationData);

      if (validation.warnings.length > 0) {
        const warningMessage = validation.warnings.join(', ');
        setLocationError(`Warning: ${warningMessage}`);
        console.warn('Location warnings:', validation.warnings);
      }

      setLocation(locationData);
      return locationData;

    } catch (err) {
      const errorMessage = err.message || 'Unable to get your location';
      setLocationError(errorMessage);

      // Don't set global error for location issues if fallback is allowed
      if (!allowFallback) {
        setError(errorMessage);
      }

      console.error('Location error:', err);
      return null;
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Fetch attendance records
  const fetchAttendanceRecords = useCallback(async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Add user parameter to ensure we get the correct user's data
      const params = new URLSearchParams();
      if (user?.username) {
        params.append('user', user.username);
      }

      const response = await fetch(`/api/attendance?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }

      const data = await response.json();
      console.log('Attendance API response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch attendance data');
      }

      const records = data.records || [];
      setAttendanceRecords(records);

      // Find today's record (use YYYY-MM-DD format to match database)
      const today = getIndiaDate(); // This returns YYYY-MM-DD format
      const todaysRecord = records.find(record => record.date === today);
      setTodayRecord(todaysRecord || null);

      // Calculate monthly stats
      calculateMonthlyStats(records);

    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  // Helper function to convert time string to hours
  const timeStringToHours = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

  // Helper function to format hours back to time string
  const hoursToTimeString = (hours) => {
    if (!hours || hours === 0) return '0:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Calculate monthly statistics
  const calculateMonthlyStats = useCallback((records) => {
    const currentMonth = new Date(getIndiaDate()).getMonth();
    const currentYear = new Date(getIndiaDate()).getFullYear();

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
  }, []);

  // Mark attendance function with robust location handling
  const markAttendance = useCallback(async () => {
    if (!user?.tenantId) return false;

    setClockInLoading(true);
    setError(null);

    try {
      let locationData = null;
      let locationNote = '';

      // Always try to get location, but allow fallbacks
      try {
        locationData = await getCurrentLocation(true); // Allow fallback

        if (locationData) {
          // Get location description for user feedback
          const description = robustLocationService.getLocationDescription(locationData);
          if (locationData.isFallback) {
            locationNote = `Attendance marked with ${description}`;
          }
        }
      } catch (locationErr) {
        console.warn('Location service failed:', locationErr);
        // Continue with attendance without location
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const attendanceData = {
        workType,
        notes: locationNote || 'Attendance marked',
        location: locationData
      };

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(attendanceData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark attendance');
      }

      const result = await response.json();

      if (result.success) {
        // Update today's record immediately for instant UI update
        setTodayRecord(result.record);

        // Show success message with location info if applicable
        let successMessage = 'Attendance marked successfully!';
        if (locationNote) {
          successMessage += ` ${locationNote}`;
        }
        setSuccess(successMessage);

        // Refresh all records to update the dashboard and attendance tab
        await fetchAttendanceRecords();
        return true;
      } else {
        throw new Error(result.message || 'Failed to mark attendance');
      }

    } catch (err) {
      console.error('Mark attendance error:', err);
      setError(err.message);
      return false;
    } finally {
      setClockInLoading(false);
    }
  }, [user?.tenantId, workType, getCurrentLocation, fetchAttendanceRecords]);


  // Filter records based on search and filters
  const filteredRecords = useMemo(() => {
    let filtered = attendanceRecords;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.date.includes(query) ||
        record.status.toLowerCase().includes(query) ||
        record.workType?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(record => record.status === filterStatus);
    }

    // Month/year filter
    filtered = filtered.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === selectedMonth &&
             recordDate.getFullYear() === selectedYear;
    });

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attendanceRecords, searchQuery, filterStatus, selectedMonth, selectedYear]);

  // Check if user can mark attendance today
  const canMarkAttendance = useMemo(() => {
    return !todayRecord && !clockInLoading;
  }, [todayRecord, clockInLoading]);

  // Get today's attendance status
  const todayStatus = useMemo(() => {
    if (!todayRecord) return 'not_marked';
    if (todayRecord.status === 'present') return 'marked_present';
    if (todayRecord.status === 'absent') return 'absent';
    if (todayRecord.status === 'leave') return 'on_leave';
    return 'not_marked';
  }, [todayRecord]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Update filters
  const updateSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const updateFilter = useCallback((status) => {
    setFilterStatus(status);
  }, []);

  const updateMonth = useCallback((month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  const updateViewMode = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  const updateWorkType = useCallback((type) => {
    setWorkType(type);
  }, []);

  // Initialize data
  useEffect(() => {
    if (user?.username) {
      fetchAttendanceRecords();
    }
  }, [user?.username, fetchAttendanceRecords]);

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const timeout = setTimeout(clearMessages, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, success, clearMessages]);

  return {
    // Data
    attendanceRecords: filteredRecords,
    todayRecord,
    monthlyStats,
    location,

    // State
    loading,
    submitting,
    error,
    success,

    // UI State
    viewMode,
    selectedMonth,
    selectedYear,
    searchQuery,
    filterStatus,

    // Attendance state
    clockInLoading,
    workType,
    locationLoading,
    locationError,

    // Status
    canMarkAttendance,
    todayStatus,

    // Actions
    markAttendance,
    fetchAttendanceRecords,
    getCurrentLocation,
    clearMessages,

    // Filters
    updateSearch,
    updateFilter,
    updateMonth,
    updateViewMode,
    updateWorkType
  };
};

export default useAttendance;
