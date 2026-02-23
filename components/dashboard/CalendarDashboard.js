/**
 * Calendar Dashboard Component
 * MVC Pattern implementation for calendar view with tasks
 */

import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Plus,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  List,
  Eye,
  Edit3
} from 'lucide-react';
import Button from '../ui/Button';
import ModernCalendar from '../calendar/ModernCalendar';
import useCalendarTasks from '../../src/features/calendar/hooks/useCalendarTasks';

const CalendarDashboard = ({ user, onTabChange }) => {
  const {
    tasks,
    loading,
    error,
    selectedDate,
    viewMode,
    fetchTasks,
    setSelectedDate,
    setViewMode,
    refreshTasks
  } = useCalendarTasks(user);

  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    if (user?.username) {
      fetchTasks();
    }
  }, [user?.username, fetchTasks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTasks();
    } finally {
      setRefreshing(false);
    }
  };

  const handleTaskClick = (task) => {
    console.log('Task clicked:', task);
    // Could open task detail modal
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleCreateTask = () => {
    if (onTabChange) {
      onTabChange('assign-task');
    }
  };

  if (loading && !tasks.length) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRefresh} />;
  }

  // Get tasks for selected date
  const selectedDateTasks = tasks.filter(task => {
    if (!task.deadline || !selectedDate) return false;
    const taskDate = new Date(task.deadline).toDateString();
    const selected = new Date(selectedDate).toDateString();
    return taskDate === selected;
  });

  // Get upcoming tasks (next 7 days)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const upcomingTasks = tasks.filter(task => {
    if (!task.deadline || task.status === 'done') return false;
    const taskDate = new Date(task.deadline);
    return taskDate >= today && taskDate <= nextWeek;
  });

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl lg:text-2xl font-bold text-black">Calendar</h2>

        <div className="flex space-x-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleCreateTask}
            size="sm"
            className="bg-black hover:bg-gray-800 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </Button>
        </div>
      </div>

      {/* Calendar Quick Stats */}
      <CalendarStats tasks={tasks} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Component */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <ModernCalendar
              tasks={tasks}
              onTaskClick={handleTaskClick}
              onDateClick={handleDateClick}
              userRole={user?.role || 'user'}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Date Tasks */}
          {selectedDate && (
            <SelectedDateTasks
              date={selectedDate}
              tasks={selectedDateTasks}
              onTaskClick={handleTaskClick}
            />
          )}

          {/* Upcoming Tasks */}
          <UpcomingTasks
            tasks={upcomingTasks}
            onTaskClick={handleTaskClick}
          />
        </div>
      </div>
    </div>
  );
};

// Helper Components
const CalendarStats = ({ tasks }) => {
  const today = new Date().toDateString();

  const stats = {
    total: tasks.length,
    dueToday: tasks.filter(task => {
      if (!task.deadline) return false;
      return new Date(task.deadline).toDateString() === today && task.status !== 'done';
    }).length,
    overdue: tasks.filter(task => {
      if (!task.deadline || task.status === 'done') return false;
      return new Date(task.deadline) < new Date() && new Date(task.deadline).toDateString() !== today;
    }).length,
    completed: tasks.filter(task => task.status === 'done').length
  };

  const cards = [
    { label: 'Total Tasks', value: stats.total, icon: List, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Due Today', value: stats.dueToday, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`${card.bg} border border-gray-200 rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SelectedDateTasks = ({ date, tasks, onTaskClick }) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
        <CalendarIcon className="w-4 h-4" />
        <span>Tasks for {formattedDate}</span>
      </h3>

      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              showDate={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No tasks for this date</p>
        </div>
      )}
    </div>
  );
};

const UpcomingTasks = ({ tasks, onTaskClick }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
        <Clock className="w-4 h-4" />
        <span>Upcoming (7 days)</span>
      </h3>

      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.slice(0, 5).map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              showDate={true}
            />
          ))}
          {tasks.length > 5 && (
            <p className="text-xs text-gray-500 text-center pt-2">
              +{tasks.length - 5} more tasks
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No upcoming tasks</p>
        </div>
      )}
    </div>
  );
};

const TaskItem = ({ task, onClick, showDate = false }) => {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';
  const isDueToday = task.deadline && new Date(task.deadline).toDateString() === new Date().toDateString();

  return (
    <div
      onClick={onClick}
      className={`p-2 rounded border cursor-pointer hover:bg-gray-50 transition-colors ${
        isOverdue ? 'border-red-200 bg-red-50' : isDueToday ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {task.task || task.title || 'Untitled Task'}
          </p>
          {showDate && task.deadline && (
            <p className={`text-xs mt-1 ${
              isOverdue ? 'text-red-600' : isDueToday ? 'text-orange-600' : 'text-gray-500'
            }`}>
              Due: {new Date(task.deadline).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-1 ml-2">
          {task.priority && (
            <span className={`px-1 py-0.5 rounded text-xs font-medium ${
              task.priority === 'high' ? 'bg-red-100 text-red-700' :
              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {task.priority}
            </span>
          )}

          {task.status === 'done' && (
            <CheckCircle className="w-3 h-3 text-green-600" />
          )}
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
    <div className="flex justify-between items-center">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
      <div className="flex space-x-2">
        <div className="h-9 bg-gray-200 rounded w-20 animate-pulse"></div>
        <div className="h-9 bg-gray-200 rounded w-24 animate-pulse"></div>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-50 p-4 rounded-lg border">
          <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-8 animate-pulse"></div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-96 bg-gray-100 rounded-lg animate-pulse"></div>
      <div className="space-y-4">
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    </div>
  </div>
);

const ErrorDisplay = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 mx-3 sm:mx-4 lg:mx-6 my-3">
    <div className="flex items-center space-x-3 mb-4">
      <AlertTriangle className="w-6 h-6 text-red-600" />
      <div>
        <h3 className="font-semibold text-red-800">Failed to load calendar</h3>
        <p className="text-red-700 mt-1">{error}</p>
      </div>
    </div>
    <Button
      onClick={onRetry}
      variant="outline"
      size="sm"
      className="text-red-600 border-red-300 hover:bg-red-100"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      Try Again
    </Button>
  </div>
);

export default CalendarDashboard;