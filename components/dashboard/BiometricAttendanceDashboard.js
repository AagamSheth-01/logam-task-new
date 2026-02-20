/**
 * Enhanced User Attendance Dashboard with Biometric Authentication
 * MVC Pattern implementation with Touch ID, Face ID, and Fingerprint support
 */

import React, { useState } from 'react';
import {
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Home,
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
  Fingerprint,
  Shield,
  Smartphone,
  Settings,
  Star,
  Zap
} from 'lucide-react';
import useAttendanceWithBiometric from '../../hooks/useAttendanceWithBiometric';
import BiometricEnrollment from '../BiometricEnrollment';
import { getIndiaDate } from '../../lib/timezoneClient';
import biometricService from '../../lib/biometricService';

const BiometricAttendanceDashboard = ({ user }) => {
  const [showFilters, setShowFilters] = useState(false);

  // Enhanced controller with biometric features
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
    clockOutLoading,
    biometricLoading,
    workType,
    locationLoading,
    locationError,
    canClockIn,
    canClockOut,
    todayStatus,

    // Regular actions
    clockIn,
    clockOut,
    fetchAttendanceRecords,
    updateSearch,
    updateFilter,
    updateViewMode,
    updateWorkType,
    clearMessages,

    // Biometric features
    biometricSupported,
    biometricEnrolled,
    biometricCapabilities,
    showBiometricEnrollment,
    quickAuthMode,
    biometricClockIn,
    biometricClockOut,
    handleBiometricEnrollment,
    handleEnrollmentSuccess,
    setShowBiometricEnrollment,
    setQuickAuthMode
  } = useAttendanceWithBiometric(user);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const today = new Date(getIndiaDate()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header with Biometric Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl lg:text-2xl font-bold text-black">My Attendance</h2>
            {biometricEnrolled && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-full">
                <Shield className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-700">Secured</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage your daily attendance
            {biometricEnrolled && ` • ${biometricService.getBiometricDisplayName(biometricCapabilities?.biometricType)} enabled`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {biometricSupported && !biometricEnrolled && (
            <button
              onClick={handleBiometricEnrollment}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              title="Enable biometric authentication"
            >
              <Fingerprint className="w-4 h-4" />
              <span>Enable Quick Access</span>
            </button>
          )}

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
          <span className="text-sm text-gray-500">{today}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button
              onClick={clearMessages}
              className="text-red-600 hover:text-red-800"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 text-sm">{success}</p>
            </div>
            <button
              onClick={clearMessages}
              className="text-green-600 hover:text-green-800"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Today's Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Status</div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(todayStatus, todayRecord?.workType)}
            <span className="font-semibold text-lg">
              {getStatusText(todayStatus, todayRecord?.workType)}
            </span>
            {todayRecord?.biometricAuth && (
              <div className="flex items-center space-x-1 px-1 py-0.5 bg-blue-100 rounded">
                <Shield className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-700">Verified</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Check-in Time</div>
          <div className="font-semibold text-lg">
            {todayRecord?.clockIn || '-'}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Hours Today</div>
          <div className="font-semibold text-lg">
            {todayRecord?.totalHours ? `${todayRecord.totalHours}h` : '-'}
          </div>
        </div>
      </div>

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

      {/* Enhanced Clock In/Out Section with Biometric */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-black">Time Tracking</h3>
          <div className="flex items-center space-x-2">
            {biometricEnrolled && (
              <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <Zap className="w-3 h-3" />
                <span>Quick Mode</span>
              </div>
            )}
            <Timer className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">Current Session</span>
          </div>
        </div>

        {/* Biometric Quick Actions - NEW! */}
        {biometricEnrolled && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-blue-100 rounded">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">Quick Actions</span>
                <span className="text-xs text-gray-500">
                  {biometricService.getBiometricDisplayName(biometricCapabilities?.biometricType)}
                </span>
              </div>
              <button
                onClick={() => setQuickAuthMode(!quickAuthMode)}
                className={`p-1 rounded transition-colors ${
                  quickAuthMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={biometricClockIn}
                disabled={!canClockIn || biometricLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] disabled:transform-none"
              >
                {biometricLoading && canClockIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Quick Clock In</span>
                    <Zap className="w-3 h-3 opacity-75" />
                  </>
                )}
              </button>

              <button
                onClick={biometricClockOut}
                disabled={!canClockOut || biometricLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] disabled:transform-none"
              >
                {biometricLoading && canClockOut ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Quick Clock Out</span>
                    <Zap className="w-3 h-3 opacity-75" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

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
              onClick={() => updateWorkType('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                workType === 'home'
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

        {/* Regular Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={clockIn}
            disabled={!canClockIn || clockInLoading}
            className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {clockInLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Clocking In...</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>Clock In</span>
              </>
            )}
          </button>

          <button
            onClick={clockOut}
            disabled={!canClockOut || clockOutLoading}
            className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {clockOutLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Clocking Out...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Clock Out</span>
              </>
            )}
          </button>
        </div>

        {/* Status message */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {todayStatus === 'not_started' && (
              <>
                Ready to start your day!
                {biometricEnrolled && (
                  <span className="text-blue-600 ml-1">Use Quick Actions for faster access.</span>
                )}
              </>
            )}
            {todayStatus === 'in_progress' && 'Currently working - don\'t forget to clock out!'}
            {todayStatus === 'completed' && 'Great job! You\'ve completed your work day.'}
          </p>
        </div>
      </div>

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
            {biometricSupported && (
              <button
                onClick={() => updateViewMode('security')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'security'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Security
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {viewMode === 'overview' && <OverviewSection monthlyStats={monthlyStats} todayRecord={todayRecord} />}
          {viewMode === 'history' && <HistorySection records={attendanceRecords} searchQuery={searchQuery} updateSearch={updateSearch} />}
          {viewMode === 'analytics' && <AnalyticsSection monthlyStats={monthlyStats} />}
          {viewMode === 'security' && biometricSupported && (
            <SecuritySection
              user={user}
              biometricEnrolled={biometricEnrolled}
              biometricCapabilities={biometricCapabilities}
              onEnrollment={handleBiometricEnrollment}
            />
          )}
        </div>
      </div>

      {/* Biometric Enrollment Modal */}
      <BiometricEnrollment
        user={user}
        isOpen={showBiometricEnrollment}
        onClose={() => setShowBiometricEnrollment(false)}
        onSuccess={handleEnrollmentSuccess}
      />
    </div>
  );
};

// Helper Components (keeping existing ones and adding new security section)
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

// Helper Functions
const getStatusIcon = (status, location) => {
  if (status === 'present') {
    return location === 'home'
      ? <Home className="w-5 h-5 text-blue-600" />
      : <CheckCircle className="w-5 h-5 text-green-600" />;
  }

  switch (status) {
    case 'absent':
      return <XCircle className="w-5 h-5 text-red-600" />;
    case 'leave':
      return <Calendar className="w-5 h-5 text-yellow-600" />;
    default:
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
  }
};

const getStatusText = (status, location) => {
  if (status === 'present') {
    return location === 'home' ? 'Work from Home' : 'Present';
  }

  switch (status) {
    case 'absent':
      return 'Absent';
    case 'leave':
      return 'On Leave';
    default:
      return 'Not Marked';
  }
};

// Reusing existing sections with minor updates
const OverviewSection = ({ monthlyStats, todayRecord }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700">Today's Status</h4>
        {todayRecord && getStatusIcon(todayRecord.status, todayRecord.location)}
      </div>
      <div className="text-lg font-semibold text-gray-900">
        {todayRecord ? getStatusText(todayRecord.status, todayRecord.location) : 'Not Marked'}
      </div>
      {todayRecord?.clockIn && (
        <p className="text-sm text-gray-600 mt-1">
          Clock In: {todayRecord.clockIn}
          {todayRecord.clockOut && ` • Clock Out: ${todayRecord.clockOut}`}
        </p>
      )}
      {todayRecord?.biometricAuth && (
        <div className="flex items-center space-x-1 mt-2 text-xs text-blue-600">
          <Shield className="w-3 h-3" />
          <span>Biometric Verified</span>
        </div>
      )}
    </div>

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

    <div className="space-y-2 max-h-96 overflow-y-auto">
      {records && records.length > 0 ? (
        records.map((record, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              {getStatusIcon(record.status, record.location)}
              <div>
                <div className="font-medium text-gray-900">{record.date}</div>
                <div className="text-sm text-gray-600">
                  {getStatusText(record.status, record.location)}
                  {record.biometricAuth && (
                    <span className="ml-2 text-blue-600">• Biometric</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              {record.clockIn && (
                <div className="text-sm text-gray-900">
                  {record.clockIn} - {record.clockOut || '--:--'}
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

// NEW Security Section
const SecuritySection = ({ user, biometricEnrolled, biometricCapabilities, onEnrollment }) => {
  const authHistory = biometricEnrolled ? biometricService.getAuthHistory(user.username, 5) : [];
  const enrollmentInfo = biometricEnrolled ? biometricService.getEnrollmentInfo(user.username) : null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Biometric Security</h3>
            <p className="text-sm text-gray-600">Secure your attendance with biometric authentication</p>
          </div>
        </div>

        {biometricEnrolled ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {biometricService.getBiometricDisplayName(biometricCapabilities?.biometricType)}
                  </div>
                  <div className="text-sm text-gray-600">Active and ready</div>
                </div>
              </div>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>

            {enrollmentInfo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex justify-between">
                    <span>Credentials:</span>
                    <span className="font-medium">{enrollmentInfo.credentialCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enrolled:</span>
                    <span className="font-medium">
                      {new Date(enrollmentInfo.latestEnrollment).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Fingerprint className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Enable biometric authentication for faster, more secure attendance tracking.</p>
              <button
                onClick={onEnrollment}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
              >
                Set Up Biometric Security
              </button>
            </div>
          </div>
        )}
      </div>

      {authHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-700 mb-4">Recent Biometric Activity</h4>
          <div className="space-y-3">
            {authHistory.map((auth, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900">{auth.action.replace('_', ' ').toUpperCase()}</div>
                    <div className="text-sm text-gray-600">{auth.time} • {auth.date}</div>
                  </div>
                </div>
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  {biometricService.getBiometricDisplayName(auth.biometricType)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BiometricAttendanceDashboard;