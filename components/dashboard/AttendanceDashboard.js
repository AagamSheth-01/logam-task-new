/**
 * Attendance Dashboard Component - View Layer
 * MVC Pattern implementation with modern shadcn-style UI
 * Matches the design pattern of other dashboard components
 */

import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Home,
  Building,
  MapPin,
  RefreshCw,
  Download,
  Filter,
  Search,
  MoreHorizontal,
  TrendingUp,
  Timer,
  BarChart3,
  Eye,
  Users,
  Star,
  Plus
} from 'lucide-react';
import Button from '../ui/Button';
import useAttendanceDashboard from '../../hooks/useAttendanceDashboard';

const AttendanceDashboard = ({ user }) => {
  // Early return if no user to prevent hook issues
  if (!user?.username) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Please log in to view your attendance</p>
        </div>
      </div>
    );
  }

  // Controller layer - handles all business logic
  const {
    todayRecord,
    attendanceRecords,
    monthlyStats,
    loading,
    error,
    clockInLoading,
    clockOutLoading,
    canClockIn,
    canClockOut,
    workStatus,
    clockIn,
    clockOut,
    refresh,
    exportAttendance
  } = useAttendanceDashboard(user);

  // Local UI state
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'history', 'analytics'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  if (loading && !attendanceRecords?.length) {
    return <ModernLoadingSkeleton />;
  }

  // Debug information (remove in production)
  console.log('AttendanceDashboard debug:', {
    todayRecord,
    workStatus,
    canClockIn,
    canClockOut,
    error,
    attendanceRecordsCount: attendanceRecords?.length || 0
  });

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">Error</span>
          </div>
          <p className="text-red-600 mt-1 text-sm">{error}</p>
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Header - Consistent with other dashboards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">My Attendance</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track your daily attendance and view records
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={() => exportAttendance('json')}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Today</span>
            </div>
            {todayRecord && <StatusBadge status={workStatus} />}
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold text-gray-900">
              {todayRecord ? getStatusText(workStatus) : 'Not Marked'}
            </div>
            {todayRecord && (
              <div className="text-xs text-gray-500">
                {todayRecord.clockIn && `In: ${todayRecord.clockIn}`}
                {todayRecord.clockOut && ` • Out: ${todayRecord.clockOut}`}
              </div>
            )}
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">This Month</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold text-gray-900">
              {monthlyStats ? `${monthlyStats.present}/${monthlyStats.totalDays}` : '0/0'}
            </div>
            <div className="text-xs text-gray-500">
              {monthlyStats ? `${monthlyStats.attendanceRate}% Attendance` : '0% Attendance'}
            </div>
          </div>
        </div>

        {/* Work Hours */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Timer className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Hours</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold text-gray-900">
              {monthlyStats?.averageHours || '0:00'}
            </div>
            <div className="text-xs text-gray-500">
              Total: {monthlyStats?.totalHours || '0:00'}
            </div>
          </div>
        </div>

        {/* Work Pattern */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Pattern</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold text-gray-900">
              {monthlyStats ? `${monthlyStats.office || 0}O / ${monthlyStats.wfh || 0}H` : '0O / 0H'}
            </div>
            <div className="text-xs text-gray-500">Office / Home</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(canClockIn || canClockOut) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {canClockIn && (
              <ClockInButton
                onClockIn={clockIn}
                loading={clockInLoading}
                disabled={clockInLoading || clockOutLoading}
              />
            )}
            {canClockOut && (
              <Button
                onClick={clockOut}
                disabled={clockOutLoading || clockInLoading}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700"
              >
                {clockOutLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>Clock Out</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <div className="flex space-x-0">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'history', label: 'History', icon: Calendar },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {viewMode === 'overview' && (
            <OverviewSection
              monthlyStats={monthlyStats}
              todayRecord={todayRecord}
              attendanceRecords={attendanceRecords}
            />
          )}
          {viewMode === 'history' && (
            <HistorySection
              records={attendanceRecords}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}
          {viewMode === 'analytics' && (
            <AnalyticsSection
              monthlyStats={monthlyStats}
              attendanceRecords={attendanceRecords}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Clock In Button Component with Work Type Selection
const ClockInButton = ({ onClockIn, loading, disabled }) => {
  const [showWorkTypeModal, setShowWorkTypeModal] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState('office');
  const [notes, setNotes] = useState('');

  const handleClockIn = async () => {
    await onClockIn(selectedWorkType, notes);
    setShowWorkTypeModal(false);
    setNotes('');
  };

  if (showWorkTypeModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Clock In</h3>
            <button
              onClick={() => setShowWorkTypeModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedWorkType('office')}
                  className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                    selectedWorkType === 'office'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>Office</span>
                </button>
                <button
                  onClick={() => setSelectedWorkType('wfh')}
                  className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                    selectedWorkType === 'wfh'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>WFH</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowWorkTypeModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleClockIn}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Clock In'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setShowWorkTypeModal(true)}
      disabled={disabled}
      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
    >
      <CheckCircle className="w-4 h-4" />
      <span>Clock In</span>
    </Button>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    not_started: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Not Started' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Working' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complete' }
  };

  const config = statusConfig[status] || statusConfig.not_started;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// Helper function
const getStatusText = (status) => {
  const statusText = {
    not_started: 'Not Started',
    in_progress: 'Working',
    completed: 'Completed'
  };
  return statusText[status] || 'Unknown';
};

// Overview Section Component
const OverviewSection = ({ monthlyStats, todayRecord, attendanceRecords }) => (
  <div className="space-y-6">
    {/* Recent Activity */}
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {attendanceRecords?.slice(0, 5).map((record, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {record.status === 'present' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">{record.date}</div>
                <div className="text-sm text-gray-500">
                  {record.workType === 'wfh' ? 'Work from Home' : 'Office'}
                  {record.clockIn && ` • ${record.clockIn}`}
                  {record.clockOut && ` - ${record.clockOut}`}
                </div>
              </div>
            </div>
            <div className="text-right">
              {record.totalHours && (
                <div className="text-sm font-medium text-gray-900">{record.totalHours}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// History Section Component
const HistorySection = ({ records, searchQuery, onSearchChange }) => (
  <div className="space-y-4">
    {/* Search */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by date or status..."
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    {/* Records List */}
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {records && records.length > 0 ? (
        records
          .filter(record =>
            searchQuery === '' ||
            record.date?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.status?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((record, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-3">
                {record.status === 'present' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <div className="font-medium text-gray-900">{record.date}</div>
                  <div className="text-sm text-gray-600">
                    {record.status === 'present' ? 'Present' : 'Absent'}
                    {record.workType && ` • ${record.workType === 'wfh' ? 'WFH' : 'Office'}`}
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

// Analytics Section Component
const AnalyticsSection = ({ monthlyStats, attendanceRecords }) => (
  <div className="space-y-6">
    {/* Stats Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-4 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">{monthlyStats?.present || 0}</div>
        <div className="text-sm text-gray-600">Present Days</div>
      </div>
      <div className="text-center p-4 bg-red-50 rounded-lg">
        <div className="text-2xl font-bold text-red-600">{monthlyStats?.absent || 0}</div>
        <div className="text-sm text-gray-600">Absent Days</div>
      </div>
      <div className="text-center p-4 bg-yellow-50 rounded-lg">
        <div className="text-2xl font-bold text-yellow-600">{monthlyStats?.halfDay || 0}</div>
        <div className="text-sm text-gray-600">Half Days</div>
      </div>
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">{monthlyStats?.attendanceRate || 0}%</div>
        <div className="text-sm text-gray-600">Attendance Rate</div>
      </div>
    </div>

    {/* Work Pattern Analysis */}
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium text-gray-700 mb-3">Work Pattern Analysis</h4>
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

// Loading Skeleton Component
const ModernLoadingSkeleton = () => (
  <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
    <div className="animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 bg-gray-200 rounded w-20"></div>
          <div className="h-9 bg-gray-200 rounded w-20"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-20 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default AttendanceDashboard;