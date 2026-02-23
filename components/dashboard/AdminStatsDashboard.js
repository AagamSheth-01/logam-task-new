/**
 * Admin Stats Dashboard Component
 * MVC Pattern implementation with consistent UI matching user dashboard
 */

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Users,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Building,
  Calendar,
  RefreshCw,
  Eye,
  ArrowUp,
  ArrowDown,
  Activity,
} from "lucide-react";
import useAdminDashboardStore from "../../hooks/useAdminDashboard";

const AdminStatsDashboard = ({ user }) => {
  const [viewMode, setViewMode] = useState("overview");

  const { dashboardData, loading, error, refreshData, fetchDashboardData } =
    useAdminDashboardStore();

  // ✅ ALL hooks must be here — before any conditional returns
  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    console.log("[AdminDashboard] Store state update:", {
      loading,
      error,
      hasDashboardData: !!dashboardData,
      dashboardData,
    });
  }, [dashboardData, loading, error]);

  // ✅ Conditional returns AFTER all hooks
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={refreshData} />;

  const stats = dashboardData || {};
  const todayDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header - Consistent with user dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-black">
            Admin Dashboard
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Overview of system metrics and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            disabled={loading}
            className={`p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 ${
              loading ? "animate-spin" : ""
            }`}
            title="Refresh dashboard data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">{todayDate}</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={stats.users?.total || 0}
          icon={Users}
          color="blue"
          subtitle={`${stats.users?.newThisMonth || 0} new this month`}
          trend="up"
        />
        <StatCard
          title="Total Tasks"
          value={stats.tasks?.total || 0}
          icon={ClipboardList}
          color="purple"
          subtitle={`${stats.tasks?.completionRate || 0}% completion rate`}
          trend={stats.tasks?.completionRate > 75 ? "up" : "down"}
        />
        <StatCard
          title="Present Today"
          value={stats.attendance?.presentToday || 0}
          icon={UserCheck}
          color="green"
          subtitle={`${stats.attendance?.totalToday || 0} total logged`}
          trend="up"
        />
        <StatCard
          title="Active Clients"
          value={stats.clients?.length || 0}
          icon={Building}
          color="orange"
          subtitle="Client accounts"
          trend="neutral"
        />
      </div>

      {/* Task Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Task Status Breakdown */}
        <div className="bg-white border border-gray-100 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-black">Task Status Overview</h3>
            <ClipboardList className="w-5 h-5 text-gray-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">Completed</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.tasks?.completed || 0}
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-800">Pending</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {stats.tasks?.pending || 0}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800">Overdue</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {stats.tasks?.overdue || 0}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">Rate</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.tasks?.completionRate || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white border border-gray-100 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-black">Top Performers</h3>
            <Activity className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {Object.entries(stats.performance || {})
              .sort((a, b) => {
                const aRate = a[1].total > 0 ? a[1].completed / a[1].total : 0;
                const bRate = b[1].total > 0 ? b[1].completed / b[1].total : 0;
                return bRate - aRate;
              })
              .slice(0, 5)
              .map(([username, perf]) => {
                const completionRate =
                  perf.total > 0
                    ? Math.round((perf.completed / perf.total) * 100)
                    : 0;
                return (
                  <div
                    key={username}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {username}
                        </div>
                        <div className="text-xs text-gray-600">
                          {perf.completed}/{perf.total} tasks completed
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {completionRate}%
                      </div>
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white border border-gray-100 rounded-lg">
        <div className="border-b border-gray-100 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode("overview")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "overview"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "analytics"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setViewMode("recent")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "recent"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Recent Activity
            </button>
          </div>
        </div>

        <div className="p-4">
          {viewMode === "overview" && <OverviewSection stats={stats} />}
          {viewMode === "analytics" && <AnalyticsSection stats={stats} />}
          {viewMode === "recent" && <RecentActivitySection stats={stats} />}
        </div>
      </div>
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    green: "bg-green-50 border-green-200 text-green-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
    red: "bg-red-50 border-red-200 text-red-600",
  };

  const getTrendIcon = (trend) => {
    if (trend === "up") return <ArrowUp className="w-3 h-3 text-green-600" />;
    if (trend === "down") return <ArrowDown className="w-3 h-3 text-red-600" />;
    return null;
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700 text-sm">{title}</h4>
        <Icon className={`w-5 h-5 ${colorClasses[color].split(" ")[2]}`} />
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      {subtitle && (
        <div className="flex items-center space-x-1">
          {getTrendIcon(trend)}
          <p className="text-xs text-gray-600">{subtitle}</p>
        </div>
      )}
    </div>
  );
};

// Helper Components
const LoadingSkeleton = () => (
  <div className="space-y-6 p-4">
    <div className="flex items-center justify-between">
      <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
      <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="p-4 rounded-lg bg-gray-50 border border-gray-200"
        >
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
      <AlertTriangle className="w-5 h-5" />
      <span className="font-medium">Failed to load admin dashboard data</span>
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

// Section Components
const OverviewSection = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700">System Health</h4>
        <Activity className="w-5 h-5 text-blue-600" />
      </div>
      <div className="text-lg font-semibold text-gray-900">
        {stats.tasks?.completionRate > 75
          ? "Excellent"
          : stats.tasks?.completionRate > 50
            ? "Good"
            : "Needs Attention"}
      </div>
      <p className="text-sm text-gray-600 mt-1">
        Based on completion rate and performance metrics
      </p>
    </div>

    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700">Active Users</h4>
        <Users className="w-5 h-5 text-green-600" />
      </div>
      <div className="text-lg font-semibold text-gray-900">
        {stats.attendance?.presentToday || 0}/{stats.users?.total || 0}
      </div>
      <p className="text-sm text-gray-600 mt-1">Users present today</p>
    </div>

    <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700">Task Load</h4>
        <ClipboardList className="w-5 h-5 text-purple-600" />
      </div>
      <div className="text-lg font-semibold text-gray-900">
        {stats.tasks?.pending || 0} Pending
      </div>
      <p className="text-sm text-gray-600 mt-1">
        {stats.tasks?.overdue || 0} overdue tasks
      </p>
    </div>
  </div>
);

const AnalyticsSection = ({ stats }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-3 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">
          {stats.users?.total || 0}
        </div>
        <div className="text-sm text-gray-600">Total Users</div>
      </div>
      <div className="text-center p-3 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">
          {stats.tasks?.completed || 0}
        </div>
        <div className="text-sm text-gray-600">Completed Tasks</div>
      </div>
      <div className="text-center p-3 bg-amber-50 rounded-lg">
        <div className="text-2xl font-bold text-amber-600">
          {stats.tasks?.pending || 0}
        </div>
        <div className="text-sm text-gray-600">Pending Tasks</div>
      </div>
      <div className="text-center p-3 bg-purple-50 rounded-lg">
        <div className="text-2xl font-bold text-purple-600">
          {stats.clients?.length || 0}
        </div>
        <div className="text-sm text-gray-600">Active Clients</div>
      </div>
    </div>
  </div>
);

const RecentActivitySection = ({ stats }) => (
  <div className="space-y-3">
    <div className="text-sm text-gray-600 mb-4">
      Recent system activity and updates
    </div>
    {stats.tasks?.recent && stats.tasks.recent.length > 0 ? (
      stats.tasks.recent.slice(0, 5).map((task, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{task.task}</div>
              <div className="text-sm text-gray-600">
                Assigned to {task.assigned_to} •{" "}
                {task.client_name || "No client"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-sm px-2 py-1 rounded ${
                task.status === "done"
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {task.status}
            </div>
          </div>
        </div>
      ))
    ) : (
      <div className="text-center py-8 text-gray-500">
        No recent activity found
      </div>
    )}
  </div>
);

export default AdminStatsDashboard;
