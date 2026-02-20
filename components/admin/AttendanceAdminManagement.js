/**
 * Attendance Admin Management Component
 * MVC Pattern implementation with consistent UI matching user dashboard
 */

import React, { useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Coffee,
  Home,
  Building,
  Edit3,
  Save,
  X,
  Check,
  AlertTriangle,
  Filter,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  Settings,
  Plus,
  Trash2,
  Timer,
  Navigation,
  Plane,
  Heart,
  Briefcase
} from 'lucide-react';
import useAttendanceAdminManagementStore from '../../hooks/useAttendanceAdminManagement';

const AttendanceAdminManagement = () => {
  // Controller layer - handles all business logic
  const {
    // State
    selectedDate,
    dateRangeMode,
    startDate,
    endDate,
    users,
    attendanceData,
    loading,
    error,
    success,
    selectedUsers,
    bulkAction,
    editingRecord,
    showHolidayModal,
    holidayName,
    showBulkDateModal,
    bulkDateRange,
    searchTerm,
    filterStatus,

    // Constants
    ATTENDANCE_STATUS,
    LEAVE_TYPES,
    LOCATIONS,

    // Actions
    setSelectedDate,
    setDateRangeMode,
    setStartDate,
    setEndDate,
    setSearchTerm,
    setFilterStatus,
    setSelectedUsers,
    setBulkAction,
    setEditingRecord,
    setShowHolidayModal,
    setHolidayName,
    setShowBulkDateModal,
    setBulkDateRange,
    loadUsers,
    loadAttendanceData,
    clearMessages,
    handleSelectAll,
    toggleUserSelection,
    applyBulkAction,
    updateAttendanceRecord,
    getFilteredAttendance,
    exportAttendanceData,
    refreshData,
    markHoliday,
    applyBulkDateRange,
    updateLocalAttendanceRecord,
    updateLocalBulkRecords
  } = useAttendanceAdminManagementStore();

  // Load users and attendance data on mount
  useEffect(() => {
    console.log('AttendanceAdminManagement mounted, loading initial data');
    const initializeData = async () => {
      try {
        console.log('Initializing attendance admin data...');
        // Force load users (bypass cache on mount)
        await loadUsers(true);
        // Force load attendance data immediately after users are loaded
        setTimeout(() => {
          console.log('Loading attendance data after user load...');
          loadAttendanceData(true);
        }, 50);
      } catch (error) {
        console.error('Error initializing attendance data:', error);
      }
    };

    initializeData();
  }, []);

  // Load attendance data when users are available or date changes
  useEffect(() => {
    if (users.length > 0) {
      console.log('Loading attendance data for existing users:', {
        usersCount: users.length,
        selectedDate,
        attendanceDataLength: attendanceData.length
      });
      loadAttendanceData(true); // Force reload to ensure fresh data
    }
  }, [users.length, selectedDate]);

  // Fallback: If no data after 1 second, try to load again
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (users.length === 0 && !loading) {
        console.log('Fallback: No users loaded, attempting reload');
        loadUsers(true);
      }
      if (users.length > 0 && attendanceData.length === 0 && !loading) {
        console.log('Fallback: No attendance data, attempting reload');
        loadAttendanceData(true);
      }
    }, 1000);

    return () => clearTimeout(fallbackTimer);
  }, [users.length, attendanceData.length, loading]);

  // Helper functions for UI
  const getStatusIcon = (status) => {
    switch (status) {
      case ATTENDANCE_STATUS.PRESENT:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case ATTENDANCE_STATUS.ABSENT:
        return <XCircle className="w-4 h-4 text-red-600" />;
      case ATTENDANCE_STATUS.LEAVE:
        return <Coffee className="w-4 h-4 text-yellow-600" />;
      case ATTENDANCE_STATUS.HALF_DAY:
        return <Timer className="w-4 h-4 text-orange-600" />;
      case ATTENDANCE_STATUS.LATE:
        return <Clock className="w-4 h-4 text-orange-600" />;
      case ATTENDANCE_STATUS.EARLY_OUT:
        return <Timer className="w-4 h-4 text-orange-600" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getWorkTypeIcon = (workType) => {
    switch (workType) {
      case LOCATIONS.HOME:
        return <Home className="w-4 h-4 text-blue-600" />;
      case LOCATIONS.OFFICE:
        return <Building className="w-4 h-4 text-gray-600" />;
      case LOCATIONS.CLIENT_SITE:
        return <Briefcase className="w-4 h-4 text-purple-600" />;
      case LOCATIONS.FIELD:
        return <Navigation className="w-4 h-4 text-green-600" />;
      default:
        return <Building className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case ATTENDANCE_STATUS.PRESENT:
        return 'bg-green-100 text-green-800 border-green-200';
      case ATTENDANCE_STATUS.ABSENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case ATTENDANCE_STATUS.LEAVE:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ATTENDANCE_STATUS.HALF_DAY:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case ATTENDANCE_STATUS.LATE:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case ATTENDANCE_STATUS.EARLY_OUT:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 flex items-center space-x-4">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
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

  const filteredAttendance = getFilteredAttendance();

  // Debug logging
  console.log('AttendanceAdminManagement render:', {
    loading,
    usersLength: users.length,
    attendanceDataLength: attendanceData.length,
    filteredAttendanceLength: filteredAttendance.length,
    selectedDate,
    error
  });

  // Show loading skeleton only for initial load or when no data exists
  if (loading && users.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error && attendanceData.length === 0) {
    return <ErrorDisplay error={error} onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black flex items-center space-x-2">
            <Users className="w-6 h-6" />
            <span>Attendance Management</span>
          </h2>
          <p className="text-gray-600 mt-1">Manage daily attendance records and bulk operations</p>
        </div>
        <div className="flex items-center space-x-3">
          {users.length === 0 && (
            <button
              onClick={() => {
                console.log('Manual load triggered');
                loadUsers(true).then(() => {
                  setTimeout(() => loadAttendanceData(true), 100);
                });
              }}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{loading ? 'Loading...' : 'Load Initial Data'}</span>
            </button>
          )}
          <button
            onClick={exportAttendanceData}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
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

      {/* Controls */}
      <div className="bg-white border border-gray-100 rounded-lg p-4">
        {/* Date Mode Toggle */}
        <div className="mb-4 flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="dateMode"
              checked={!dateRangeMode}
              onChange={() => setDateRangeMode(false)}
              className="text-black focus:ring-black"
            />
            <span className="text-sm font-medium text-black">Single Date</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="dateMode"
              checked={dateRangeMode}
              onChange={() => setDateRangeMode(true)}
              className="text-black focus:ring-black"
            />
            <span className="text-sm font-medium text-black">Date Range</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Selector(s) */}
          {!dateRangeMode ? (
            <div>
              <label className="block text-sm font-medium text-black mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            </>
          )}

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

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Filter Status</label>
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
              <option value="half_day">Half Day</option>
              <option value="early_out">Early Out</option>
            </select>
          </div>

          {/* Bulk Actions */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Bulk Action</label>
            <div className="flex space-x-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="">Select Action</option>
                <option value="mark_present">Mark Present</option>
                <option value="mark_absent">Mark Absent</option>
                <option value="mark_leave">Mark Leave</option>
                <option value="mark_half_day">Mark Half Day</option>
                <option value="mark_holiday">Mark Holiday</option>
                <option value="bulk_date_range">Bulk Date Range</option>
              </select>
              <button
                onClick={applyBulkAction}
                disabled={!bulkAction || selectedUsers.size === 0 || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-black">
            Attendance Records ({filteredAttendance.length} {dateRangeMode ? 'records' : 'users'})
            {dateRangeMode && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({startDate} to {endDate})
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              onChange={handleSelectAll}
              checked={
                filteredAttendance.length > 0 &&
                filteredAttendance.every(record => selectedUsers.has(record.username))
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
                  User
                </th>
                {dateRangeMode && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Clock In
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Clock Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Work Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAttendance.map((record, index) => (
                <tr key={dateRangeMode ? `${record.username}-${record.date}` : record.username} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(record.username)}
                      onChange={() => toggleUserSelection(record.username)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-600">
                          {(record.displayName || record.username)?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-black">
                          {record.displayName || record.username}
                        </div>
                        <div className="text-xs text-gray-500">@{record.username}</div>
                      </div>
                    </div>
                  </td>
                  {dateRangeMode && (
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {record.dateFormatted || record.date}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(record.status)}`}>
                      {getStatusIcon(record.status)}
                      <span className="capitalize">{record.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{record.clockIn || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{record.clockOut || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      {getWorkTypeIcon(record.workType)}
                      <span className="text-sm text-gray-600 capitalize">
                        {(record.workType || 'office').replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setEditingRecord({...record, recordId: record.recordId || `${record.username}-${record.date || record.dateFormatted}`})}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAttendance.length === 0 && !loading && (
                <tr>
                  <td colSpan={dateRangeMode ? "8" : "7"} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <Users className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500">
                        {users.length === 0 ? 'Loading users...' :
                         attendanceData.length === 0 ? 'Loading attendance data...' :
                         'No records match your filters'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Users: {users.length}, AttendanceData: {attendanceData.length},
                        {dateRangeMode ? ` Range: ${startDate} to ${endDate}` : ` Date: ${selectedDate}`}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={refreshData}
                          disabled={loading}
                          className="text-blue-600 text-sm hover:underline disabled:opacity-50"
                        >
                          {loading ? 'Loading...' : 'Refresh Data'}
                        </button>
                        {users.length === 0 && (
                          <button
                            onClick={() => loadUsers()}
                            disabled={loading}
                            className="text-green-600 text-sm hover:underline disabled:opacity-50"
                          >
                            Load Users
                          </button>
                        )}
                        {users.length > 0 && attendanceData.length === 0 && (
                          <button
                            onClick={() => loadAttendanceData(true)}
                            disabled={loading}
                            className="text-purple-600 text-sm hover:underline disabled:opacity-50"
                          >
                            Load Attendance
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Edit Attendance</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
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
                  <option value="half_day">Half Day</option>
                  <option value="early_out">Early Out</option>
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
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateAttendanceRecord(editingRecord.recordId || editingRecord.username, editingRecord)}
                disabled={loading}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Mark Holiday</h3>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="Enter holiday name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <p className="text-sm text-gray-600">
                This will mark {selectedDate} as a holiday for all users.
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={markHoliday}
                disabled={!holidayName.trim() || loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Marking...' : 'Mark Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Date Range Modal */}
      {showBulkDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Bulk Date Range Operation</h3>
              <button
                onClick={() => setShowBulkDateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Apply attendance action to {selectedUsers.size} selected user(s) across multiple dates.
              </p>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Start Date</label>
                <input
                  type="date"
                  value={bulkDateRange.startDate}
                  onChange={(e) => setBulkDateRange({ startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">End Date</label>
                <input
                  type="date"
                  value={bulkDateRange.endDate}
                  onChange={(e) => setBulkDateRange({ endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Action</label>
                <select
                  value={bulkDateRange.action}
                  onChange={(e) => setBulkDateRange({ action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="mark_present">Mark Present</option>
                  <option value="mark_absent">Mark Absent</option>
                  <option value="mark_leave">Mark Leave</option>
                  <option value="mark_half_day">Mark Half Day</option>
                </select>
              </div>

              <div className="text-xs text-gray-500">
                This will update attendance for {selectedUsers.size} users from {bulkDateRange.startDate} to {bulkDateRange.endDate}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBulkDateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyBulkDateRange}
                disabled={!bulkDateRange.startDate || !bulkDateRange.endDate || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Apply Bulk Operation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceAdminManagement;