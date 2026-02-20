/**
 * Advanced Attendance Controller Hook
 * MVC Pattern implementation with all features from commit 73b7d93
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LocationService,
  OfflineService,
  WhatsAppService,
  AttendanceAPIService
} from '../lib/attendanceServices';
import {
  getIndiaDate,
  getIndiaLocaleDateString,
  getIndiaLocaleTimeString
} from '../lib/timezoneClient';

const useAdvancedAttendance = (userRole = 'user', currentUser) => {
  // Core state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false to prevent infinite loading
  const [loadingMore, setLoadingMore] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isOnline, setIsOnline] = useState(OfflineService.isOnline());

  // Alert state
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Pagination
  const [pagination, setPagination] = useState({
    hasMore: false,
    limit: 30,
    currentPage: 1
  });

  // Admin specific states
  const [allUsers, setAllUsers] = useState([]);
  const [allUsersData, setAllUsersData] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');

  // Date range - default to last 7 days
  const getDefaultDateRange = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    return {
      start: sevenDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorkType, setFilterWorkType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cache and refs
  const loadingRef = useRef(false);
  const cacheRef = useRef({});
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Helper functions
  const showAlert = useCallback((type, title, message) => {
    setAlertState({
      isOpen: true,
      type,
      title,
      message
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Load attendance data
  const loadAttendanceData = useCallback(async (isLoadMore = false) => {
    if (loadingRef.current) return;

    // Check if currentUser exists first (passed from parent)
    if (!currentUser?.username) {
      setError('No user data available');
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
      return;
    }

    const cacheKey = `${userRole}_${selectedUser}_${dateRange.start}_${dateRange.end}`;
    const cached = cacheRef.current[cacheKey];

    // Disable cache temporarily to ensure we get fresh data
    // if (cached && Date.now() - cached.timestamp < CACHE_DURATION && !isLoadMore) {
    //   setAttendanceRecords(cached.records);
    //   setTodayRecord(cached.todayRecord);
    //   setAllUsersData(cached.allUsersData || []);
    //   setLoading(false);
    //   setLoadingMore(false);
    //   return;
    // }

    try {
      loadingRef.current = true;
      if (isLoadMore) {
        setLoadingMore(true);
      }
      // Don't set loading here, it's already set in useEffect

      const filters = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        pageSize: pagination.limit
      };

      if (userRole === 'admin') {
        if (selectedUser && selectedUser !== 'all') {
          filters.user = selectedUser;
        } else {
          filters.all = true;
        }
      } else {
        filters.user = currentUser?.username;
      }

      if (isLoadMore) {
        filters.page = pagination.currentPage + 1;
      }

      const data = await AttendanceAPIService.loadAttendanceData(filters);
      console.log('API Response:', data);

      if (data.success) {
        const newRecords = data.records || [];

        if (isLoadMore) {
          setAttendanceRecords(prev => [...prev, ...newRecords]);
          setPagination(prev => ({
            ...prev,
            currentPage: prev.currentPage + 1,
            hasMore: data.pagination?.hasMore || false
          }));
        } else {
          setAttendanceRecords(newRecords);
          setTodayRecord(data.todayRecord || null);
          setAllUsersData(data.usersSummary || []);
          setPagination(prev => ({
            ...prev,
            currentPage: 1,
            hasMore: data.pagination?.hasMore || false
          }));

          // Cache the results
          cacheRef.current[cacheKey] = {
            records: newRecords,
            todayRecord: data.todayRecord,
            allUsersData: data.usersSummary || [],
            timestamp: Date.now()
          };
        }
      } else {
        throw new Error(data.message || 'Failed to load attendance data');
      }
    } catch (err) {
      console.error('Error loading attendance data:', err);
      console.error('Error details:', err.message, err.stack);

      // If it's a network error or auth error, try to handle it properly
      if (err.message.includes('Session expired') || err.message.includes('401')) {
        setError('Session expired - please refresh and login again');
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
        return;
      }

      // Show actual error instead of fallback demo data
      console.error('API failed, no fallback data available:', err.message);
      setError(`Failed to load attendance data: ${err.message}`);

      // Clear any existing data
      setTodayRecord(null);
      setAttendanceRecords([]);
      setAllUsersData([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [userRole, selectedUser, dateRange, pagination.limit, currentUser?.username, isOnline]);

  // Mark attendance
  const markAttendance = useCallback(async (workType = 'office', location = null) => {
    try {
      setLoading(true);
      setError('');

      let finalLocation = location;

      // Get location if not provided
      if (!finalLocation) {
        try {
          const position = await LocationService.getCurrentPosition();
          const address = await LocationService.getAddress(position.latitude, position.longitude);
          finalLocation = { ...position, address };
        } catch (locationError) {
          console.warn('Location failed:', locationError);
          finalLocation = { error: locationError.message };
        }
      }

      if (!isOnline) {
        // Save offline
        const offlineRecord = {
          workType,
          location: finalLocation,
          timestamp: Date.now(),
          date: getIndiaDate(),
          username: currentUser?.username
        };
        OfflineService.saveOfflineRecord(offlineRecord);
        setSuccessMessage('Attendance saved offline. Will sync when online.');
        return true;
      }

      const result = await AttendanceAPIService.markAttendance(workType, finalLocation);

      if (result.success) {
        setTodayRecord(result.record);
        setSuccessMessage('Attendance marked successfully!');

        // Send WhatsApp notification for WFH
        if (workType === 'wfh' && finalLocation && !finalLocation.error) {
          try {
            WhatsAppService.sendWhatsAppMessage(currentUser?.username, finalLocation);
          } catch (whatsappError) {
            console.warn('WhatsApp notification failed:', whatsappError);
          }
        }

        // Refresh data
        await loadAttendanceData();
        return true;
      } else {
        throw new Error(result.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error('Mark attendance error:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.username, isOnline, loadAttendanceData]);

  // Clock out
  const clockOut = useCallback(async () => {
    try {
      setClockOutLoading(true);
      setError('');

      if (!isOnline) {
        setError('Clock out requires internet connection');
        return false;
      }

      const result = await AttendanceAPIService.clockOut();

      if (result.success) {
        setTodayRecord(prev => ({
          ...prev,
          checkOut: result.checkOut,
          totalHours: result.totalHours
        }));
        setSuccessMessage('Clocked out successfully!');
        await loadAttendanceData();
        return true;
      } else {
        throw new Error(result.message || 'Failed to clock out');
      }
    } catch (err) {
      console.error('Clock out error:', err);
      setError(err.message);
      return false;
    } finally {
      setClockOutLoading(false);
    }
  }, [isOnline, loadAttendanceData]);

  // Update attendance record (admin only)
  const updateAttendanceRecord = useCallback(async (recordId, updates) => {
    if (userRole !== 'admin') return false;

    try {
      setError('');
      const result = await AttendanceAPIService.updateAttendanceRecord(recordId, updates);

      if (result.success) {
        setSuccessMessage('Record updated successfully!');
        await loadAttendanceData();
        return true;
      } else {
        throw new Error(result.message || 'Failed to update record');
      }
    } catch (err) {
      console.error('Update record error:', err);
      setError(err.message);
      return false;
    }
  }, [userRole, loadAttendanceData]);

  // Filter records
  const filteredRecords = useMemo(() => {
    let filtered = attendanceRecords;

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(record => record.status === filterStatus);
    }

    // Work type filter
    if (filterWorkType !== 'all') {
      filtered = filtered.filter(record => record.workType === filterWorkType);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        record.username?.toLowerCase().includes(term) ||
        record.date?.toLowerCase().includes(term) ||
        record.location?.address?.full_address?.toLowerCase().includes(term) ||
        record.location?.address?.city?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [attendanceRecords, filterStatus, filterWorkType, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const totalDays = filteredRecords.length;
    const presentDays = filteredRecords.filter(r => r.status === 'present').length;
    const absentDays = filteredRecords.filter(r => r.status === 'absent').length;
    const wfhDays = filteredRecords.filter(r => r.workType === 'wfh' && r.status === 'present').length;
    const officeDays = filteredRecords.filter(r => r.workType === 'office' && r.status === 'present').length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      wfhDays,
      officeDays,
      attendanceRate
    };
  }, [filteredRecords]);

  // Force refresh
  const forceRefresh = useCallback(() => {
    cacheRef.current = {};
    setAttendanceRecords([]);
    setTodayRecord(null);
    setAllUsersData([]);
    loadAttendanceData(false);
  }, [loadAttendanceData]);

  // Load more records
  const loadMore = useCallback(() => {
    if (!pagination.hasMore || loadingMore) return;
    loadAttendanceData(true);
  }, [pagination.hasMore, loadingMore, loadAttendanceData]);

  // Online/offline detection
  useEffect(() => {
    const handleOnlineStatus = () => {
      const online = OfflineService.isOnline();
      setIsOnline(online);

      if (online) {
        // Sync offline records when coming online
        const offlineRecords = OfflineService.getOfflineRecords();
        if (offlineRecords.length > 0) {
          showAlert('info', 'Syncing', 'Syncing offline attendance records...');
          // TODO: Implement sync logic
        }
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [showAlert]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    // Clear any existing cache on mount to prevent demo data from showing
    cacheRef.current = {};

    // Add delay to ensure user data is fully loaded
    const timeoutId = setTimeout(() => {
      if (currentUser?.username || userRole === 'admin') {
        // Always set loading when starting fresh
        setLoading(true);
        loadAttendanceData();
      } else {
        // Ensure loading is false if no user
        setLoading(false);
      }
    }, 100); // Small delay to ensure parent has passed user data

    return () => clearTimeout(timeoutId);
  }, [loadAttendanceData, currentUser?.username, userRole, selectedUser, dateRange.start, dateRange.end]);

  // Auto-clear messages
  useEffect(() => {
    if (error || successMessage) {
      const timeout = setTimeout(() => {
        setError('');
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, successMessage]);

  return {
    // Data
    attendanceRecords: filteredRecords,
    todayRecord,
    allUsersData,
    stats,

    // State
    loading,
    loadingMore,
    clockOutLoading,
    error,
    successMessage,
    isOnline,
    alertState,
    pagination,

    // Filters
    filterStatus,
    filterWorkType,
    searchTerm,
    selectedUser,
    dateRange,

    // Actions
    markAttendance,
    clockOut,
    updateAttendanceRecord,
    forceRefresh,
    loadMore,
    showAlert,
    closeAlert,

    // Setters
    setFilterStatus,
    setFilterWorkType,
    setSearchTerm,
    setSelectedUser,
    setDateRange,

    // Admin data
    allUsers,
    setAllUsers
  };
};

export default useAdvancedAttendance;