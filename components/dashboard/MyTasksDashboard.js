/**
 * My Tasks Dashboard Component - View Layer
 * Modern shadcn-style UX with powerful minimal design
 */

import React, { useState } from 'react';
import {
  RefreshCw,
  Download,
  List,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  TrendingUp,
  Calendar,
  Users,
  Star
} from 'lucide-react';
import Button from '../ui/Button';
import TaskTable from '../TaskTable';
import useMyTasksController from '../../src/features/tasks/hooks/useMyTasksController';

const MyTasksDashboard = ({ user }) => {
  // Controller layer - handles all business logic
  const {
    tasks,
    stats,
    clientList,
    loading,
    refreshing,
    error,
    refresh,
    updateTask,
    deleteTask,
    exportTasks,
    clearError
  } = useMyTasksController(user);

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState('all'); // all, pending, completed, overdue
  const [showFilters, setShowFilters] = useState(false);

  if (loading && !tasks.length) {
    return <ModernLoadingSkeleton />;
  }

  if (error) {
    return <ModernErrorDisplay error={error} onRetry={refresh} onClose={clearError} />;
  }

  // Filter tasks based on search and view
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery ||
      task.task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.client_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesView = selectedView === 'all' ||
      (selectedView === 'pending' && task.status === 'pending') ||
      (selectedView === 'completed' && task.status === 'done') ||
      (selectedView === 'overdue' && task.status === 'pending' && task.deadline && new Date(task.deadline) < new Date());

    return matchesSearch && matchesView;
  });

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl lg:text-2xl font-bold text-black">My Tasks</h2>

        <div className="flex space-x-2">
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={exportTasks}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <ModernStatsGrid stats={stats} onViewSelect={setSelectedView} selectedView={selectedView} />

      {/* Search and Filters Bar */}
      <ModernSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        selectedView={selectedView}
        onViewChange={setSelectedView}
        resultsCount={filteredTasks.length}
      />

      {/* Task Content */}
      {filteredTasks.length > 0 ? (
        <ModernTaskTable
          tasks={filteredTasks}
          onTaskUpdate={updateTask}
          onTaskDelete={deleteTask}
          currentUser={user?.username}
          userRole={user?.role}
          clientList={clientList}
        />
      ) : (
        <ModernEmptyState
          hasSearch={!!searchQuery}
          view={selectedView}
          onClear={() => {
            setSearchQuery('');
            setSelectedView('all');
          }}
        />
      )}
    </div>
  );
};

// Modern shadcn-style Components

const ModernStatsGrid = ({ stats, onViewSelect, selectedView }) => {
  const cards = [
    {
      label: 'Total',
      value: stats.total,
      icon: List,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      view: 'all'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      view: 'completed'
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      hoverColor: 'hover:bg-amber-100',
      view: 'pending'
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      hoverColor: 'hover:bg-red-100',
      view: 'overdue'
    }
  ];

  return (
    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedView === card.view;
        return (
          <button
            key={card.label}
            onClick={() => onViewSelect(card.view)}
            className={`
              relative p-3 rounded-lg border transition-all duration-200 text-left group
              ${isSelected
                ? `${card.bgColor} ${card.borderColor} shadow-sm`
                : `bg-white border-gray-200 ${card.hoverColor} hover:shadow-md hover:border-gray-300`
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  {card.label}
                </p>
                <p className={`text-xl font-bold tabular-nums ${card.color}`}>
                  {card.value}
                </p>
              </div>
              <div className={`p-1.5 rounded ${isSelected ? 'bg-white/50' : card.bgColor} transition-colors`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            {isSelected && (
              <div className={`absolute inset-x-0 bottom-0 h-0.5 ${card.color.replace('text-', 'bg-')} rounded-b-lg`} />
            )}
          </button>
        );
      })}
    </div>
  );
};

const ModernSearchBar = ({
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  selectedView,
  onViewChange,
  resultsCount
}) => {
  return (
    <div className="mt-4 space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks or clients..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <AlertTriangle className="h-4 w-4 rotate-45" />
          </button>
        )}
      </div>

      {/* Quick Filters & Results */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {resultsCount} task{resultsCount !== 1 ? 's' : ''} found
          </span>
          {(searchQuery || selectedView !== 'all') && (
            <button
              onClick={() => {
                onSearchChange('');
                onViewChange('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">View:</span>
          <select
            value={selectedView}
            onChange={(e) => onViewChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const ModernTaskTable = ({ tasks, onTaskUpdate, onTaskDelete, currentUser, userRole, clientList }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <style jsx>{`
            .task-table-container th {
              height: 2.5rem !important;
              vertical-align: middle !important;
              line-height: 1.2 !important;
              padding: 0.5rem !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            .task-table-container th span {
              display: block !important;
              line-height: 1.2 !important;
            }
            .task-table-container td {
              vertical-align: middle !important;
              padding: 0.75rem 0.5rem !important;
            }
          `}</style>
          <div className="task-table-container">
            <TaskTable
              tasks={tasks}
              title=""
              showFilters={false} // We handle filtering above
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
              currentUser={currentUser}
              userRole={userRole}
              clientList={clientList}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ModernEmptyState = ({ hasSearch, view, onClear }) => {
  const getEmptyMessage = () => {
    if (hasSearch) {
      return {
        title: 'No tasks found',
        description: 'No tasks match your search criteria. Try adjusting your search terms.',
        action: 'Clear search',
        icon: Search
      };
    }

    if (view === 'completed') {
      return {
        title: 'No completed tasks',
        description: 'You haven\'t completed any tasks yet. Keep working on your pending tasks!',
        action: 'View all tasks',
        icon: CheckCircle
      };
    }

    if (view === 'overdue') {
      return {
        title: 'No overdue tasks',
        description: 'Great job! You\'re staying on top of your deadlines.',
        action: 'View all tasks',
        icon: Calendar
      };
    }

    if (view === 'pending') {
      return {
        title: 'No pending tasks',
        description: 'All caught up! No pending tasks to work on.',
        action: 'View all tasks',
        icon: Clock
      };
    }

    return {
      title: 'No tasks yet',
      description: 'You don\'t have any tasks assigned or created yet. Your tasks will appear here.',
      action: 'Get started',
      icon: List
    };
  };

  const { title, description, action, icon: Icon } = getEmptyMessage();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="text-center py-8 px-4">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
        {onClear && (
          <button
            onClick={onClear}
            className="mt-4 inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
};

const ModernLoadingSkeleton = () => (
  <div className="bg-gray-50/30">
    <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-3">
      <div className="mb-5">
        {/* Header skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-2">
            <div className="h-7 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 bg-gray-200 rounded-lg w-20 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded-lg w-20 animate-pulse"></div>
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-8 animate-pulse"></div>
                </div>
                <div className="h-7 w-7 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search bar skeleton */}
        <div className="mt-4 space-y-3">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="flex justify-between">
            <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-7 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ModernErrorDisplay = ({ error, onRetry, onClose }) => (
  <div className="bg-gray-50/30">
    <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-3">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg border border-red-200 shadow-sm">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900">
                  Failed to load tasks
                </h3>
                <p className="mt-1 text-sm text-gray-600 break-words">
                  {error}
                </p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close error"
                >
                  <span className="text-lg">×</span>
                </button>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default MyTasksDashboard;