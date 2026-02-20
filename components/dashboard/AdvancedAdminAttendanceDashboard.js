/**
 * Advanced Admin Attendance Dashboard - View Layer
 * Maintains exact UI and functionality from commit 73b7d93
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Download,
  Filter,
  Calendar,
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building,
  Home as HomeIcon,
  Clock,
  TrendingUp,
  PieChart,
  BarChart3,
  UserCheck,
  UserX
} from 'lucide-react';
import Button from '../ui/Button';
import { AttendanceReportService } from '../../lib/attendanceServices';
import useAdvancedAttendance from '../../hooks/useAdvancedAttendance';
import AttendanceTable from '../attendance/AttendanceTable';
import { getIndiaLocaleDateString } from '../../lib/timezoneClient';

const AdvancedAdminAttendanceDashboard = ({ currentUser }) => {
  const {
    attendanceRecords,
    allUsersData,
    stats,
    loading,
    loadingMore,
    error,
    successMessage,
    isOnline,
    alertState,
    pagination,
    filterStatus,
    filterWorkType,
    searchTerm,
    selectedUser,
    dateRange,
    markAttendance,
    updateAttendanceRecord,
    forceRefresh,
    loadMore,
    showAlert,
    closeAlert,
    setFilterStatus,
    setFilterWorkType,
    setSearchTerm,
    setSelectedUser,
    setDateRange,
    allUsers,
    setAllUsers
  } = useAdvancedAttendance('admin', currentUser);

  // Don't show anything until user is available
  if (!currentUser) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Admin Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="h-12 bg-gray-200 rounded w-12 mb-3 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Work Type Distribution Skeleton */}
        <div className="bg-white border border-gray-100 rounded-lg p-6">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white border border-gray-100 rounded-lg p-6">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse mb-1"></div>
                <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const [reportLoading, setReportLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const today = getIndiaLocaleDateString();

  // Load all users for dropdown
  useEffect(() => {
    if (allUsersData.length > 0) {
      const usersList = allUsersData.map(user => ({
        id: user.username,
        name: user.username,
        totalDays: user.totalDays || 0,
        presentDays: user.presentDays || 0,
        rate: user.attendanceRate || 0
      }));
      setAllUsers([{ id: 'all', name: 'All Users' }, ...usersList]);
    }
  }, [allUsersData, setAllUsers]);

  // Generate detailed admin report
  const generateDetailedReport = async () => {
    setReportLoading(true);
    try {
      const reportData = {
        records: attendanceRecords,
        usersSummary: allUsersData,
        stats,
        dateRange,
        filters: { status: filterStatus, workType: filterWorkType, search: searchTerm },
        generatedBy: currentUser?.username || 'Admin',
        generatedAt: new Date().toISOString(),
        isAdminReport: true
      };

      await AttendanceReportService.generateDetailedReport(reportData);
      showAlert('success', 'Success', 'Detailed admin report generated successfully!');
    } catch (error) {
      console.error('Report generation failed:', error);
      showAlert('error', 'Error', 'Failed to generate report: ' + error.message);
    } finally {
      setReportLoading(false);
    }
  };

  // Stats cards for admin
  const adminStatCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: allUsersData.length,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: null
    },
    {
      icon: UserCheck,
      label: 'Present Today',
      value: allUsersData.filter(u => u.todayStatus === 'present').length,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: null
    },
    {
      icon: UserX,
      label: 'Absent Today',
      value: allUsersData.filter(u => u.todayStatus === 'absent').length,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: null
    },
    {
      icon: TrendingUp,
      label: 'Avg Attendance',
      value: allUsersData.length > 0
        ? `${Math.round(allUsersData.reduce((sum, user) => sum + (user.attendanceRate || 0), 0) / allUsersData.length)}%`
        : '0%',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: null
    }
  ];

  // Work type breakdown
  const workTypeStats = [
    {
      icon: Building,
      label: 'Office',
      value: stats.officeDays,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: HomeIcon,
      label: 'WFH',
      value: stats.wfhDays,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center space-x-3">
            <Users className="w-6 h-6" />
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-gray-600 mt-1">{today} • {allUsersData.length} users</p>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            onClick={forceRefresh}
            disabled={loading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={generateDetailedReport}
            disabled={reportLoading || attendanceRecords.length === 0}
            className="bg-black hover:bg-gray-800 text-white flex items-center space-x-2"
          >
            <Download className={`w-4 h-4 ${reportLoading ? 'animate-spin' : ''}`} />
            <span>{reportLoading ? 'Generating...' : 'Generate Report'}</span>
          </Button>
        </div>
      </div>

      {/* Alert */}
      {(error || successMessage) && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          {error ? (
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          )}
          <div>
            <p className={`font-medium ${error ? 'text-red-800' : 'text-green-800'}`}>
              {error ? 'Error' : 'Success'}
            </p>
            <p className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>
              {error || successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Admin Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStatCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white border border-gray-100 rounded-lg p-4">
              <div className={`${stat.bgColor} rounded-lg p-3 mb-3`}>
                <IconComponent className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Work Type Breakdown */}
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
          <PieChart className="w-5 h-5" />
          <span>Work Type Distribution</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workTypeStats.map((stat, index) => {
            const IconComponent = stat.icon;
            const total = stats.officeDays + stats.wfhDays;
            const percentage = total > 0 ? Math.round((stat.value / total) * 100) : 0;

            return (
              <div key={index} className={`${stat.bgColor} rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`w-5 h-5 ${stat.color}`} />
                    <span className="font-medium text-gray-900">{stat.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{percentage}%</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${stat.color.replace('text-', 'bg-')}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Users Summary */}
      {allUsersData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Users Summary</span>
          </h3>
          <div className="grid gap-3">
            {allUsersData.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    user.todayStatus === 'present' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">{user.username}</p>
                    <p className="text-sm text-gray-600">
                      {user.presentDays || 0}/{user.totalDays || 0} days present
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{user.attendanceRate || 0}%</p>
                  <p className="text-xs text-gray-600">Attendance Rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
          <Filter className="w-5 h-5" />
          <span>Filters & Search</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Range */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {allUsers.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          {/* Work Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
            <select
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="office">Office</option>
              <option value="wfh">WFH</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by username, date, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <AttendanceTable
        records={attendanceRecords}
        userRole="admin"
        selectedUser={selectedUser}
        onUpdateAttendance={updateAttendanceRecord}
      />

      {/* Load More */}
      {pagination.hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {loadingMore ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                <span>Loading more...</span>
              </>
            ) : (
              <span>Load More Records</span>
            )}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && attendanceRecords.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No attendance records found</h3>
          <p className="text-gray-600">
            Try adjusting your filters or date range to see more results.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && attendanceRecords.length === 0 && (
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>

          {/* Admin Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="h-12 bg-gray-200 rounded w-12 mb-3 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Work Type Distribution Skeleton */}
          <div className="bg-white border border-gray-100 rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-12 animate-pulse mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white border border-gray-100 rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse mb-1"></div>
                  <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4 p-3 border border-gray-200 rounded">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAdminAttendanceDashboard;