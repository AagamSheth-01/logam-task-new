/**
 * Daily Task Admin Component
 * MVC Pattern implementation with consistent UI matching user dashboard
 */

import React, { useEffect } from 'react';
import {
  Users,
  Calendar,
  TrendingUp,
  FileText,
  Download,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  User,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import useDailyTaskAdminStore from '../../hooks/useDailyTaskAdmin';

const DailyTaskAdmin = ({ currentUser }) => {
  // Controller layer - handles all business logic
  const {
    // State
    activeTab,
    loading,
    error,
    success,
    dailyEntries,
    users,
    dateRange,
    filters,
    bulkOperations,
    showBulkActions,

    // Actions
    setActiveTab,
    setDateRange,
    setFilters,
    clearMessages,
    loadUsers,
    loadDailyEntries,
    getFilteredEntries,
    getStatistics,
    toggleSelectAll,
    toggleEntrySelection,
    deleteEntries,
    exportEntries,
    refreshData,
    setBulkOperations,
    setShowBulkActions
  } = useDailyTaskAdminStore();

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  // Load initial data
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadDailyEntries();
    }
  }, [isAdmin, loadUsers, loadDailyEntries]);

  // Get filtered data and statistics
  const filteredEntries = getFilteredEntries();
  const statistics = getStatistics();

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (bulkOperations.selectedEntries.size === 0) {
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${bulkOperations.selectedEntries.size} selected entries? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    await deleteEntries(bulkOperations.selectedEntries);
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex space-x-2">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg p-4 h-20 animate-pulse"></div>
        ))}
      </div>
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 flex items-center space-x-4">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Error display component
  const ErrorDisplay = ({ error, onRetry }) => (
    <div className="bg-white border border-gray-100 rounded-lg p-8">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access daily task administration.</p>
        </div>
      </div>
    );
  }

  if (loading && dailyEntries.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error && dailyEntries.length === 0) {
    return <ErrorDisplay error={error} onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black flex items-center space-x-2">
            <FileText className="w-6 h-6" />
            <span>Daily Task Administration</span>
          </h2>
          <p className="text-gray-600 mt-1">Manage and monitor daily task entries across the organization</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportEntries('csv')}
            disabled={filteredEntries.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={refreshData}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-600 text-sm flex-1">{error}</p>
          <button
            onClick={clearMessages}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-600 text-sm flex-1">{success}</p>
          <button
            onClick={clearMessages}
            className="text-green-400 hover:text-green-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{statistics.totalEntries}</div>
          <div className="text-sm text-blue-700">Total Entries</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{statistics.activeUsers}</div>
          <div className="text-sm text-green-700">Active Users</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">{statistics.avgEntriesPerUser}</div>
          <div className="text-sm text-yellow-700">Avg per User</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{Object.keys(statistics.categoryCounts).length}</div>
          <div className="text-sm text-purple-700">Categories</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters({ searchTerm: e.target.value })}
                placeholder="Search tasks, users..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">User</label>
            <select
              value={filters.selectedUser}
              onChange={(e) => setFilters({ selectedUser: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.username} value={user.username}>
                  {user.displayName || user.username}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Sort By</label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters({ sortBy, sortOrder });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="username-asc">User A-Z</option>
              <option value="username-desc">User Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {bulkOperations.selectedEntries.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-800 font-medium">
            {bulkOperations.selectedEntries.size} entries selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-black">
            Individual Task Entries ({filteredEntries.length} tasks)
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              onChange={toggleSelectAll}
              checked={
                filteredEntries.length > 0 &&
                filteredEntries.every(entry => bulkOperations.selectedEntries.has(entry.id))
              }
              className="rounded border-gray-300"
            />
            <label className="text-sm text-gray-600">Select All</label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={bulkOperations.selectedEntries.has(entry.id)}
                      onChange={() => toggleEntrySelection(entry.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-600">
                          {(entry.displayName || entry.username)?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-black">
                          {entry.displayName || entry.username}
                        </div>
                        <div className="text-xs text-gray-500">@{entry.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <div className="text-sm font-medium text-black truncate">
                        {entry.task || 'No title'}
                      </div>
                      {entry.description && (
                        <div className="text-xs text-gray-500 truncate">
                          {entry.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {entry.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{entry.duration || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => console.log('View entry:', entry.id)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleEntrySelection(entry.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                        title="Select for deletion"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500">No individual task entries found for this date range</p>
                      <button
                        onClick={refreshData}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Refresh Data
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyTaskAdmin;