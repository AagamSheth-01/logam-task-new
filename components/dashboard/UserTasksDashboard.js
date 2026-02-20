/**
 * User Tasks Dashboard Component
 * MVC Pattern implementation for user task management
 */

import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
  Flag,
  RefreshCw
} from 'lucide-react';
import useUserDashboardStore from '../../hooks/useUserDashboard';

const UserTasksDashboard = ({ user }) => {
  const {
    dashboardData,
    loading,
    error,
    fetchUserDashboard
  } = useUserDashboardStore();

  useEffect(() => {
    if (user?.username && !dashboardData) {
      fetchUserDashboard();
    }
  }, [user?.username, fetchUserDashboard, dashboardData]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  const tasks = dashboardData?.tasks;
  const summary = tasks?.summary || { total: 0, completed: 0, pending: 0, overdue: 0 };
  const upcomingTasks = tasks?.upcoming || [];
  const recentActivity = tasks?.recentActivity || [];

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl lg:text-2xl font-bold text-black">Dashboard</h2>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchUserDashboard}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Task Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Tasks"
          value={summary.total}
          icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
          bgColor="bg-blue-50"
          textColor="text-blue-600"
        />

        <SummaryCard
          title="Completed"
          value={summary.completed}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          bgColor="bg-green-50"
          textColor="text-green-600"
        />

        <SummaryCard
          title="Pending"
          value={summary.pending}
          icon={<Clock className="w-5 h-5 text-yellow-600" />}
          bgColor="bg-yellow-50"
          textColor="text-yellow-600"
        />

        <SummaryCard
          title="Overdue"
          value={summary.overdue}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          bgColor="bg-red-50"
          textColor="text-red-600"
        />
      </div>

      {/* Performance Metrics */}
      {summary.total > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Performance</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              label="Completion Rate"
              value={`${Math.round((summary.completed / summary.total) * 100)}%`}
              description={`${summary.completed} of ${summary.total} tasks completed`}
            />

            <MetricCard
              label="On-Time Performance"
              value={summary.overdue === 0 ? "100%" : `${Math.round(((summary.total - summary.overdue) / summary.total) * 100)}%`}
              description={`${summary.overdue} overdue task${summary.overdue !== 1 ? 's' : ''}`}
            />

            <MetricCard
              label="Active Tasks"
              value={summary.pending}
              description="Tasks in progress"
            />
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Upcoming Deadlines</span>
            </h3>
          </div>

          <div className="space-y-3">
            {upcomingTasks.slice(0, 5).map((task) => (
              <UpcomingTaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Recent Activity</span>
            </h3>
          </div>

          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const SummaryCard = ({ title, value, icon, bgColor, textColor }) => (
  <div className={`${bgColor} p-4 rounded-lg border border-gray-200`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      </div>
      <div className={bgColor}>
        {icon}
      </div>
    </div>
  </div>
);

const MetricCard = ({ label, value, description }) => (
  <div className="text-center">
    <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
    <div className="text-xs text-gray-500">{description}</div>
  </div>
);

const UpcomingTaskItem = ({ task }) => {
  const daysUntil = task.daysUntilDeadline;
  const isOverdue = daysUntil < 0;
  const isDueSoon = daysUntil <= 2 && daysUntil >= 0;

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900">{task.title || task.task || 'Untitled Task'}</h4>
          <PriorityBadge priority={task.priority} />
        </div>
        {task.description && (
          <p className="text-sm text-gray-600 mt-1 truncate">{task.description}</p>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <div className={`text-sm font-medium ${
          isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-gray-600'
        }`}>
          {isOverdue
            ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue`
            : daysUntil === 0
            ? 'Due today'
            : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`
          }
        </div>

        <StatusBadge status={task.status} />
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => (
  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
    <div className="flex-shrink-0">
      {activity.activity_type === 'created' ? (
        <ClipboardList className="w-4 h-4 text-blue-600" />
      ) : (
        <RefreshCw className="w-4 h-4 text-green-600" />
      )}
    </div>

    <div className="flex-1">
      <div className="flex items-center space-x-2">
        <span className="font-medium text-gray-900">{activity.title || activity.task || 'Untitled Task'}</span>
        <span className="text-sm text-gray-500">was {activity.activity_type}</span>
      </div>
      <div className="text-sm text-gray-500">
        <span className="font-medium">
          {activity.assigned_to || 'Unassigned'}
        </span>
        <span className="mx-1">•</span>
        {activity.timeAgo}
      </div>
    </div>

    <StatusBadge status={activity.status} />
  </div>
);

const PriorityBadge = ({ priority }) => {
  const colors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
      colors[priority] || colors.medium
    }`}>
      {priority || 'medium'}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    done: 'bg-green-100 text-green-800 border-green-200',
    'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'to-do': 'bg-gray-100 text-gray-800 border-gray-200',
    'on-hold': 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
      colors[status] || colors['to-do']
    }`}>
      {status || 'to-do'}
    </span>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
    <div className="flex justify-between items-center">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
      <div className="h-9 bg-gray-200 rounded w-20 animate-pulse"></div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="h-5 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ErrorDisplay = ({ error }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 mx-3 sm:mx-4 lg:mx-6 my-3">
    <div className="flex items-center space-x-3 mb-4">
      <AlertTriangle className="w-6 h-6 text-red-600" />
      <div>
        <h3 className="font-semibold text-red-800">Failed to load dashboard</h3>
        <p className="text-red-700 mt-1">{error}</p>
      </div>
    </div>
    <button
      onClick={() => window.location.reload()}
      className="px-3 py-2 text-sm bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-red-600 transition-colors"
    >
      <RefreshCw className="w-4 h-4 mr-2 inline" />
      Try Again
    </button>
  </div>
);

export default UserTasksDashboard;