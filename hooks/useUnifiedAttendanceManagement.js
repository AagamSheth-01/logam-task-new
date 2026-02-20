/**
 * Unified Attendance Management Hook
 * MVC Pattern implementation for comprehensive attendance management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import httpClient from '../src/shared/api/httpClient';

const useUnifiedAttendanceManagementStore = create(
  persist(
    (set, get) => ({
      // State
      selectedView: 'monthly', // 'monthly', 'daily', 'calendar'
      selectedMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
      selectedDate: new Date().toISOString().split('T')[0],
      users: [],
      monthlyData: [],
      dailyData: [],
      loading: false,
      error: null,
      success: null,
      searchTerm: '',
      filterStatus: 'all',
      lastUpdated: null,

      // Edit states
      editingRecord: null,
      showEditModal: false,

      // Cache duration: 5 minutes for attendance data
      CACHE_DURATION: 5 * 60 * 1000,

      // Actions
      setSelectedView: (view) => set({ selectedView: view }),
      setSelectedMonth: (month) => {
        set({ selectedMonth: month });
        get().loadMonthlyData(true);
      },
      setSelectedDate: (date) => {
        set({ selectedDate: date });
        get().loadDailyData(true);
      },
      setSearchTerm: (term) => set({ searchTerm: term }),
      setFilterStatus: (status) => set({ filterStatus: status }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, success: null }),
      setSuccess: (success) => set({ success, error: null }),
      clearMessages: () => set({ error: null, success: null }),

      // Edit modal management
      setEditingRecord: (record) => set({ editingRecord: record, showEditModal: !!record }),
      closeEditModal: () => set({ editingRecord: null, showEditModal: false }),

      // Check if data is stale
      isDataStale: () => {
        const { lastUpdated, CACHE_DURATION } = get();
        if (!lastUpdated) return true;
        return Date.now() - lastUpdated > CACHE_DURATION;
      },

      // Load users
      loadUsers: async (force = false) => {
        const { users, isDataStale, setError } = get();

        if (!force && users.length > 0 && !isDataStale()) {
          return users;
        }

        try {
          const response = await httpClient.get('/users');

          if (response.success) {
            const usersList = response.users || [];
            set({
              users: usersList,
              lastUpdated: Date.now()
            });
            return usersList;
          } else {
            throw new Error(response.message || 'Failed to load users');
          }
        } catch (error) {
          setError('Failed to load users: ' + error.message);
          throw error;
        }
      },

      // Load monthly attendance data
      loadMonthlyData: async (force = false) => {
        const { selectedMonth, isDataStale, setLoading, setError } = get();

        if (!force && !isDataStale()) {
          return get().monthlyData;
        }

        setLoading(true);

        try {
          const [year, month] = selectedMonth.split('-');
          const startDate = `${year}-${month}-01`;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

          const response = await httpClient.get('/attendance', {
            startDate,
            endDate,
            includeAll: true,
            groupBy: 'user'
          });

          if (response.success) {
            const data = response.usersSummary || response.records || [];
            set({
              monthlyData: data,
              loading: false,
              lastUpdated: Date.now(),
              error: null
            });
            return data;
          } else {
            throw new Error(response.message || 'Failed to load monthly attendance data');
          }
        } catch (error) {
          setError('Failed to load monthly attendance: ' + error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Load daily attendance data
      loadDailyData: async (force = false) => {
        const { selectedDate, isDataStale, setLoading, setError } = get();

        if (!force && !isDataStale()) {
          return get().dailyData;
        }

        setLoading(true);

        try {
          const response = await httpClient.get('/attendance', {
            startDate: selectedDate,
            endDate: selectedDate,
            includeAll: true
          });

          if (response.success) {
            const data = response.records || [];
            set({
              dailyData: data,
              loading: false,
              lastUpdated: Date.now(),
              error: null
            });
            return data;
          } else {
            throw new Error(response.message || 'Failed to load daily attendance data');
          }
        } catch (error) {
          setError('Failed to load daily attendance: ' + error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Get filtered data based on current view
      getFilteredData: () => {
        const { selectedView, monthlyData, dailyData, searchTerm, filterStatus } = get();

        let data = selectedView === 'monthly' ? monthlyData : dailyData;

        // Apply search filter
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          data = data.filter(item =>
            (item.displayName || item.username || '').toLowerCase().includes(searchLower) ||
            (item.username || '').toLowerCase().includes(searchLower)
          );
        }

        // Apply status filter for daily view
        if (selectedView === 'daily' && filterStatus !== 'all') {
          data = data.filter(item => item.status === filterStatus);
        }

        return data;
      },

      // Update attendance record
      updateAttendanceRecord: async (username, date, updates) => {
        const { setLoading, setError, setSuccess } = get();

        setLoading(true);

        try {
          const response = await httpClient.post('/attendance/update-record', {
            username,
            date,
            ...updates
          });

          if (response.success) {
            setSuccess(`Updated attendance for ${username}`);

            // Refresh relevant data
            if (get().selectedView === 'monthly') {
              await get().loadMonthlyData(true);
            } else {
              await get().loadDailyData(true);
            }

            get().closeEditModal();
            return true;
          } else {
            throw new Error(response.message || 'Failed to update attendance');
          }
        } catch (error) {
          setError('Failed to update attendance: ' + error.message);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Get attendance statistics
      getAttendanceStatistics: () => {
        const { selectedView, monthlyData, dailyData } = get();
        const data = selectedView === 'monthly' ? monthlyData : dailyData;

        const stats = {
          totalUsers: data.length,
          presentCount: 0,
          absentCount: 0,
          leaveCount: 0,
          lateCount: 0,
          presentRate: 0
        };

        if (selectedView === 'monthly') {
          // For monthly view, calculate across all records
          let totalRecords = 0;
          data.forEach(user => {
            if (user.recentRecords) {
              user.recentRecords.forEach(record => {
                totalRecords++;
                switch (record.status) {
                  case 'present':
                    stats.presentCount++;
                    break;
                  case 'absent':
                    stats.absentCount++;
                    break;
                  case 'leave':
                    stats.leaveCount++;
                    break;
                  case 'late':
                    stats.lateCount++;
                    break;
                }
              });
            }
          });

          if (totalRecords > 0) {
            stats.presentRate = ((stats.presentCount / totalRecords) * 100).toFixed(1);
          }
        } else {
          // For daily view, calculate for the selected date
          data.forEach(record => {
            switch (record.status) {
              case 'present':
                stats.presentCount++;
                break;
              case 'absent':
                stats.absentCount++;
                break;
              case 'leave':
                stats.leaveCount++;
                break;
              case 'late':
                stats.lateCount++;
                break;
            }
          });

          if (stats.totalUsers > 0) {
            stats.presentRate = ((stats.presentCount / stats.totalUsers) * 100).toFixed(1);
          }
        }

        return stats;
      },

      // Export attendance data
      exportAttendanceData: async (format = 'csv') => {
        const { setLoading, setError, setSuccess } = get();
        const filteredData = get().getFilteredData();

        setLoading(true);

        try {
          if (format === 'csv') {
            // Create CSV content based on current view
            const headers = ['Date', 'User', 'Display Name', 'Status', 'Clock In', 'Clock Out', 'Work Type', 'Location', 'Notes'];
            const csvContent = [headers.join(',')];

            if (get().selectedView === 'monthly') {
              // Export monthly data
              filteredData.forEach(user => {
                if (user.recentRecords) {
                  user.recentRecords.forEach(record => {
                    csvContent.push([
                      record.date || '',
                      user.username || '',
                      user.displayName || '',
                      record.status || '',
                      record.clockIn || '',
                      record.clockOut || '',
                      record.workType || '',
                      record.location || '',
                      (record.notes || '').replace(/,/g, ';')
                    ].join(','));
                  });
                }
              });
            } else {
              // Export daily data
              filteredData.forEach(record => {
                csvContent.push([
                  record.date || '',
                  record.username || '',
                  record.displayName || '',
                  record.status || '',
                  record.clockIn || '',
                  record.clockOut || '',
                  record.workType || '',
                  record.location || '',
                  (record.notes || '').replace(/,/g, ';')
                ].join(','));
              });
            }

            // Download CSV
            const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);

            const fileName = get().selectedView === 'monthly'
              ? `attendance-monthly-${get().selectedMonth}.csv`
              : `attendance-daily-${get().selectedDate}.csv`;

            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setSuccess('Attendance data exported successfully');
            return true;
          }
        } catch (error) {
          setError('Failed to export data: ' + error.message);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Refresh all data
      refreshData: async () => {
        const { loadUsers, loadMonthlyData, loadDailyData, selectedView } = get();

        await loadUsers(true);

        if (selectedView === 'monthly') {
          await loadMonthlyData(true);
        } else {
          await loadDailyData(true);
        }
      },

      // Clear cache
      clearCache: () => {
        set({
          users: [],
          monthlyData: [],
          dailyData: [],
          lastUpdated: null,
          editingRecord: null,
          showEditModal: false
        });
      }
    }),
    {
      name: 'unified-attendance-management-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data, not loading states or modals
      partialize: (state) => ({
        selectedView: state.selectedView,
        selectedMonth: state.selectedMonth,
        selectedDate: state.selectedDate,
        searchTerm: state.searchTerm,
        filterStatus: state.filterStatus,
        lastUpdated: state.lastUpdated
      })
    }
  )
);

export default useUnifiedAttendanceManagementStore;