/**
 * Advanced User Attendance Dashboard - View Layer
 * MVC implementation maintaining exact UI and functionality from commit 73b7d93
 */

import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  BarChart3,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import Button from '../ui/Button';
import CustomAlert from '../ui/CustomAlert';
import TodayAttendanceCard from '../attendance/TodayAttendanceCard';
import AttendanceTable from '../attendance/AttendanceTable';
import useAdvancedAttendance from '../../hooks/useAdvancedAttendance';
import { getIndiaLocaleDateString, getIndiaLocaleTimeString } from '../../lib/timezoneClient';

const AdvancedUserAttendanceDashboard = ({ user }) => {
  const [showFilters, setShowFilters] = useState(false);

  const {
    // Data
    attendanceRecords,
    todayRecord,
    stats,

    // State
    loading,
    clockOutLoading,
    error,
    successMessage,
    isOnline,
    alertState,

    // Filters
    filterStatus,
    filterWorkType,
    searchTerm,
    dateRange,

    // Actions
    markAttendance,
    clockOut,
    forceRefresh,
    showAlert,
    closeAlert,

    // Setters
    setFilterStatus,
    setFilterWorkType,
    setSearchTerm,
    setDateRange
  } = useAdvancedAttendance('user', user);

  // Don't show anything until user is available
  if (!user) {
    return (
      <div className="space-y-4 lg:space-y-6">
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

        {/* Today's Attendance Card Skeleton */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="h-5 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded w-full animate-pulse"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="h-12 bg-gray-200 rounded w-12 mb-3 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Generate Report (maintaining exact functionality from 73b7d93)
  const generateReport = () => {
    const filteredRecords = attendanceRecords;

    const calculateAdvancedStats = (records) => {
      const presentRecords = records.filter(r => r.status === 'present');

      // Calculate longest absent streak
      let currentStreak = 0;
      let maxStreak = 0;
      const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));

      sortedRecords.forEach(r => {
        if (r.status === 'absent') {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      return {
        maxAbsentStreak: maxStreak,
        perfectAttendance: stats.absentDays === 0 && stats.totalDays > 0
      };
    };

    const advancedStats = calculateAdvancedStats(filteredRecords);

    const reportData = {
      generated_on: getIndiaLocaleDateString(),
      generated_time: getIndiaLocaleTimeString(),
      user: user?.username,
      date_range: `${dateRange.start} to ${dateRange.end}`,
      stats,
      advancedStats,
      records: filteredRecords
    };

    const reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Report - ${reportData.generated_on}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #000;
            line-height: 1.5;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border: 2px solid #000;
        }

        .header {
            background: #000;
            color: white;
            padding: 20px 30px;
            text-align: center;
            border-bottom: 3px solid #000;
        }

        .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .header p {
            font-size: 12px;
            margin: 3px 0;
        }

        .content {
            padding: 25px 30px;
        }

        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 15px 0;
            page-break-inside: avoid;
        }

        .stat-card {
            border: 2px solid #000;
            padding: 12px;
            text-align: center;
            background: white;
        }

        .stat-number {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 3px;
            color: #000;
        }

        .stat-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .stat-detail {
            font-size: 9px;
            margin-top: 2px;
            color: #333;
        }

        .attendance-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10px;
            page-break-inside: auto;
        }

        .attendance-table th,
        .attendance-table td {
            padding: 8px 6px;
            text-align: left;
            border: 1px solid #000;
        }

        .attendance-table th {
            background: #000;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.3px;
        }

        .attendance-table tbody tr:nth-child(even) {
            background: #f5f5f5;
        }

        .status-badge {
            padding: 2px 6px;
            border: 1px solid #000;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            display: inline-block;
        }

        .status-present {
            background: white;
        }

        .footer {
            text-align: center;
            padding: 20px;
            background: #000;
            color: white;
            border-top: 2px solid #000;
            font-size: 9px;
        }

        .footer p {
            margin: 3px 0;
        }

        @media print {
            body { padding: 0; background: white; }
            .container { border: none; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Attendance Report</h1>
            <p>Generated for: ${reportData.user}</p>
            <p>Period: ${reportData.date_range}</p>
            <p>Generated on: ${reportData.generated_on} at ${reportData.generated_time}</p>
        </div>

        <div class="content">
            <div class="section-title">Key Metrics</div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.attendanceRate}%</div>
                    <div class="stat-label">Attendance Rate</div>
                    <div class="stat-detail">${reportData.stats.presentDays}/${reportData.stats.totalDays} days</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.presentDays}</div>
                    <div class="stat-label">Present Days</div>
                    <div class="stat-detail">Total present</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.absentDays}</div>
                    <div class="stat-label">Absent Days</div>
                    <div class="stat-detail">Total absent</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.wfhDays}</div>
                    <div class="stat-label">WFH Days</div>
                    <div class="stat-detail">Work from home</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.officeDays}</div>
                    <div class="stat-label">Office Days</div>
                    <div class="stat-detail">Working from office</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.advancedStats.maxAbsentStreak}</div>
                    <div class="stat-label">Max Absent Streak</div>
                    <div class="stat-detail">Consecutive days</div>
                </div>
            </div>

            <div class="section-title">Detailed Attendance Records</div>
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Work Type</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Total Hours</th>
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.records.map(record => `
                        <tr>
                            <td>${record.date}</td>
                            <td>
                                <span class="status-badge ${record.status === 'present' ? 'status-present' : 'status-absent'}">
                                    ${record.status === 'present' ? 'Present' : 'Absent'}
                                </span>
                            </td>
                            <td>${record.workType ? (record.workType === 'office' ? 'Office' : 'WFH') : 'N/A'}</td>
                            <td>${record.checkIn || 'N/A'}</td>
                            <td>${record.checkOut || 'N/A'}</td>
                            <td>${record.totalHours || 'N/A'}</td>
                            <td>${record.location && record.location.address ?
                                `${record.location.address.city || 'Unknown'}` :
                                'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Report generated by Logam Academy Task Manager</p>
            <p>This is a computer-generated document. No signature is required.</p>
            <p>For any queries, please contact the administrator.</p>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAlert('success', 'Report Generated', 'Your attendance report has been downloaded successfully!');
  };

  if (loading && !todayRecord && attendanceRecords.length === 0) {
    return (
      <div className="space-y-4 lg:space-y-6">
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

        {/* Today's Attendance Card Skeleton */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="h-5 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded w-full animate-pulse"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="h-12 bg-gray-200 rounded w-12 mb-3 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          ))}
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
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Connection Status */}
      {!isOnline && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-3">
          <WifiOff className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-amber-800 font-medium">You're offline</p>
            <p className="text-amber-700 text-sm">Your attendance will be saved locally and synced when you're back online.</p>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Today's Attendance */}
      <TodayAttendanceCard
        todayRecord={todayRecord}
        onMarkAttendance={markAttendance}
        onClockOut={clockOut}
        clockOutLoading={clockOutLoading}
        currentUser={user}
      />

      {/* Controls */}
      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </Button>

            <Button
              variant="outline"
              onClick={forceRefresh}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          <Button
            onClick={generateReport}
            className="bg-black hover:bg-gray-800 text-white flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Generate Report</span>
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                <select
                  value={filterWorkType}
                  onChange={(e) => setFilterWorkType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="office">Office</option>
                  <option value="wfh">Work From Home</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by date, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.presentDays}</div>
          <div className="text-sm text-gray-600">Present</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.absentDays}</div>
          <div className="text-sm text-gray-600">Absent</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.officeDays}</div>
          <div className="text-sm text-gray-600">Office</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.wfhDays}</div>
          <div className="text-sm text-gray-600">WFH</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.attendanceRate}%</div>
          <div className="text-sm text-gray-600">Rate</div>
        </div>
      </div>

      {/* Attendance Table */}
      <AttendanceTable
        records={attendanceRecords}
        userRole="user"
        selectedUser={user?.username}
      />

      {/* Custom Alert */}
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
      />
    </div>
  );
};

export default AdvancedUserAttendanceDashboard;