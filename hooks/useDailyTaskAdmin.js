/**
 * Daily Task Admin Hook
 * MVC Pattern implementation for daily task administration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import httpClient from '../src/shared/api/httpClient';

const useDailyTaskAdminStore = create(
  persist(
    (set, get) => ({
      // State
      activeTab: 'overview',
      loading: false,
      error: null,
      success: null,
      dailyEntries: [],
      users: [],
      dateRange: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
      filters: {
        searchTerm: '',
        selectedUser: '',
        category: 'all',
        sortBy: 'date',
        sortOrder: 'desc'
      },
      bulkOperations: {
        selectedEntries: new Set(),
        selectAll: false
      },
      showBulkActions: false,
      lastUpdated: null,

      // Cache duration: 3 minutes
      CACHE_DURATION: 3 * 60 * 1000,

      // Actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, success: null }),
      setSuccess: (success) => set({ success, error: null }),
      clearMessages: () => set({ error: null, success: null }),

      // Date range management
      setDateRange: (range) => {
        set({ dateRange: range });
        // Auto-refresh data when date range changes - force reload to bypass cache
        get().loadDailyEntries(true);
      },

      // Filters management
      setFilters: (newFilters) => set({ filters: { ...get().filters, ...newFilters } }),
      clearFilters: () => set({
        filters: {
          searchTerm: '',
          selectedUser: '',
          category: 'all',
          sortBy: 'date',
          sortOrder: 'desc'
        }
      }),

      // Bulk operations
      setBulkOperations: (ops) => set({ bulkOperations: { ...get().bulkOperations, ...ops } }),
      setShowBulkActions: (show) => set({ showBulkActions: show }),

      toggleSelectAll: () => {
        const { bulkOperations, dailyEntries } = get();
        const filteredEntries = get().getFilteredEntries();

        if (bulkOperations.selectAll) {
          // Deselect all
          set({
            bulkOperations: {
              selectedEntries: new Set(),
              selectAll: false
            }
          });
        } else {
          // Select all filtered entries
          const allIds = new Set(filteredEntries.map(entry => entry.id));
          set({
            bulkOperations: {
              selectedEntries: allIds,
              selectAll: true
            }
          });
        }
      },

      toggleEntrySelection: (entryId) => {
        const { bulkOperations } = get();
        const newSelected = new Set(bulkOperations.selectedEntries);

        if (newSelected.has(entryId)) {
          newSelected.delete(entryId);
        } else {
          newSelected.add(entryId);
        }

        set({
          bulkOperations: {
            ...bulkOperations,
            selectedEntries: newSelected,
            selectAll: false
          }
        });
      },

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

      // Load daily entries
      loadDailyEntries: async (force = false) => {
        const { dateRange, isDataStale, setLoading, setError } = get();

        if (!force && !isDataStale()) {
          return get().dailyEntries;
        }

        setLoading(true);

        try {
          const response = await httpClient.get('/daily-tasks', {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            allUsers: 'true'
          });

          if (response.success) {
            const dailyTaskDocuments = response.dailyTasks || [];

            // Flatten the structure: convert daily task documents to individual task entries
            const flattenedEntries = [];

            dailyTaskDocuments.forEach(dailyDoc => {
              if (dailyDoc.tasks && Array.isArray(dailyDoc.tasks)) {
                dailyDoc.tasks.forEach((task, index) => {
                  flattenedEntries.push({
                    // Create a unique ID for each task entry
                    id: `${dailyDoc.id}_task_${index}`,
                    // Daily document fields
                    dailyTaskId: dailyDoc.id,
                    username: dailyDoc.username,
                    displayName: dailyDoc.displayName || dailyDoc.username,
                    date: dailyDoc.date,
                    submittedBy: dailyDoc.submittedBy,
                    submittedAt: dailyDoc.submittedAt,
                    // Individual task fields
                    task: task.task || task.description || 'No title',
                    description: task.description || task.notes || '',
                    category: task.category || 'Uncategorized',
                    duration: task.timeSpent ? `${task.timeSpent}h` : (task.duration || '-'),
                    priority: task.priority || 'medium',
                    status: task.status || 'completed',
                    client: task.client || '',
                    // Additional metadata
                    notes: task.notes || '',
                    createdAt: dailyDoc.submittedAt
                  });
                });
              }
            });

            set({
              dailyEntries: flattenedEntries,
              loading: false,
              lastUpdated: Date.now(),
              error: null
            });
            return flattenedEntries;
          } else {
            throw new Error(response.message || 'Failed to load daily entries');
          }
        } catch (error) {
          setError('Failed to load daily entries: ' + error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Get filtered and sorted entries
      getFilteredEntries: () => {
        const { dailyEntries, filters } = get();
        let filtered = [...dailyEntries];

        // Apply search filter
        if (filters.searchTerm.trim()) {
          const searchLower = filters.searchTerm.toLowerCase();
          filtered = filtered.filter(entry =>
            entry.task?.toLowerCase().includes(searchLower) ||
            entry.description?.toLowerCase().includes(searchLower) ||
            entry.username?.toLowerCase().includes(searchLower) ||
            entry.displayName?.toLowerCase().includes(searchLower)
          );
        }

        // Apply user filter
        if (filters.selectedUser) {
          filtered = filtered.filter(entry => entry.username === filters.selectedUser);
        }

        // Apply category filter
        if (filters.category && filters.category !== 'all') {
          filtered = filtered.filter(entry => entry.category === filters.category);
        }

        // Apply sorting
        filtered.sort((a, b) => {
          let aValue = a[filters.sortBy];
          let bValue = b[filters.sortBy];

          // Handle date sorting
          if (filters.sortBy === 'date' || filters.sortBy === 'createdAt') {
            aValue = new Date(aValue || 0);
            bValue = new Date(bValue || 0);
          }

          // Handle string sorting
          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = (bValue || '').toLowerCase();
          }

          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;

          return filters.sortOrder === 'desc' ? -comparison : comparison;
        });

        return filtered;
      },

      // Get statistics
      getStatistics: () => {
        const { dailyEntries, users } = get();
        const filteredEntries = get().getFilteredEntries();

        const stats = {
          totalEntries: filteredEntries.length,
          totalUsers: users.length,
          activeUsers: new Set(filteredEntries.map(entry => entry.username)).size,
          avgEntriesPerUser: users.length > 0 ? (filteredEntries.length / users.length).toFixed(1) : 0,
          categoryCounts: {},
          dailyCounts: {},
          userCounts: {}
        };

        // Calculate category distribution
        filteredEntries.forEach(entry => {
          const category = entry.category || 'uncategorized';
          stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;
        });

        // Calculate daily distribution
        filteredEntries.forEach(entry => {
          const date = entry.date?.split('T')[0] || 'unknown';
          stats.dailyCounts[date] = (stats.dailyCounts[date] || 0) + 1;
        });

        // Calculate user distribution
        filteredEntries.forEach(entry => {
          const user = entry.username || 'unknown';
          stats.userCounts[user] = (stats.userCounts[user] || 0) + 1;
        });

        return stats;
      },

      // Delete entries
      deleteEntries: async (entryIds) => {
        const { setLoading, setError, setSuccess } = get();

        setLoading(true);

        try {
          // Since individual task deletion isn't supported yet,
          // we need to group entries by daily task document and delete entire documents
          const { dailyEntries } = get();
          const selectedEntries = dailyEntries.filter(entry => entryIds.has(entry.id));

          // Group by daily task document ID
          const documentsToDelete = new Set();
          selectedEntries.forEach(entry => {
            documentsToDelete.add(entry.dailyTaskId);
          });

          // For now, show a warning that entire daily task documents will be deleted
          const documentCount = documentsToDelete.size;
          if (!window.confirm(`Warning: This will delete ${documentCount} entire daily task document(s) (not just individual tasks). Continue?`)) {
            setLoading(false);
            return false;
          }

          // Delete each daily task document
          let deletedCount = 0;
          for (const dailyTaskId of documentsToDelete) {
            try {
              // Find the document details
              const entry = selectedEntries.find(e => e.dailyTaskId === dailyTaskId);
              if (entry) {
                const response = await httpClient.delete('/daily-tasks', {
                  date: entry.date,
                  user: entry.username
                });

                if (response.success) {
                  deletedCount++;
                }
              }
            } catch (error) {
              console.error('Error deleting daily task document:', error);
            }
          }

          if (deletedCount > 0) {
            setSuccess(`Successfully deleted ${deletedCount} daily task document(s)`);

            // Clear bulk selections
            set({
              bulkOperations: {
                selectedEntries: new Set(),
                selectAll: false
              }
            });

            // Reload entries
            await get().loadDailyEntries(true);
            return true;
          } else {
            throw new Error('Failed to delete any entries');
          }
        } catch (error) {
          setError('Failed to delete entries: ' + error.message);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Export entries to CSV
      exportEntries: async (format = 'csv') => {
        const { setLoading, setError, setSuccess } = get();
        const filteredEntries = get().getFilteredEntries();

        setLoading(true);

        try {
          if (format === 'csv') {
            // Create CSV content
            const headers = ['Date', 'User', 'Display Name', 'Task', 'Description', 'Category', 'Duration', 'Status'];
            const csvContent = [
              headers.join(','),
              ...filteredEntries.map(entry => [
                entry.date || '',
                entry.username || '',
                entry.displayName || '',
                (entry.task || '').replace(/,/g, ';'),
                (entry.description || '').replace(/,/g, ';'),
                entry.category || '',
                entry.duration || '',
                entry.status || ''
              ].join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `daily-tasks-${get().dateRange.startDate}-to-${get().dateRange.endDate}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setSuccess('Daily tasks exported successfully');
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
        const { loadUsers, loadDailyEntries } = get();
        await Promise.all([
          loadUsers(true),
          loadDailyEntries(true)
        ]);
      },

      // Clear cache
      clearCache: () => {
        set({
          dailyEntries: [],
          users: [],
          lastUpdated: null,
          bulkOperations: {
            selectedEntries: new Set(),
            selectAll: false
          }
        });
      }
    }),
    {
      name: 'daily-task-admin-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data, not loading states or selections
      partialize: (state) => ({
        dateRange: state.dateRange,
        filters: state.filters,
        activeTab: state.activeTab,
        lastUpdated: state.lastUpdated
      })
    }
  )
);

export default useDailyTaskAdminStore;