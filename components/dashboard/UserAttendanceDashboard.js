/**
 * Enhanced User Attendance Dashboard Component
 * MVC Pattern implementation with comprehensive attendance management
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Home,
  Home as HomeIcon,
  Building,
  TrendingUp,
  Calendar,
  AlertCircle,
  MapPin,
  Filter,
  Search,
  BarChart3,
  Timer,
  Navigation,
  ChevronLeft,
  ChevronRight,
  History
} from 'lucide-react';
import useAttendance from '../../hooks/useAttendance';
import { getIndiaDate } from '../../lib/timezoneClient';

const UserAttendanceDashboard = ({ user }) => {
  const [showFilters, setShowFilters] = useState(false);

  // Additional state for history functionality
  const [attendanceViewMode, setAttendanceViewMode] = useState('today'); // 'today' or 'history'
  const [selectedDate, setSelectedDate] = useState(getIndiaDate());

  // Controller layer - handles all business logic
  const {
    todayRecord,
    monthlyStats,
    attendanceRecords,
    loading,
    error,
    success,
    viewMode,
    searchQuery,
    filterStatus,
    clockInLoading,
    workType,
    locationLoading,
    locationError,
    canMarkAttendance,
    todayStatus,
    markAttendance,
    fetchAttendanceRecords,
    updateSearch,
    updateFilter,
    updateViewMode,
    updateWorkType,
    clearMessages
  } = useAttendance(user);

  // Date navigation helpers
  const navigateDate = useCallback((direction) => {
    const current = new Date(selectedDate);
    if (direction === 'prev') {
      current.setDate(current.getDate() - 1);
    } else if (direction === 'next') {
      current.setDate(current.getDate() + 1);
    }
    setSelectedDate(current.toISOString().split('T')[0]);
  }, [selectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(getIndiaDate());
  }, []);

  const isToday = selectedDate === getIndiaDate();

  // Get attendance record for selected date
  const selectedDateRecord = useMemo(() => {
    if (attendanceViewMode === 'today') {
      return todayRecord;
    }
    return attendanceRecords.find(record =>
      record.date === selectedDate && !record.isGenerated
    );
  }, [attendanceRecords, selectedDate, attendanceViewMode, todayRecord]);

  // Filter attendance records for history view
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record =>
      record.date === selectedDate || attendanceViewMode === 'today'
    );
  }, [attendanceRecords, selectedDate, attendanceViewMode]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Use India timezone for today's date display
  const today = new Date(getIndiaDate()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Enhanced Header with Date Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-black">My Attendance</h2>
            <p className="text-sm text-gray-600 mt-1">Track and manage your daily attendance</p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setAttendanceViewMode('today')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  attendanceViewMode === 'today'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setAttendanceViewMode('history')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  attendanceViewMode === 'history'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <History className="w-4 h-4 mr-1" />
                History
              </button>
            </div>
          </div>
        </div>

        {/* Date Navigation - Show in history mode */}
        {attendanceViewMode === 'history' && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Previous day"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg min-w-64">
                <Calendar className="w-4 h-4 text-gray-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-medium"
                />
              </div>

              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Next day"
                disabled={isToday}
              >
                <ChevronRight className={`w-5 h-5 ${isToday ? 'text-gray-300' : ''}`} />
              </button>

              {!isToday && (
                <button
                  onClick={goToToday}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Today
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAttendanceRecords}
                disabled={loading}
                className={`p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 ${
                  loading ? 'animate-spin' : ''
                }`}
                title="Refresh attendance data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Selected Date Display - Show in history mode */}
        {attendanceViewMode === 'history' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-lg font-semibold text-gray-900">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              {isToday && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Today
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {selectedDateRecord ? 'Attendance record found' : 'No attendance record'}
            </p>
          </div>
        )}

        {/* Today mode - Simple header */}
        {attendanceViewMode === 'today' && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">{today}</span>
            <button
              onClick={fetchAttendanceRecords}
              disabled={loading}
              className={`p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 ${
                loading ? 'animate-spin' : ''
              }`}
              title="Refresh attendance data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Conditional Display based on view mode */}
      {attendanceViewMode === 'today' ? (
        /* Today's Status */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(todayStatus, todayRecord?.workType || workType)}
              <span className="font-semibold text-lg">
                {getStatusText(todayStatus, todayRecord?.workType || workType)}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Check-in Time</div>
            <div className="font-semibold text-lg">
              {todayRecord?.checkIn || todayRecord?.clockIn || '-'}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Work Type</div>
            <div className="font-semibold text-lg flex items-center space-x-2">
              {todayRecord?.workType ? (
                <>
                  {todayRecord.workType === 'wfh' ? <HomeIcon className="w-5 h-5 text-blue-600" /> : <Building className="w-5 h-5 text-green-600" />}
                  <span>{todayRecord.workType === 'wfh' ? 'Work from Home' : 'Office'}</span>
                </>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* History View - Simple List View */
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Attendance History
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              View past attendance records
            </p>
          </div>

          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by date or status..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="sm:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Records List */}
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {attendanceRecords.filter(record => {
              // Filter by search
              if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                if (!record.date.includes(query) && !record.status.toLowerCase().includes(query)) {
                  return false;
                }
              }

              // Filter by status
              if (filterStatus !== 'all' && record.status !== filterStatus) {
                return false;
              }

              // Exclude generated records
              return !record.isGenerated;
            }).length > 0 ? (
              attendanceRecords.filter(record => {
                // Apply the same filters as above
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase();
                  if (!record.date.includes(query) && !record.status.toLowerCase().includes(query)) {
                    return false;
                  }
                }

                if (filterStatus !== 'all' && record.status !== filterStatus) {
                  return false;
                }

                return !record.isGenerated;
              }).map((record, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(record.status, record.workType)}
                      <div>
                        <div className="font-medium text-gray-900">{record.date}</div>
                        <div className="text-sm text-gray-600">
                          {getStatusText(record.status, record.workType)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.status === 'present' && (record.clockIn || record.checkIn) && (
                        <div className="text-sm text-gray-900">
                          {record.clockIn || record.checkIn} - {record.clockOut || record.checkOut || '--:--'}
                        </div>
                      )}
                      {record.totalHours && (
                        <div className="text-xs text-gray-500">{record.totalHours}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">
                  No attendance records found
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly Stats */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-blue-800">This Month's Attendance</h4>
            <p className="text-sm text-blue-600 mt-1">
              {monthlyStats?.presentDays || 0} present days out of {monthlyStats?.totalDays || 0} working days
            </p>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-blue-600 flex-shrink-0 ml-4">
            {Math.round(monthlyStats?.attendanceRate || 0)}%
          </div>
        </div>
        {monthlyStats?.totalDays > 0 && (
          <div className="mt-3">
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(monthlyStats?.attendanceRate || 0)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Clock In/Out Section - Only show in today mode */}
      {attendanceViewMode === 'today' && (
        <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-black">Time Tracking</h3>
          <div className="flex items-center space-x-2">
            <Timer className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">Current Session</span>
          </div>
        </div>

        {/* Work Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
          <div className="flex space-x-3">
            <button
              onClick={() => updateWorkType('office')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                workType === 'office'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Building className="w-4 h-4 inline mr-1" />
              Office
            </button>
            <button
              onClick={() => updateWorkType('wfh')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                workType === 'wfh'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Home className="w-4 h-4 inline mr-1" />
              Work from Home
            </button>
          </div>
        </div>

        {/* Location Info */}
        {locationLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-sm text-blue-700">Getting your location...</span>
            </div>
          </div>
        )}

        {locationError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">{locationError}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex space-x-3">
          {canMarkAttendance ? (
            <button
              onClick={markAttendance}
              disabled={clockInLoading}
              className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {clockInLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Marking Attendance...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Attendance ({workType.toUpperCase()})</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center space-x-2 bg-gray-100 text-gray-600 py-3 px-4 rounded-lg font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Attendance {todayStatus === 'marked_present' ? 'Marked' : 'Already Recorded'}</span>
            </div>
          )}
        </div>

        {/* Status message */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {todayStatus === 'not_started' && 'Ready to start your day!'}
            {todayStatus === 'in_progress' && 'Currently working - don\'t forget to clock out!'}
            {todayStatus === 'completed' && 'Great job! You\'ve completed your work day.'}
          </p>
        </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="bg-white border border-gray-100 rounded-lg">
        <div className="border-b border-gray-100 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateViewMode('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'overview'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => updateViewMode('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              History
            </button>
            <button
              onClick={() => updateViewMode('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'analytics'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        <div className="p-4">
          {viewMode === 'overview' && <OverviewSection monthlyStats={monthlyStats} todayRecord={todayRecord} />}
          {viewMode === 'history' && <HistorySection records={attendanceRecords} searchQuery={searchQuery} updateSearch={updateSearch} />}
          {viewMode === 'analytics' && <AnalyticsSection monthlyStats={monthlyStats} />}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const LoadingSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
      <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div className="h-5 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

const ErrorDisplay = ({ error, onRetry }) => (
  <div className="bg-white border border-red-200 rounded-lg p-6">
    <div className="flex items-center space-x-2 text-red-600 mb-4">
      <AlertCircle className="w-5 h-5" />
      <span className="font-medium">Failed to load attendance data</span>
    </div>
    <p className="text-gray-600 mb-4">{error}</p>
    <button
      onClick={onRetry}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
    >
      Try Again
    </button>
  </div>
);

// Helper Functions
const getStatusIcon = (status, workType) => {
  switch (status) {
    case 'marked_present':
    case 'present':
      return workType === 'wfh'
        ? <Home className="w-5 h-5 text-blue-600" />
        : <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'absent':
      return <XCircle className="w-5 h-5 text-red-600" />;
    case 'on_leave':
    case 'leave':
      return <Calendar className="w-5 h-5 text-yellow-600" />;
    case 'not_marked':
    default:
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
  }
};

const getStatusText = (status, workType) => {
  switch (status) {
    case 'marked_present':
    case 'present':
      return workType === 'wfh' ? 'Work from Home' : 'Present';
    case 'absent':
      return 'Absent';
    case 'on_leave':
    case 'leave':
      return 'On Leave';
    case 'not_marked':
    default:
      return 'Not Marked';
  }
};

// Missing Section Components
const OverviewSection = ({ monthlyStats, todayRecord }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* Today's Status Card */}
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700">Today's Status</h4>
        {todayRecord && getStatusIcon(todayRecord.status, todayRecord.workType)}
      </div>
      <div className="text-lg font-semibold text-gray-900">
        {todayRecord ? getStatusText(todayRecord.status, todayRecord.workType) : 'Not Marked'}
      </div>
      {(todayRecord?.checkIn || todayRecord?.clockIn) && (
        <p className="text-sm text-gray-600 mt-1">
          Check In: {todayRecord.checkIn || todayRecord.clockIn}
          {(todayRecord?.checkOut || todayRecord?.clockOut) && ` • Check Out: ${todayRecord.checkOut || todayRecord.clockOut}`}
        </p>
      )}
    </div>

    {/* Monthly Presence Card */}
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700">This Month</h4>
        <CheckCircle className="w-5 h-5 text-green-600" />
      </div>
      <div className="text-lg font-semibold text-gray-900">
        {monthlyStats ? `${monthlyStats.present}/${monthlyStats.totalDays} Days` : '0/0 Days'}
      </div>
      {monthlyStats && (
        <p className="text-sm text-gray-600 mt-1">
          {monthlyStats.attendanceRate}% Attendance
        </p>
      )}
    </div>

    {/* Average Hours Card */}
    <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700">Avg. Hours</h4>
        <Clock className="w-5 h-5 text-purple-600" />
      </div>
      <div className="text-lg font-semibold text-gray-900">
        {monthlyStats?.averageHours || '0:00'}
      </div>
      {monthlyStats && (
        <p className="text-sm text-gray-600 mt-1">
          Total: {monthlyStats.totalHours || '0:00'}
        </p>
      )}
    </div>
  </div>
);

const HistorySection = ({ records, searchQuery, updateSearch }) => (
  <div className="space-y-4">
    {/* Search Bar */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => updateSearch(e.target.value)}
        placeholder="Search by date or status..."
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    {/* Records List */}
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {records && records.length > 0 ? (
        records.map((record, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              {getStatusIcon(record.status, record.workType)}
              <div>
                <div className="font-medium text-gray-900">{record.date}</div>
                <div className="text-sm text-gray-600">
                  {getStatusText(record.status, record.workType)}
                </div>
              </div>
            </div>
            <div className="text-right">
              {(record.checkIn || record.clockIn) && (
                <div className="text-sm text-gray-900">
                  {record.checkIn || record.clockIn} - {record.checkOut || record.clockOut || '--:--'}
                </div>
              )}
              {record.totalHours && (
                <div className="text-xs text-gray-500">{record.totalHours}</div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          No attendance records found
        </div>
      )}
    </div>
  </div>
);

const AnalyticsSection = ({ monthlyStats }) => (
  <div className="space-y-4">
    {/* Stats Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-3 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">{monthlyStats?.present || 0}</div>
        <div className="text-sm text-gray-600">Present Days</div>
      </div>
      <div className="text-center p-3 bg-red-50 rounded-lg">
        <div className="text-2xl font-bold text-red-600">{monthlyStats?.absent || 0}</div>
        <div className="text-sm text-gray-600">Absent Days</div>
      </div>
      <div className="text-center p-3 bg-yellow-50 rounded-lg">
        <div className="text-2xl font-bold text-yellow-600">{monthlyStats?.halfDay || 0}</div>
        <div className="text-sm text-gray-600">Half Days</div>
      </div>
      <div className="text-center p-3 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">
          {monthlyStats?.attendanceRate || 0}%
        </div>
        <div className="text-sm text-gray-600">Attendance Rate</div>
      </div>
    </div>

    {/* Additional Analytics */}
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium text-gray-700 mb-3">Work Pattern</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-600">Office Days</label>
          <div className="text-lg font-semibold">{monthlyStats?.office || 0}</div>
        </div>
        <div>
          <label className="text-sm text-gray-600">Work From Home</label>
          <div className="text-lg font-semibold">{monthlyStats?.wfh || 0}</div>
        </div>
      </div>
    </div>
  </div>
);

export default UserAttendanceDashboard;