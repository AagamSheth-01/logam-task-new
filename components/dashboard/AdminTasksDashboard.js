/**
 * Admin Tasks Dashboard Component
 * MVC Pattern implementation with consistent UI matching user dashboard
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Flag,
  Building,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Save,
  TrendingUp,
  Activity,
  BarChart3,
  Users
} from 'lucide-react';
import useAdminDashboardStore from '../../hooks/useAdminDashboard';
import Button from '../ui/Button';

const AdminTasksDashboard = ({ user, onTaskSelect }) => {
  const [viewMode, setViewMode] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState({});

  const searchInputRef = useRef(null);

  // Controller layer - handles all business logic
  const {
    dashboardData,
    loading,
    error,
    refreshData
  } = useAdminDashboardStore();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refreshData} />;
  }

  const allTasks = dashboardData?.tasks?.all || [];
  const taskStats = dashboardData?.tasks || {};
  const users = dashboardData?.users?.all || [];

  // Filter and sort tasks
  const filteredTasks = allTasks.filter(task => {
    const matchesSearch = !searchQuery ||
      task.task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assigned_to?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'all' || task.assigned_to === filterAssignee;

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  const sortedTasks = sortTasks(filteredTasks, sortConfig);

  const todayDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header - Consistent with user dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-black">Task Management</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor and manage all tasks across the system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {/* TODO: Add new task functionality */}}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </Button>
          <button
            onClick={refreshData}
            disabled={loading}
            className={`p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 ${
              loading ? 'animate-spin' : ''
            }`}
            title="Refresh task data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">{todayDate}</span>
        </div>
      </div>

      {/* Task Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Tasks"
          value={taskStats.total || 0}
          icon={ClipboardList}
          color="blue"
          subtitle="All tasks"
          trend="neutral"
        />
        <StatCard
          title="Completed"
          value={taskStats.completed || 0}
          icon={CheckCircle}
          color="green"
          subtitle={`${taskStats.completionRate || 0}% rate`}
          trend="up"
        />
        <StatCard
          title="Pending"
          value={taskStats.pending || 0}
          icon={Clock}
          color="amber"
          subtitle="In progress"
          trend="neutral"
        />
        <StatCard
          title="Overdue"
          value={taskStats.overdue || 0}
          icon={AlertTriangle}
          color="red"
          subtitle="Need attention"
          trend={taskStats.overdue > 0 ? "down" : "neutral"}
        />
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white border border-gray-100 rounded-lg">
        <div className="border-b border-gray-100 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'overview'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('tasks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'tasks'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'analytics'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setViewMode('assignments')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'assignments'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              By Assignee
            </button>
          </div>
        </div>

        <div className="p-4">
          {viewMode === 'overview' && <OverviewSection stats={taskStats} tasks={allTasks} />}
          {viewMode === 'tasks' && (
            <TasksSection
              tasks={sortedTasks}
              users={users}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterPriority={filterPriority}
              setFilterPriority={setFilterPriority}
              filterAssignee={filterAssignee}
              setFilterAssignee={setFilterAssignee}
              sortConfig={sortConfig}
              setSortConfig={setSortConfig}
              onTaskSelect={onTaskSelect}
            />
          )}
          {viewMode === 'analytics' && <AnalyticsSection stats={taskStats} tasks={allTasks} users={users} />}
          {viewMode === 'assignments' && <AssignmentsSection tasks={allTasks} users={users} />}
        </div>
      </div>
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    red: 'bg-red-50 border-red-200 text-red-600'
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <ArrowUp className="w-3 h-3 text-green-600" />;
    if (trend === 'down') return <ArrowDown className="w-3 h-3 text-red-600" />;
    return null;
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700 text-sm">{title}</h4>
        <Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[2]}`} />
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

// Overview Section
const OverviewSection = ({ stats, tasks }) => {
  const recentTasks = tasks.slice(0, 5);
  const urgentTasks = tasks.filter(task =>
    task.status === 'pending' &&
    (task.priority === 'High' || isOverdue(task))
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-700">Progress Today</h4>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {stats.completionRate || 0}% Complete
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Overall task completion rate
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-700">Active Tasks</h4>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {stats.pending || 0}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Currently in progress
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-700">Urgent</h4>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {urgentTasks.length}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            High priority or overdue
          </p>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Recent Tasks</h4>
          <div className="space-y-2">
            {recentTasks.map((task, index) => (
              <TaskRow key={task.id || index} task={task} compact />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Urgent Attention</h4>
          <div className="space-y-2">
            {urgentTasks.length > 0 ? (
              urgentTasks.map((task, index) => (
                <TaskRow key={task.id || index} task={task} compact urgent />
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No urgent tasks at the moment
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Tasks Section with Filters
const TasksSection = ({
  tasks,
  users,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
  filterAssignee,
  setFilterAssignee,
  sortConfig,
  setSortConfig,
  onTaskSelect
}) => (
  <div className="space-y-4">
    {/* Filters */}
    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="done">Completed</option>
        </select>

        {/* Priority Filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Priorities</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Assignees</option>
          {users.map(user => (
            <option key={user.username} value={user.username}>
              {user.username}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Task List */}
    <div className="space-y-2">
      <div className="text-sm text-gray-600 mb-2">
        Showing {tasks.length} tasks
      </div>
      {tasks.length > 0 ? (
        tasks.map((task, index) => (
          <TaskRow key={task.id || index} task={task} onSelect={onTaskSelect} />
        ))
      ) : (
        <div className="text-center py-12">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No tasks found matching your criteria</p>
        </div>
      )}
    </div>
  </div>
);

