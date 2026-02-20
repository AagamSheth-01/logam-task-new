/**
 * Reports Dashboard Component - View Layer
 * MVC Pattern implementation with consistent UI/UX design
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  Flag,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Calendar
} from 'lucide-react';
import Button from '../ui/Button';
import useReports from '../../hooks/useReports';

const ReportsDashboard = ({ user }) => {
  // Early return if no user to prevent hook issues
  if (!user?.username) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Please log in to view reports</p>
        </div>
      </div>
    );
  }

  // Controller layer - handles all business logic
  const {
    summary,
    priorityDistribution,
    recentActivity,
    timeAnalytics,
    loading,
    generating,
    error,
    generateReport,
    refresh
  } = useReports(user);

  const [refreshing, setRefreshing] = useState(false);

  // UI handlers
  const handleGenerateReport = async () => {
    try {
      await generateReport();
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Priority color helper
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading && !summary.total) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header - Consistent with other dashboards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-black">My Reports</h2>
          <p className="text-sm text-gray-600 mt-1">Generate and view your task analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Report Generation Section */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <div>
          <h3 className="text-base lg:text-lg font-semibold text-black mb-4 flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Personal Task Report</span>
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            Generate a comprehensive report of your tasks including completion statistics and detailed task information.
          </p>
          <Button
            onClick={handleGenerateReport}
            disabled={generating}
            className="bg-black hover:bg-gray-800 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{generating ? 'Generating...' : 'Generate Report'}</span>
          </Button>
        </div>
      </div>

      {/* Performance Summary Section */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <h3 className="text-base lg:text-lg font-semibold text-black mb-4 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Performance Summary</span>
        </h3>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-100 p-3 lg:p-4 rounded-lg text-center">
            <div className="text-xl lg:text-2xl font-bold text-black">{summary.total}</div>
            <div className="text-xs lg:text-sm text-gray-500">Total Tasks</div>
          </div>
          <div className="bg-green-50 border border-green-100 p-3 lg:p-4 rounded-lg text-center">
            <div className="text-xl lg:text-2xl font-bold text-green-600">{summary.completed}</div>
            <div className="text-xs lg:text-sm text-gray-500">Completed</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-3 lg:p-4 rounded-lg text-center">
            <div className="text-xl lg:text-2xl font-bold text-amber-600">{summary.pending}</div>
            <div className="text-xs lg:text-sm text-gray-500">Pending</div>
          </div>
          <div className="bg-red-50 border border-red-100 p-3 lg:p-4 rounded-lg text-center">
            <div className="text-xl lg:text-2xl font-bold text-red-600">{summary.overdue}</div>
            <div className="text-xs lg:text-sm text-gray-500">Overdue</div>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-blue-800">Overall Completion Rate</h4>
              <p className="text-sm text-blue-600">
                {summary.total > 0
                  ? `${summary.completionRate}% of your tasks are completed`
                  : 'No tasks to analyze yet'
                }
              </p>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-blue-600 flex-shrink-0 ml-4">
              {summary.completionRate}%
            </div>
          </div>
          {summary.total > 0 && (
            <div className="mt-3">
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${summary.completionRate}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Distribution by Priority */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <h4 className="font-semibold text-black mb-4 flex items-center space-x-2">
          <PieChart className="w-5 h-5" />
          <span>Task Distribution by Priority</span>
        </h4>
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          {priorityDistribution.map(({ priority, count, percentage }) => (
            <div key={priority} className="text-center p-3 border border-gray-100 rounded-lg">
              <div className={`text-base lg:text-lg font-bold ${getPriorityColor(priority)}`}>
                {count}
              </div>
              <div className="text-xs text-gray-500">{priority} Priority</div>
              <div className="text-xs text-gray-400">({percentage}%)</div>
            </div>
          ))}
        </div>
      </div>

      {/* Time-Based Analytics */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <h4 className="font-semibold text-black mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Time-Based Analytics</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{timeAnalytics.thisWeek.total}</div>
              <div className="text-sm text-gray-600">This Week</div>
              <div className="text-xs text-purple-600 mt-1">
                {timeAnalytics.thisWeek.completed} completed
              </div>
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <div className="text-center">
              <div className="text-lg font-bold text-indigo-600">{timeAnalytics.thisMonth.total}</div>
              <div className="text-sm text-gray-600">This Month</div>
              <div className="text-xs text-indigo-600 mt-1">
                {timeAnalytics.thisMonth.completed} completed
              </div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-600">{timeAnalytics.lastMonth.total}</div>
              <div className="text-sm text-gray-600">Last Month</div>
              <div className="text-xs text-gray-600 mt-1">
                {timeAnalytics.lastMonth.completed} completed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <h4 className="font-semibold text-black mb-4 flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>Recent Completed Tasks</span>
        </h4>
        <div className="space-y-2">
          {recentActivity.length > 0 ? (
            recentActivity.map((task, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-green-800 break-words">{task.task}</span>
                  {task.completedDate && (
                    <span className="text-xs text-green-600 ml-2">
                      Completed on {new Date(task.completedDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              No completed tasks yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
    {/* Header Skeleton */}
    <div className="flex justify-between items-center">
      <div>
        <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded w-24"></div>
    </div>

    {/* Cards Skeleton */}
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded w-full"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4"></div>
        </div>
      </div>
    ))}
  </div>
);

export default ReportsDashboard;