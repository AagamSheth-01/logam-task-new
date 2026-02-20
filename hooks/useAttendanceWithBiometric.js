/**
 * Enhanced Attendance Controller Hook with Biometric Integration
 * MVC Pattern implementation with biometric authentication support
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  getIndiaDate,
  getIndiaLocaleTimeString,
  getIndiaDateTime
} from '../lib/timezoneClient';
import biometricService from '../lib/biometricService';
import { robustLocationService } from '../lib/robustLocationService';

const useAttendanceWithBiometric = (user) => {
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
  const [viewMode, setViewMode] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(new Date(getIndiaDate()).getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date(getIndiaDate()).getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Clock in/out state
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [workType, setWorkType] = useState('office');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Biometric state
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricEnrollment, setShowBiometricEnrollment] = useState(false);
  const [biometricCapabilities, setBiometricCapabilities] = useState(null);
  const [quickAuthMode, setQuickAuthMode] = useState(false); // For biometric quick actions

  // Initialize biometric capabilities
  useEffect(() => {
    checkBiometricCapabilities();
  }, [user?.username]);

  const checkBiometricCapabilities = async () => {
    if (!user?.username) return;

    try {
      const capabilities = await biometricService.getBiometricCapabilities();
      setBiometricCapabilities(capabilities);
      setBiometricSupported(capabilities.supported);

      if (capabilities.supported) {
        const isEnrolled = biometricService.isEnrolled(user.username);
        setBiometricEnrolled(isEnrolled);
      }
    } catch (error) {
      console.warn('Failed to check biometric capabilities:', error);
      setBiometricSupported(false);
    }
  };

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
      const token = localStorage.getItem('token');

      const response = await fetch('/api/attendance', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }

      const data = await response.json();
      const records = data.data || data.attendance || [];

      setAttendanceRecords(records);

      const today = getIndiaDate();
      const todaysRecord = records.find(record => record.date === today);
      setTodayRecord(todaysRecord || null);

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

  // Regular clock in function
  const clockIn = useCallback(async () => {
    if (!user?.tenantId) return false;

    setClockInLoading(true);
    setError(null);

    try {
      let locationData = null;
      if (workType === 'office') {
        locationData = await getCurrentLocation();
        if (!locationData && !locationError) {
          throw new Error('Location is required for office check-in');
        }
      }

      const token = localStorage.getItem('token');
      const now = getIndiaDateTime();

      const clockInData = {
        action: 'clock_in',
        workType,
        timestamp: now.toISOString(),
        date: getIndiaDate(),
        time: getIndiaLocaleTimeString(),
        timezone: 'Asia/Kolkata',
        ...(locationData && { location: locationData })
      };

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clockInData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clock in');
      }

      const result = await response.json();
      setTodayRecord(result.data);
      setSuccess('Successfully clocked in!');

      await fetchAttendanceRecords();
      return true;

    } catch (err) {
      console.error('Clock in error:', err);
      setError(err.message);
      return false;
    } finally {
      setClockInLoading(false);
    }
  }, [user?.tenantId, workType, getCurrentLocation, locationError, fetchAttendanceRecords]);

  // Regular clock out function
  const clockOut = useCallback(async () => {
    if (!user?.tenantId || !todayRecord?.clockIn) return false;

    setClockOutLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const now = getIndiaDateTime();

      const clockOutData = {
        action: 'clock_out',
        timestamp: now.toISOString(),
        time: getIndiaLocaleTimeString(),
        timezone: 'Asia/Kolkata'
      };

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clockOutData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clock out');
      }

      const result = await response.json();
      setTodayRecord(result.data);
      setSuccess('Successfully clocked out!');

      await fetchAttendanceRecords();
      return true;

    } catch (err) {
      console.error('Clock out error:', err);
      setError(err.message);
      return false;
    } finally {
      setClockOutLoading(false);
    }
  }, [user?.tenantId, todayRecord, fetchAttendanceRecords]);

  // BIOMETRIC CLOCK IN - New feature!
  const biometricClockIn = useCallback(async () => {
    if (!user?.tenantId || !biometricEnrolled) return false;

    setBiometricLoading(true);
    setError(null);

    try {
      // First, authenticate with biometrics
      const biometricResult = await biometricService.quickClockIn(user.username, workType);

      if (!biometricResult.success) {
        throw new Error('Biometric authentication failed');
      }

      // Get location if office work (same as regular clock in)
      let locationData = null;
      if (workType === 'office') {
        locationData = await getCurrentLocation();
        if (!locationData && !locationError) {
          throw new Error('Location is required for office check-in');
        }
      }

      const token = localStorage.getItem('token');
      const now = getIndiaDateTime();

      const clockInData = {
        action: 'clock_in',
        workType,
        timestamp: now.toISOString(),
        date: getIndiaDate(),
        time: getIndiaLocaleTimeString(),
        timezone: 'Asia/Kolkata',
        biometricAuth: true,
        biometricType: biometricResult.biometricType,
        authTimestamp: biometricResult.authTimestamp,
        ...(locationData && { location: locationData })
      };

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clockInData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clock in');
      }

      const result = await response.json();
      setTodayRecord(result.data);
      setSuccess(`Successfully clocked in with ${biometricService.getBiometricDisplayName(biometricResult.biometricType)}!`);

      await fetchAttendanceRecords();
      return true;

    } catch (err) {
      console.error('Biometric clock in error:', err);
      setError(err.message);
      return false;
    } finally {
      setBiometricLoading(false);
    }
  }, [user?.tenantId, user?.username, biometricEnrolled, workType, getCurrentLocation, locationError, fetchAttendanceRecords]);

  // BIOMETRIC CLOCK OUT - New feature!
  const biometricClockOut = useCallback(async () => {
    if (!user?.tenantId || !todayRecord?.clockIn || !biometricEnrolled) return false;

    setBiometricLoading(true);
    setError(null);

    try {
      // First, authenticate with biometrics
      const biometricResult = await biometricService.quickClockOut(user.username);

      if (!biometricResult.success) {
        throw new Error('Biometric authentication failed');
      }

      const token = localStorage.getItem('token');
      const now = getIndiaDateTime();

      const clockOutData = {
        action: 'clock_out',
        timestamp: now.toISOString(),
        time: getIndiaLocaleTimeString(),
        timezone: 'Asia/Kolkata',
        biometricAuth: true,
        biometricType: biometricResult.biometricType,
        authTimestamp: biometricResult.authTimestamp
      };

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clockOutData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clock out');
      }

      const result = await response.json();
      setTodayRecord(result.data);
      setSuccess(`Successfully clocked out with ${biometricService.getBiometricDisplayName(biometricResult.biometricType)}!`);

      await fetchAttendanceRecords();
      return true;

    } catch (err) {
      console.error('Biometric clock out error:', err);
      setError(err.message);
      return false;
    } finally {
      setBiometricLoading(false);
    }
  }, [user?.tenantId, user?.username, todayRecord, biometricEnrolled, fetchAttendanceRecords]);

  // Enrollment handlers
  const handleBiometricEnrollment = useCallback(async () => {
    setShowBiometricEnrollment(true);
  }, []);

  const handleEnrollmentSuccess = useCallback((result) => {
    setBiometricEnrolled(true);
    setShowBiometricEnrollment(false);
    setSuccess(`Biometric enrollment successful! You can now use ${biometricService.getBiometricDisplayName(result.biometricType)} for quick attendance.`);
  }, []);

  // Filter records based on search and filters
  const filteredRecords = useMemo(() => {
    let filtered = attendanceRecords;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.date.includes(query) ||
        record.status.toLowerCase().includes(query) ||
        record.workType?.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(record => record.status === filterStatus);
    }

    filtered = filtered.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === selectedMonth &&
             recordDate.getFullYear() === selectedYear;
    });

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attendanceRecords, searchQuery, filterStatus, selectedMonth, selectedYear]);

  // Check if user can clock in today
  const canClockIn = useMemo(() => {
    return !todayRecord?.clockIn && !clockInLoading && !biometricLoading;
  }, [todayRecord, clockInLoading, biometricLoading]);

  // Check if user can clock out today
  const canClockOut = useMemo(() => {
    return todayRecord?.clockIn && !todayRecord?.clockOut && !clockOutLoading && !biometricLoading;
  }, [todayRecord, clockOutLoading, biometricLoading]);

  // Get today's work status
  const todayStatus = useMemo(() => {
    if (!todayRecord) return 'not_started';
    if (todayRecord.clockOut) return 'completed';
    if (todayRecord.clockIn) return 'in_progress';
    return 'not_started';
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

    // Clock state
    clockInLoading,
    clockOutLoading,
    workType,
    locationLoading,
    locationError,

    // Status
    canClockIn,
    canClockOut,
    todayStatus,

    // Regular actions
    clockIn,
    clockOut,
    fetchAttendanceRecords,
    getCurrentLocation,
    clearMessages,

    // Biometric features - NEW!
    biometricSupported,
    biometricEnrolled,
    biometricLoading,
    biometricCapabilities,
    showBiometricEnrollment,
    quickAuthMode,
    biometricClockIn,
    biometricClockOut,
    handleBiometricEnrollment,
    handleEnrollmentSuccess,
    setShowBiometricEnrollment,
    setQuickAuthMode,

    // Filters
    updateSearch,
    updateFilter,
    updateMonth,
    updateViewMode,
    updateWorkType
  };
};

export default useAttendanceWithBiometric;