// Analytics Section
const AnalyticsSection = ({ stats, tasks, users }) => {
  const tasksByPriority = {
    High: tasks.filter(t => t.priority === 'High').length,
    Medium: tasks.filter(t => t.priority === 'Medium').length,
    Low: tasks.filter(t => t.priority === 'Low').length
  };

  return (
    <div className="space-y-6">
      {/* Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-600">{tasksByPriority.High}</div>
          <div className="text-sm text-gray-600">High Priority</div>
        </div>
        <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-2xl font-bold text-amber-600">{tasksByPriority.Medium}</div>
          <div className="text-sm text-gray-600">Medium Priority</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">{tasksByPriority.Low}</div>
          <div className="text-sm text-gray-600">Low Priority</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Performance Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{stats.completed || 0}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-600">{stats.pending || 0}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{stats.overdue || 0}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Assignments Section
const AssignmentsSection = ({ tasks, users }) => {
  const tasksByUser = users.map(user => ({
    user,
    tasks: tasks.filter(task => task.assigned_to === user.username),
    completed: tasks.filter(task => task.assigned_to === user.username && task.status === 'done').length,
    pending: tasks.filter(task => task.assigned_to === user.username && task.status === 'pending').length
  }));

  return (
    <div className="space-y-4">
      {tasksByUser.map(({ user, tasks, completed, pending }) => (
        <div key={user.username} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{user.username}</h4>
                <p className="text-sm text-gray-600">{user.role || 'user'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-green-600">{completed} completed</span>
              <span className="text-amber-600">{pending} pending</span>
              <span className="text-gray-600">{tasks.length} total</span>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="bg-gray-50 rounded p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {tasks.slice(0, 3).map((task, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium truncate">{task.task}</div>
                    <div className={`text-xs ${
                      task.status === 'done' ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {task.status} • {task.priority}
                    </div>
                  </div>
                ))}
              </div>
              {tasks.length > 3 && (
                <div className="text-xs text-gray-500 mt-2">
                  and {tasks.length - 3} more tasks...
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Task Row Component
const TaskRow = ({ task, onSelect, compact = false, urgent = false }) => {
  const overdue = isOverdue(task);

  return (
    <div
      className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
        urgent ? 'border-red-200 bg-red-50' : 'border-gray-200'
      } ${compact ? 'py-2' : ''}`}
      onClick={() => onSelect && onSelect(task)}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{task.task}</div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{task.assigned_to}</span>
            {task.client_name && (
              <>
                <span>•</span>
                <span>{task.client_name}</span>
              </>
            )}
            {task.deadline && (
              <>
                <span>•</span>
                <span className={overdue ? 'text-red-600 font-medium' : ''}>
                  {task.deadline}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        <span className={`px-2 py-1 text-xs font-medium rounded ${
          task.status === 'done'
            ? 'bg-green-100 text-green-600'
            : overdue
            ? 'bg-red-100 text-red-600'
            : 'bg-amber-100 text-amber-600'
        }`}>
          {overdue ? 'Overdue' : task.status}
        </span>
      </div>
    </div>
  );
};

// Helper Functions
const sortTasks = (tasks, sortConfig) => {
  if (!sortConfig.key) return tasks;

  return [...tasks].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (sortConfig.key === 'priority') {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      return sortConfig.direction === 'asc'
        ? (priorityOrder[aValue] || 0) - (priorityOrder[bValue] || 0)
        : (priorityOrder[bValue] || 0) - (priorityOrder[aValue] || 0);
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
};

const isOverdue = (task) => {
  return task.status === 'pending' && task.deadline && new Date(task.deadline) < new Date();
};

const getStatusColor = (status) => {
  switch (status) {
    case 'done': return 'bg-green-500';
    case 'pending': return 'bg-amber-500';
    default: return 'bg-gray-500';
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'High': return 'bg-red-100 text-red-600';
    case 'Medium': return 'bg-amber-100 text-amber-600';
    case 'Low': return 'bg-green-100 text-green-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};

// Helper Components
const LoadingSkeleton = () => (
  <div className="space-y-6 p-4">
    <div className="flex items-center justify-between">
      <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
      <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
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
      <AlertTriangle className="w-5 h-5" />
      <span className="font-medium">Failed to load task data</span>
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

export default AdminTasksDashboard;