/**
 * Attendance Admin Management Hook
 * MVC Pattern implementation for attendance administration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import httpClient from '../src/shared/api/httpClient';
import useAuthStore from '../src/store/authStore';

const useAttendanceAdminManagementStore = create(
  persist(
    (set, get) => ({
      // State
      selectedDate: new Date().toISOString().split('T')[0],
      dateRangeMode: false,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      users: [],
      attendanceData: [],
      loading: false,
      error: null,
      success: null,
      selectedUsers: new Set(),
      bulkAction: '',
      editingRecord: null,
      showHolidayModal: false,
      holidayName: '',
      showBulkDateModal: false,
      bulkDateRange: {
        startDate: '',
        endDate: '',
        action: 'mark_present'
      },
      searchTerm: '',
      filterStatus: 'all',
      lastUpdated: null,

      // Constants
      ATTENDANCE_STATUS: {
        PRESENT: 'present',
        ABSENT: 'absent',
        LEAVE: 'leave',
        HALF_DAY: 'half_day',
        LATE: 'late',
        EARLY_OUT: 'early_out'
      },

      LEAVE_TYPES: {
        SICK: 'sick_leave',
        CASUAL: 'casual_leave',
        ANNUAL: 'annual_leave',
        MATERNITY: 'maternity_leave',
        PATERNITY: 'paternity_leave',
        EMERGENCY: 'emergency_leave'
      },

      LOCATIONS: {
        OFFICE: 'office',
        HOME: 'home',
        CLIENT_SITE: 'client_site',
        FIELD: 'field'
      },

      // Cache duration: 2 minutes (attendance data changes frequently)
      CACHE_DURATION: 2 * 60 * 1000,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, success: null }),
      setSuccess: (success) => set({ success, error: null }),
      clearMessages: () => set({ error: null, success: null }),

      // Date management
      setSelectedDate: (date) => {
        set({ selectedDate: date });
        // Auto-refresh attendance data when date changes
        if (!get().dateRangeMode) {
          get().loadAttendanceData();
        }
      },

      setDateRangeMode: (enabled) => {
        set({ dateRangeMode: enabled });
        // Reload data when switching modes
        get().loadAttendanceData();
      },

      setStartDate: (date) => {
        set({ startDate: date });
        if (get().dateRangeMode) {
          get().loadAttendanceData();
        }
      },

      setEndDate: (date) => {
        set({ endDate: date });
        if (get().dateRangeMode) {
          get().loadAttendanceData();
        }
      },

      // Search and filter
      setSearchTerm: (term) => set({ searchTerm: term }),
      setFilterStatus: (status) => set({ filterStatus: status }),

      // Selection management
      setSelectedUsers: (users) => set({ selectedUsers: users }),
      setBulkAction: (action) => set({ bulkAction: action }),

      // Modal management
      setShowHolidayModal: (show) => set({ showHolidayModal: show }),
      setHolidayName: (name) => set({ holidayName: name }),
      setEditingRecord: (record) => set({ editingRecord: record }),
      setShowBulkDateModal: (show) => set({ showBulkDateModal: show }),
      setBulkDateRange: (range) => set({ bulkDateRange: { ...get().bulkDateRange, ...range } }),

      // Check if data is stale
      isDataStale: () => {
        const { lastUpdated, CACHE_DURATION } = get();
        if (!lastUpdated) return true;
        return Date.now() - lastUpdated > CACHE_DURATION;
      },

      // Load users
      loadUsers: async (force = false) => {
        const { users, isDataStale, setLoading, setError } = get();

        console.log('loadUsers called:', { force, cachedUsersLength: users.length, isDataStale: isDataStale() });

        // Return cached users if fresh and not forced (but always force on first load)
        if (!force && users.length > 0 && !isDataStale()) {
          console.log('Returning cached users:', users.length);
          return users;
        }

        console.log('Loading users from API...');
        setLoading(true);

        try {
          const response = await httpClient.get('/users');
          console.log('Users API response:', response);

          if (response.success) {
            const usersArray = response.users || [];
            console.log('Loaded users:', usersArray.length, usersArray);

            set({
              users: usersArray,
              lastUpdated: Date.now(),
              error: null,
              loading: false
            });

            // Auto-load attendance data after loading users
            if (usersArray.length > 0) {
              console.log('Auto-loading attendance data for', usersArray.length, 'users');
              // Load attendance data immediately
              get().loadAttendanceData(true);
            } else {
              console.warn('No users loaded, cannot load attendance data');
            }

            return usersArray;
          } else {
            throw new Error(response.message || 'Failed to load users');
          }
        } catch (error) {
          console.error('Error loading users:', error);
          setError('Failed to load users: ' + error.message);
          setLoading(false);
          throw error;
        }
      },

      // Load attendance data
      loadAttendanceData: async (force = false) => {
        const { selectedDate, startDate, endDate, dateRangeMode, users, isDataStale, setLoading, setError } = get();

        if (users.length === 0) {
          return;
        }

        // Return cached data if fresh and not forced
        if (!force && !isDataStale()) {
          return get().attendanceData;
        }

        // Note: Admin role is already verified by the admin page before this component loads
        console.log('Loading attendance data for admin user');

        setLoading(true);

        try {
          // Determine date parameters based on mode
          const requestParams = {
            all: 'true'
          };

          if (dateRangeMode) {
            requestParams.startDate = startDate;
            requestParams.endDate = endDate;
            console.log('Loading attendance data for admin (date range):', {
              startDate,
              endDate,
              usersCount: users.length
            });
          } else {
            requestParams.startDate = selectedDate;
            requestParams.endDate = selectedDate;
            console.log('Loading attendance data for admin (single date):', {
              selectedDate,
              usersCount: users.length
            });
          }

          const response = await httpClient.get('/attendance', requestParams);

          if (response.success) {
            console.log('Attendance API response:', {
              records: response.records?.length || 0,
              usersSummary: response.usersSummary?.length || 0,
              sampleRecord: response.records?.[0],
              sampleSummary: response.usersSummary?.[0]
            });

            // Process attendance data to create user-date matrix
            const attendanceMap = new Map();

            // Handle direct records array format
            if (Array.isArray(response.records) && response.records.length > 0) {
              response.records.forEach(record => {
                const recordDate = record.date?.split('T')[0] || record.date;

                // In range mode, include all records in range; in single mode, only selected date
                const shouldInclude = dateRangeMode ?
                  (recordDate >= startDate && recordDate <= endDate) :
                  (recordDate === selectedDate);

                if (shouldInclude) {
                  // For range mode, use a composite key (username-date)
                  const recordKey = dateRangeMode ? `${record.username}-${recordDate}` : record.username;
                  attendanceMap.set(recordKey, {
                    ...record,
                    displayName: record.displayName || record.username,
                    dateFormatted: recordDate,
                    recordId: recordKey // Add unique record ID for tracking
                  });
                }
              });
              console.log('Processed records:', attendanceMap.size, 'attendance records found');
            }

            // Handle usersSummary format (for admin requests) - only for single date mode
            if (!dateRangeMode && Array.isArray(response.usersSummary) && response.usersSummary.length > 0) {
              response.usersSummary.forEach(userSummary => {
                if (userSummary.recentRecords && Array.isArray(userSummary.recentRecords)) {
                  userSummary.recentRecords.forEach(record => {
                    const recordDate = record.date?.split('T')[0] || record.date;
                    if (recordDate === selectedDate) {
                      const recordKey = userSummary.username;
                      attendanceMap.set(recordKey, {
                        ...record,
                        username: userSummary.username,
                        displayName: userSummary.displayName || userSummary.username,
                        dateFormatted: recordDate,
                        recordId: recordKey
                      });
                    }
                  });
                }
              });
              console.log('Processed usersSummary:', attendanceMap.size, 'attendance records found');
            }

            // Create attendance records for all users
            let attendanceRecords = [];

            if (dateRangeMode) {
              // In range mode, create records for each user-date combination
              const dateRange = [];
              const currentDate = new Date(startDate);
              const endDateObj = new Date(endDate);

              while (currentDate <= endDateObj) {
                dateRange.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
              }

              // Create records for each user for each date in range
              users.forEach(user => {
                dateRange.forEach(date => {
                  const recordKey = `${user.username}-${date}`;
                  const existingRecord = attendanceMap.get(recordKey);
                  attendanceRecords.push(existingRecord || {
                    username: user.username,
                    displayName: user.displayName || user.name || user.username,
                    date: date,
                    dateFormatted: date,
                    status: 'absent',
                    clockIn: null,
                    clockOut: null,
                    workType: 'office',
                    workMode: 'office',
                    location: null,
                    notes: '',
                    leaveType: null,
                    isHoliday: false,
                    recordId: recordKey // Add unique record ID
                  });
                });
              });

              // Sort records by date and then by username for better organization
              attendanceRecords.sort((a, b) => {
                if (a.date !== b.date) {
                  return a.date.localeCompare(b.date);
                }
                return a.username.localeCompare(b.username);
              });
            } else {
              // Single date mode - existing logic
              attendanceRecords = users.map(user => {
                const existingRecord = attendanceMap.get(user.username);
                return existingRecord || {
                  username: user.username,
                  displayName: user.displayName || user.name || user.username,
                  date: selectedDate,
                  dateFormatted: selectedDate,
                  status: 'absent',
                  clockIn: null,
                  clockOut: null,
                  workType: 'office',
                  workMode: 'office',
                  location: null,
                  notes: '',
                  leaveType: null,
                  isHoliday: false,
                  recordId: user.username // Add unique record ID
                };
              });

              // Sort by username for consistent ordering
              attendanceRecords.sort((a, b) => a.username.localeCompare(b.username));
            }

            console.log('Sample user and attendance record:', {
              sampleUser: users[0],
              sampleAttendanceRecord: attendanceRecords[0],
              usernames: users.map(u => u.username)
            });

            console.log('Final attendance records:', {
              totalUsers: users.length,
              totalRecords: attendanceRecords.length,
              presentRecords: attendanceRecords.filter(r => r.status === 'present').length,
              absentRecords: attendanceRecords.filter(r => r.status === 'absent').length,
              sampleRecord: attendanceRecords[0]
            });

            set({
              attendanceData: attendanceRecords,
              loading: false,
              lastUpdated: Date.now(),
              error: null
            });

            return attendanceRecords;
          } else {
            throw new Error(response.message || 'Failed to load attendance data');
          }
        } catch (error) {
          setError('Failed to load attendance data: ' + error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Bulk selection operations
      handleSelectAll: () => {
        const { dateRangeMode } = get();
        const filteredUsers = get().getFilteredAttendance();
        const allSelected = filteredUsers.every(record =>
          dateRangeMode ? get().selectedUsers.has(record.recordId) : get().selectedUsers.has(record.username)
        );

        if (allSelected) {
          // Deselect all
          set({ selectedUsers: new Set() });
        } else {
          // Select all filtered records
          const newSelected = new Set(filteredUsers.map(record =>
            dateRangeMode ? record.recordId : record.username
          ));
          set({ selectedUsers: newSelected });
        }
      },

      toggleUserSelection: (identifier) => {
        const { selectedUsers } = get();
        const newSelected = new Set(selectedUsers);

        if (newSelected.has(identifier)) {
          newSelected.delete(identifier);
        } else {
          newSelected.add(identifier);
        }

        set({ selectedUsers: newSelected });
      },

      // Bulk operations
      applyBulkAction: async () => {
        const { selectedUsers, bulkAction, dateRangeMode, setLoading, setError, setSuccess } = get();

        if (selectedUsers.size === 0 || !bulkAction) {
          setError('Please select users and an action');
          return false;
        }

        setLoading(true);

        try {
          // Extract usernames from selected identifiers
          let usernames;
          if (dateRangeMode) {
            // In date range mode, extract unique usernames from recordIds
            const uniqueUsernames = new Set();
            Array.from(selectedUsers).forEach(recordId => {
              const username = recordId.split('-')[0]; // recordId format: username-date
              uniqueUsernames.add(username);
            });
            usernames = Array.from(uniqueUsernames);
          } else {
            // In single date mode, selectedUsers contains usernames directly
            usernames = Array.from(selectedUsers);
          }

          // Handle different bulk actions
          switch (bulkAction) {
            case 'mark_present':
              await get().bulkUpdateAttendance(usernames, { status: 'present' });
              setSuccess(`Marked ${usernames.length} users as present`);
              break;

            case 'mark_absent':
              await get().bulkUpdateAttendance(usernames, { status: 'absent' });
              setSuccess(`Marked ${usernames.length} users as absent`);
              break;

            case 'mark_leave':
              await get().bulkUpdateAttendance(usernames, { status: 'leave' });
              setSuccess(`Marked ${usernames.length} users on leave`);
              break;

            case 'mark_half_day':
              await get().bulkUpdateAttendance(usernames, { status: 'half_day' });
              setSuccess(`Marked ${usernames.length} users as half day`);
              break;

            case 'mark_holiday':
              await get().markHoliday();
              setSuccess('Marked day as holiday for all users');
              break;

            case 'bulk_date_range':
              // Open bulk date range modal
              get().setShowBulkDateModal(true);
              return true; // Don't clear selection yet

            default:
              throw new Error('Invalid bulk action');
          }

          // Update local state immediately for same-date bulk operations
          if (bulkAction !== 'mark_holiday' && bulkAction !== 'bulk_date_range') {
            const { updateLocalBulkRecords } = get();
            const statusUpdate = {
              status: bulkAction.replace('mark_', ''),
              clockIn: bulkAction === 'mark_present' ? '09:00' :
                      bulkAction === 'mark_half_day' ? '09:00' : null,
              clockOut: bulkAction === 'mark_half_day' ? '13:00' : null,
              workType: bulkAction.includes('present') || bulkAction.includes('half') ? 'office' : null
            };
            updateLocalBulkRecords(usernames, statusUpdate);
          } else {
            // For holiday/date range operations, still reload data
            await get().loadAttendanceData(true);
          }

          // Clear selection
          set({ selectedUsers: new Set(), bulkAction: '' });

          return true;
        } catch (error) {
          setError('Bulk operation failed: ' + error.message);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Bulk update attendance
      bulkUpdateAttendance: async (usernames, updates) => {
        const { selectedDate } = get();

        // Convert to new API format
        const operations = usernames.map(username => ({
          username,
          action: updates.status === 'present' ? 'mark_present' :
                  updates.status === 'absent' ? 'mark_absent' :
                  updates.status === 'leave' ? 'mark_leave' :
                  updates.status === 'half_day' ? 'mark_half_day' :
                  'mark_present' // default
        }));

        console.log('Bulk update request:', {
          operations,
          date: selectedDate,
          originalUpdates: updates
        });

        const response = await httpClient.post('/attendance/bulk-update', {
          operations,
          date: selectedDate
        });

        if (!response.success) {
          throw new Error(response.message || 'Bulk update failed');
        }

        return response;
      },

      // Mark holiday
      markHoliday: async () => {
        const { selectedDate, holidayName, setShowHolidayModal } = get();

        if (!holidayName.trim()) {
          throw new Error('Holiday name is required');
        }

        const response = await httpClient.post('/attendance/mark-holiday', {
          date: selectedDate,
          holidayName: holidayName.trim()
        });

        if (!response.success) {
          throw new Error(response.message || 'Failed to mark holiday');
        }

        setShowHolidayModal(false);
        set({ holidayName: '' });
        return response;
      },

      // Bulk date range operation
      applyBulkDateRange: async () => {
        const { selectedUsers, bulkDateRange, dateRangeMode, setLoading, setError, setSuccess, setShowBulkDateModal } = get();

        if (selectedUsers.size === 0) {
          setError('Please select users first');
          return false;
        }

        if (!bulkDateRange.startDate || !bulkDateRange.endDate) {
          setError('Please select both start and end dates');
          return false;
        }

        setLoading(true);

        try {
          // Extract usernames from selected identifiers
          let usernames;
          if (dateRangeMode) {
            // In date range mode, extract unique usernames from recordIds
            const uniqueUsernames = new Set();
            Array.from(selectedUsers).forEach(recordId => {
              const username = recordId.split('-')[0]; // recordId format: username-date
              uniqueUsernames.add(username);
            });
            usernames = Array.from(uniqueUsernames);
          } else {
            // In single date mode, selectedUsers contains usernames directly
            usernames = Array.from(selectedUsers);
          }

          // Generate date range
          const dates = [];
          const currentDate = new Date(bulkDateRange.startDate);
          const endDate = new Date(bulkDateRange.endDate);

          while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
          }

          console.log('Bulk date range operation:', {
            usernames,
            dates,
            action: bulkDateRange.action
          });

          // Use the existing bulk-date-update API for each user
          let totalSuccess = 0;
          let totalErrors = 0;

          for (const username of usernames) {
            try {
              const response = await httpClient.post('/attendance/bulk-date-update', {
                username,
                startDate: bulkDateRange.startDate,
                endDate: bulkDateRange.endDate,
                status: bulkDateRange.action.replace('mark_', ''),
                location: 'office'
              });

              if (response.success) {
                totalSuccess += response.daysProcessed || dates.length;
              } else {
                totalErrors++;
                console.error(`Failed to update ${username}:`, response.message);
              }
            } catch (error) {
              totalErrors++;
              console.error(`Error updating ${username}:`, error);
            }
          }

          setSuccess(`Bulk operation completed: ${totalSuccess} records updated for ${usernames.length} users`);

          // Clear selection and close modal
          set({
            selectedUsers: new Set(),
            bulkAction: '',
            showBulkDateModal: false,
            bulkDateRange: {
              startDate: '',
              endDate: '',
              action: 'mark_present'
            }
          });

          // Reload data
          await get().loadAttendanceData(true);

          return true;
        } catch (error) {
          setError('Bulk date operation failed: ' + error.message);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Update individual attendance record
      updateAttendanceRecord: async (recordId, updates) => {
        const { selectedDate, dateRangeMode, setLoading, setError, setSuccess, updateLocalAttendanceRecord, setEditingRecord } = get();

        setLoading(true);

        try {
          // Extract username and date from recordId or use current selection
          let username, targetDate;
          if (dateRangeMode && recordId.includes('-')) {
            const parts = recordId.split('-');
            username = parts[0];
            targetDate = parts.slice(1).join('-'); // Handle dates with hyphens
          } else {
            username = recordId;
            targetDate = selectedDate;
          }

          // Optimistically update local state immediately
          updateLocalAttendanceRecord(username, updates, targetDate);

          const response = await httpClient.post('/attendance/update-record', {
            username,
            date: targetDate,
            ...updates
          });

          if (response.success) {
            setSuccess(`Updated attendance for ${username}`);
            console.log('✅ Individual attendance update successful');
            setEditingRecord(null); // Close edit modal
            return true;
          } else {
            throw new Error(response.message || 'Update failed');
          }
        } catch (error) {
          // Revert local changes on error by reloading
          console.error('❌ Update failed, reverting local changes');
          setError('Failed to update attendance: ' + error.message);
          await get().loadAttendanceData(true);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Filtered attendance data
      getFilteredAttendance: () => {
        const { attendanceData, searchTerm, filterStatus } = get();

        let filtered = attendanceData;

        // Apply search filter
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          filtered = filtered.filter(record =>
            (record.displayName || record.username).toLowerCase().includes(searchLower) ||
            record.username.toLowerCase().includes(searchLower)
          );
        }

        // Apply status filter
        if (filterStatus && filterStatus !== 'all') {
          filtered = filtered.filter(record => record.status === filterStatus);
        }

        return filtered;
      },

      // Export attendance data
      exportAttendanceData: async () => {
        const { selectedDate, getFilteredAttendance, setLoading, setError, setSuccess } = get();

        setLoading(true);

        try {
          const filteredData = getFilteredAttendance();

          // Create CSV content
          const headers = [
            'Username',
            'Display Name',
            'Date',
            'Status',
            'Clock In',
            'Clock Out',
            'Work Type',
            'Location',
            'Notes'
          ];

          const csvContent = [
            headers.join(','),
            ...filteredData.map(record => [
              record.username,
              record.displayName || record.username,
              record.date,
              record.status,
              record.clockIn || '',
              record.clockOut || '',
              record.workType || '',
              record.location || '',
              (record.notes || '').replace(/,/g, ';') // Replace commas to avoid CSV issues
            ].join(','))
          ].join('\n');

          // Download CSV
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `attendance_${selectedDate}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setSuccess('Attendance data exported successfully');
          return true;
        } catch (error) {
          setError('Failed to export data: ' + error.message);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Refresh all data
      refreshData: async () => {
        const { loadUsers, loadAttendanceData } = get();
        await loadUsers(true);
        await loadAttendanceData(true);
      },

      // Clear cache
      // Update individual attendance record in local state
      updateLocalAttendanceRecord: (username, updates, targetDate = null) => {
        const { attendanceData, selectedDate, dateRangeMode } = get();
        const date = targetDate || selectedDate;

        const updatedData = attendanceData.map(record => {
          // In date range mode, match both username and date
          const shouldUpdate = dateRangeMode ?
            (record.username === username && (record.date === date || record.dateFormatted === date)) :
            (record.username === username);

          return shouldUpdate
            ? { ...record, ...updates, updatedAt: new Date().toISOString() }
            : record;
        });

        set({ attendanceData: updatedData });
        console.log('Local state updated for:', username, 'on date:', date, updates);
      },

      // Bulk update multiple records in local state
      updateLocalBulkRecords: (usernames, updates) => {
        const { attendanceData } = get();
        const usernameSet = new Set(usernames);

        const updatedData = attendanceData.map(record =>
          usernameSet.has(record.username)
            ? { ...record, ...updates, updatedAt: new Date().toISOString() }
            : record
        );

        set({ attendanceData: updatedData });
        console.log('Local bulk state updated for:', usernames.length, 'users', updates);
      },

      // Update date range records in local state
      updateLocalDateRangeRecords: (usernames, dates, updates) => {
        console.log('Local date range update - this affects multiple dates, keeping current approach');
        // For date range updates, we still need to reload since it affects multiple dates
        // and we only show one date at a time
      },

      clearCache: () => {
        set({
          users: [],
          attendanceData: [],
          lastUpdated: null,
          selectedUsers: new Set(),
          error: null,
          success: null
        });
      }
    }),
    {
      name: 'attendance-admin-management-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data, not loading states or selections
      partialize: (state) => ({
        selectedDate: state.selectedDate,
        users: state.users,
        lastUpdated: state.lastUpdated
      })
    }
  )
);

export default useAttendanceAdminManagementStore;