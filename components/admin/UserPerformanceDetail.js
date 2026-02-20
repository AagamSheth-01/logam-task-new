/**
 * User Performance Detail Component
 * MVC Pattern implementation with consistent UI matching user dashboard
 */

import React, { useEffect } from 'react';
import Button from '../ui/Button';
import {
  X,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Flag,
  Building,
  Timer,
  Target,
  Award,
  Activity,
  PieChart,
  ChevronDown,
  ChevronUp,
  Filter,
  Search
} from 'lucide-react';
import useUserPerformanceDetailStore from '../../hooks/useUserPerformanceDetail';

const UserPerformanceDetail = ({ user, tasks, onClose, onMarkComplete }) => {
  // Controller layer - handles all business logic
  const {
    // State
    activeFilter,
    searchTerm,
    expandedTasks,
    loading,
    error,

    // Actions
    setActiveFilter,
    setSearchTerm,
    toggleTaskExpansion,
    calculateUserStats,
    getFilteredTasks,
    getPriorityBadgeColor,
    getStatusBadgeColor,
    formatDate,
    isTaskOverdue,
    getPerformanceLevel,
    clearState
  } = useUserPerformanceDetailStore();

  // Clear state when component unmounts
  useEffect(() => {
    return () => clearState();
  }, [clearState]);

  // Calculate user statistics
  const stats = calculateUserStats(user, tasks);
  const filteredTasks = getFilteredTasks(stats.userTasks, activeFilter, searchTerm);
  const performanceLevel = getPerformanceLevel(stats.completionRate);

  // Handle task completion
  const handleMarkComplete = async (taskId) => {
    if (onMarkComplete) {
      await onMarkComplete(taskId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-gray-500" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">
                {user.displayName || user.username}
              </h2>
              <p className="text-gray-600">Performance Overview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Performance Summary */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Performance Summary</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-700">Total Tasks</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-green-700">Completed</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-yellow-700">Pending</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                <div className="text-sm text-red-700">Overdue</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-black">Completion Rate</h4>
                  <Target className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-black mb-1">{stats.completionRate}%</div>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${performanceLevel.bgColor} ${performanceLevel.color}`}>
                  {performanceLevel.level}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-black">Clients Served</h4>
                  <Building className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-black mb-1">{stats.uniqueClients}</div>
                <div className="text-xs text-gray-500">
                  {stats.clientsList.slice(0, 2).join(', ')}
                  {stats.clientsList.length > 2 && ` +${stats.clientsList.length - 2} more`}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-black">Avg. Time</h4>
                  <Timer className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-black mb-1">
                  {stats.avgCompletionTime || '-'}
                </div>
                <div className="text-xs text-gray-500">
                  {stats.avgCompletionTime ? 'days to complete' : 'No data'}
                </div>
              </div>
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="mb-8">
            <h4 className="font-medium text-black mb-3">Priority Distribution</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-lg font-bold text-red-600">{stats.priorityDistribution.high}</div>
                <div className="text-sm text-red-700">High Priority</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-lg font-bold text-yellow-600">{stats.priorityDistribution.medium}</div>
                <div className="text-sm text-yellow-700">Medium Priority</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-lg font-bold text-green-600">{stats.priorityDistribution.low}</div>
                <div className="text-sm text-green-700">Low Priority</div>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Task Details</span>
              </h3>
              <div className="text-sm text-gray-600">
                {filteredTasks.length} of {stats.total} tasks
              </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Filter Buttons */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Filter by Status</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'All', count: stats.total },
                      { key: 'completed', label: 'Completed', count: stats.completed },
                      { key: 'pending', label: 'Pending', count: stats.pending },
                      { key: 'overdue', label: 'Overdue', count: stats.overdue },
                      { key: 'today', label: 'Due Today', count: stats.today }
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setActiveFilter(filter.key)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeFilter === filter.key
                            ? 'bg-black text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {filter.label} ({filter.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Search Tasks</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by task name, client..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Task Cards */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                  <p className="text-gray-500">
                    {searchTerm ? 'No tasks match your search criteria.' : 'No tasks in this category.'}
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`bg-white border rounded-lg p-4 ${
                      isTaskOverdue(task) ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-black truncate">{task.task}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(task.status)}`}>
                            {task.status === 'done' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                            {task.status}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityBadgeColor(task.priority)}`}>
                            <Flag className="w-3 h-3 mr-1" />
                            {task.priority}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          {task.client_name && (
                            <div className="flex items-center space-x-1">
                              <Building className="w-4 h-4" />
                              <span>{task.client_name}</span>
                            </div>
                          )}
                          {task.deadline && (
                            <div className={`flex items-center space-x-1 ${isTaskOverdue(task) ? 'text-red-600' : ''}`}>
                              <Calendar className="w-4 h-4" />
                              <span>Due: {formatDate(task.deadline)}</span>
                            </div>
                          )}
                          {task.created_date && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>Created: {formatDate(task.created_date)}</span>
                            </div>
                          )}
                        </div>

                        {/* Task Description/Notes */}
                        {(task.comments || task.notes) && (
                          <div className="mb-3">
                            <button
                              onClick={() => toggleTaskExpansion(task.id)}
                              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              {expandedTasks[task.id] ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  <span>Hide Details</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  <span>Show Details</span>
                                </>
                              )}
                            </button>
                            {expandedTasks[task.id] && (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-700">
                                  {task.comments || task.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        {task.status === 'pending' && (
                          <Button
                            onClick={() => handleMarkComplete(task.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Overdue Warning */}
                    {isTaskOverdue(task) && (
                      <div className="mt-3 flex items-center space-x-2 text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>This task is overdue</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserPerformanceDetail;