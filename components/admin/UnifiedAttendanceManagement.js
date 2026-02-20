/**
 * Unified Attendance Management Component
 * MVC Pattern implementation with consistent UI matching user dashboard
 */

import React, { useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Home,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Edit,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Filter,
  Building,
  Coffee,
  Timer,
  AlertTriangle,
  Check
} from 'lucide-react';
import useUnifiedAttendanceManagementStore from '../../hooks/useUnifiedAttendanceManagement';

const UnifiedAttendanceManagement = () => {
  // Controller layer - handles all business logic
  const {
    // State
    selectedView,
    selectedMonth,
    selectedDate,
    users,
    loading,
    error,
    success,
    searchTerm,
    filterStatus,
    editingRecord,
    showEditModal,

    // Actions
    setSelectedView,
    setSelectedMonth,
    setSelectedDate,
    setSearchTerm,
    setFilterStatus,
    setEditingRecord,
    closeEditModal,
    loadUsers,
    loadMonthlyData,
    loadDailyData,
    clearMessages,
    getFilteredData,
    getAttendanceStatistics,
    updateAttendanceRecord,
    exportAttendanceData,
    refreshData
  } = useUnifiedAttendanceManagementStore();

  // Load initial data
  useEffect(() => {
    loadUsers();
    if (selectedView === 'monthly') {
      loadMonthlyData();
    } else {
      loadDailyData();
    }
  }, [selectedView, loadUsers, loadMonthlyData, loadDailyData]);

  // Get filtered data and statistics
  const filteredData = getFilteredData();
  const statistics = getAttendanceStatistics();

  // Helper functions for UI
  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'leave':
        return <Coffee className="w-4 h-4 text-yellow-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'leave':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'late':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Handle edit record
  const handleSaveRecord = async () => {
    if (!editingRecord) return;

    await updateAttendanceRecord(
      editingRecord.username,
      editingRecord.date,
      {
        status: editingRecord.status,
        clockIn: editingRecord.clockIn,
        clockOut: editingRecord.clockOut,
        workType: editingRecord.workType,
        notes: editingRecord.notes
      }
    );
  };

  // Navigate months
  const navigateMonth = (direction) => {
    const currentDate = new Date(selectedMonth + '-01');
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setSelectedMonth(newDate.toISOString().slice(0, 7));
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

  if (loading && filteredData.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error && filteredData.length === 0) {
    return <ErrorDisplay error={error} onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black flex items-center space-x-2">
            <Calendar className="w-6 h-6" />
            <span>Unified Attendance Management</span>
          </h2>
          <p className="text-gray-600 mt-1">Comprehensive attendance tracking and management</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportAttendanceData('csv')}
            disabled={filteredData.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
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
          <div className="text-2xl font-bold text-blue-600">{statistics.totalUsers}</div>
          <div className="text-sm text-blue-700">Total Users</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{statistics.presentCount}</div>
          <div className="text-sm text-green-700">Present</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{statistics.absentCount}</div>
          <div className="text-sm text-red-700">Absent</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">{statistics.presentRate}%</div>
          <div className="text-sm text-yellow-700">Attendance Rate</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* View Selector */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">View Mode</label>
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="monthly">Monthly View</option>
              <option value="daily">Daily View</option>
            </select>
          </div>

          {/* Date/Month Selector */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              {selectedView === 'monthly' ? 'Month' : 'Date'}
            </label>
            {selectedView === 'monthly' ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            )}
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
          </div>

          {/* Status Filter (for daily view) */}
          {selectedView === 'daily' && (
            <div>
              <label className="block text-sm font-medium text-black mb-1">Status Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
                <option value="late">Late</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Data */}
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-black">
            {selectedView === 'monthly' ? 'Monthly' : 'Daily'} Attendance ({filteredData.length} {selectedView === 'monthly' ? 'users' : 'records'})
          </h3>
        </div>

        <div className="p-4">
          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'No records match your search criteria.' : 'No attendance data available.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedView === 'monthly' ? (
                // Monthly View - Show users with their attendance summary
                filteredData.map((user) => (
                  <div key={user.username} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-600">
                            {(user.displayName || user.username)?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-black">{user.displayName || user.username}</h4>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {user.recentRecords ? user.recentRecords.length : 0} records this month
                      </div>
                    </div>

                    {user.recentRecords && user.recentRecords.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {user.recentRecords.slice(0, 6).map((record, index) => (
                          <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">
                                {record.date ? new Date(record.date).toLocaleDateString() : '-'}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(record.status)}`}>
                                {getStatusIcon(record.status)}
                                <span className="ml-1 capitalize">{record.status}</span>
                              </span>
                            </div>
                          </div>
                        ))}
                        {user.recentRecords.length > 6 && (
                          <div className="bg-gray-50 rounded p-2 text-sm text-center text-gray-500">
                            +{user.recentRecords.length - 6} more records
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Daily View - Show individual records
                <div className="space-y-3">
                  {filteredData.map((record, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                            <span className="text-sm font-semibold text-gray-600">
                              {(record.displayName || record.username)?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-black">{record.displayName || record.username}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {record.clockIn && (
                                <span>In: {record.clockIn}</span>
                              )}
                              {record.clockOut && (
                                <span>Out: {record.clockOut}</span>
                              )}
                              {record.workType && (
                                <span className="capitalize">{record.workType}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(record.status)}`}>
                            {getStatusIcon(record.status)}
                            <span className="ml-1 capitalize">{record.status}</span>
                          </span>
                          <button
                            onClick={() => setEditingRecord(record)}
                            className="text-blue-600 hover:text-blue-700 p-2"
                            title="Edit record"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Record Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Edit Attendance Record</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">User</label>
                <input
                  type="text"
                  value={editingRecord.displayName || editingRecord.username}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Status</label>
                <select
                  value={editingRecord.status}
                  onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                  <option value="late">Late</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Clock In</label>
                <input
                  type="time"
                  value={editingRecord.clockIn || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, clockIn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Clock Out</label>
                <input
                  type="time"
                  value={editingRecord.clockOut || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, clockOut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Work Type</label>
                <select
                  value={editingRecord.workType || 'office'}
                  onChange={(e) => setEditingRecord({ ...editingRecord, workType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="office">Office</option>
                  <option value="home">Home</option>
                  <option value="client_site">Client Site</option>
                  <option value="field">Field</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Notes</label>
                <textarea
                  value={editingRecord.notes || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  rows={3}
                  placeholder="Add any notes..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecord}
                disabled={loading}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedAttendanceManagement;