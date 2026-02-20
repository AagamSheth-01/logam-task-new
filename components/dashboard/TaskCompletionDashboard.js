/**
 * Task Completion Dashboard Component - View Layer
 * MVC Pattern implementation with consistent UI/UX design
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Building,
  Flag,
  RefreshCw,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react';
import Button from '../ui/Button';
import useTaskCompletionSafe from '../../hooks/useTaskCompletionSafe';

const TaskCompletionDashboard = ({ user }) => {
  // Early return if no user to prevent hook issues
  if (!user?.username) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Please log in to view your tasks</p>
        </div>
      </div>
    );
  }

  // Controller layer - handles all business logic
  const {
    tasks,
    stats,
    loading,
    completing,
    error,
    completeTask,
    refresh
  } = useTaskCompletionSafe(user);

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState('pending'); // 'pending', 'completed', 'all'

  // UI handlers
  const handleMarkComplete = async (taskName) => {
    try {
      await completeTask(taskName);
      // Remove from selected tasks if it was selected
      setSelectedTasks(prev => prev.filter(t => t !== taskName));
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const toggleTaskSelection = (taskName) => {
    setSelectedTasks(prev =>
      prev.includes(taskName)
        ? prev.filter(t => t !== taskName)
        : [...prev, taskName]
    );
  };

  const handleRefresh = async () => {
    await refresh();
  };

  // Priority icon helper
  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return <Flag className="w-3 h-3 text-red-500" />;
      case 'medium':
        return <Flag className="w-3 h-3 text-yellow-500" />;
      case 'low':
        return <Flag className="w-3 h-3 text-green-500" />;
      default:
        return <Flag className="w-3 h-3 text-gray-400" />;
    }
  };

  // Filter tasks based on search query and view mode
  const filteredOverdueTasks = tasks.overdue.filter(task =>
    (task.task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.client_name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (viewMode === 'all' || viewMode === 'pending')
  );

  const filteredPendingTasks = tasks.pending.filter(task =>
    (task.task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.client_name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (viewMode === 'all' || viewMode === 'pending')
  );

  const filteredCompletedTasks = tasks.completed.filter(task =>
    (task.task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.client_name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (viewMode === 'all' || viewMode === 'completed')
  );

  if (loading && !tasks.overdue.length && !tasks.pending.length) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header - Consistent with other dashboards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-black">Complete Tasks</h2>
          <p className="text-sm text-gray-600 mt-1">Mark your pending tasks as complete</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
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

      {/* Statistics Cards - Consistent styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-xl font-bold text-black">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-xl font-bold text-black">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xl font-bold text-black">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-xl font-bold text-black">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs and Search Bar */}
      <div className="bg-white border border-gray-100 rounded-lg">
        {/* View Mode Tabs */}
        <div className="border-b border-gray-100 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'pending'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pending Tasks
            </button>
            <button
              onClick={() => setViewMode('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Completed Tasks
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Tasks
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-100 rounded-lg">
        <div className="p-4 lg:p-6">
          {/* Overdue Tasks Section */}
          {filteredOverdueTasks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-semibold text-red-600 mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Overdue Tasks ({filteredOverdueTasks.length})</span>
              </h3>
              <div className="space-y-3">
                {filteredOverdueTasks.map((task, index) => (
                  <div key={task.id || index} className="flex items-center justify-between p-3 lg:p-4 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-red-800 text-sm break-words">{task.task}</h4>
                      <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1">
                        <span className="text-xs text-red-600 font-medium flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Due: {task.deadline}</span>
                        </span>
                        {task.client_name && (
                          <span className="text-xs text-red-600 flex items-center space-x-1">
                            <Building className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{task.client_name}</span>
                          </span>
                        )}
                        <div className="flex items-center space-x-1 text-xs text-red-600">
                          {getPriorityIcon(task.priority)}
                          <span>{task.priority || 'Normal'}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleMarkComplete(task.task)}
                      disabled={completing}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 ml-4 flex-shrink-0"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{completing ? 'Completing...' : 'Complete'}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Tasks Section */}
          <div className="space-y-3">
            <h3 className="text-md font-semibold text-black mb-4 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Pending Tasks ({filteredPendingTasks.length})</span>
            </h3>
            {filteredPendingTasks.map((task, index) => (
              <div key={task.id || index} className="flex items-center justify-between p-3 lg:p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-black text-sm break-words">{task.task}</h4>
                  <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1">
                    <span className="text-xs text-gray-500 flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Due: {task.deadline}</span>
                    </span>
                    {task.client_name && (
                      <span className="text-xs text-gray-500 flex items-center space-x-1">
                        <Building className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{task.client_name}</span>
                      </span>
                    )}
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      {getPriorityIcon(task.priority)}
                      <span>{task.priority || 'Normal'}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleMarkComplete(task.task)}
                  disabled={completing}
                  className="flex items-center space-x-2 bg-black hover:bg-gray-800 ml-4 flex-shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{completing ? 'Completing...' : 'Complete'}</span>
                </Button>
              </div>
            ))}

            {/* Completed Tasks Section */}
            {(viewMode === 'completed' || viewMode === 'all') && filteredCompletedTasks.length > 0 && (
              <div className={viewMode !== 'completed' ? 'mt-8 pt-6 border-t border-gray-100' : ''}>
                <h3 className="text-md font-semibold text-green-600 mb-4 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Completed Tasks ({filteredCompletedTasks.length})</span>
                </h3>
                <div className="space-y-3">
                  {filteredCompletedTasks.map((task, index) => {
                    // Calculate deadline status for completed tasks
                    const wasOverdue = task.deadline ? (() => {
                      try {
                        const deadlineDate = new Date(task.deadline);
                        const completedDate = new Date(task.completed_at || task.updated_at);
                        deadlineDate.setHours(0, 0, 0, 0);
                        completedDate.setHours(0, 0, 0, 0);
                        return completedDate > deadlineDate;
                      } catch (e) {
                        return false;
                      }
                    })() : false;

                    return (
                      <div key={task.id || index} className={`flex items-center justify-between p-3 lg:p-4 border rounded-lg ${
                        wasOverdue ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm break-words ${
                            wasOverdue ? 'text-red-800' : 'text-green-800'
                          }`}>
                            {task.task}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1">
                            <span className={`text-xs font-medium flex items-center space-x-1 ${
                              wasOverdue ? 'text-red-600' : 'text-green-600'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              <span>Deadline: {task.deadline || 'No deadline'}</span>
                            </span>
                            {task.completed_at && (
                              <span className={`text-xs flex items-center space-x-1 ${
                                wasOverdue ? 'text-red-600' : 'text-green-600'
                              }`}>
                                <CheckCircle className="w-3 h-3" />
                                <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                              </span>
                            )}
                            {task.client_name && (
                              <span className={`text-xs flex items-center space-x-1 ${
                                wasOverdue ? 'text-red-600' : 'text-green-600'
                              }`}>
                                <Building className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{task.client_name}</span>
                              </span>
                            )}
                            <div className={`flex items-center space-x-1 text-xs ${
                              wasOverdue ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {getPriorityIcon(task.priority)}
                              <span>{task.priority || 'Normal'}</span>
                            </div>
                          </div>
                          {wasOverdue && (
                            <div className="mt-2 px-2 py-1 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                              <AlertTriangle className="w-3 h-3 inline mr-1" />
                              Completed after deadline
                            </div>
                          )}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ml-4 flex-shrink-0 ${
                          wasOverdue ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                        }`}>
                          ✓ Done
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {(() => {
              const hasNoTasks =
                (viewMode === 'pending' && filteredPendingTasks.length === 0 && filteredOverdueTasks.length === 0) ||
                (viewMode === 'completed' && filteredCompletedTasks.length === 0) ||
                (viewMode === 'all' && filteredPendingTasks.length === 0 && filteredOverdueTasks.length === 0 && filteredCompletedTasks.length === 0);

              if (!hasNoTasks) return null;

              return (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {searchQuery
                      ? `No ${viewMode === 'all' ? '' : viewMode + ' '}tasks match your search criteria`
                      : `No ${viewMode === 'all' ? '' : viewMode + ' '}tasks assigned to you`
                    }
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-blue-600 text-sm hover:underline mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
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

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Content Skeleton */}
    <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
);

export default TaskCompletionDashboard;