/**
 * User Performance Detail Hook
 * MVC Pattern implementation for user performance analysis
 */

import { create } from 'zustand';

const useUserPerformanceDetailStore = create((set, get) => ({
  // State
  activeFilter: 'all',
  searchTerm: '',
  expandedTasks: {},
  loading: false,
  error: null,

  // Actions
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setExpandedTasks: (expanded) => set({ expandedTasks: expanded }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Toggle task expansion
  toggleTaskExpansion: (taskId) => {
    const { expandedTasks } = get();
    set({
      expandedTasks: {
        ...expandedTasks,
        [taskId]: !expandedTasks[taskId]
      }
    });
  },

  // Calculate user statistics
  calculateUserStats: (user, allTasks) => {
    const userTasks = allTasks.filter(task => task.assigned_to === user.username);
    const completedTasks = userTasks.filter(task => task.status === 'done');
    const pendingTasks = userTasks.filter(task => task.status === 'pending');

    const overdueTasks = userTasks.filter(task => {
      if (task.status === 'pending' && task.deadline) {
        return new Date(task.deadline) < new Date();
      }
      return false;
    });

    const todayTasks = userTasks.filter(task => {
      if (task.deadline) {
        const taskDate = new Date(task.deadline).toDateString();
        const today = new Date().toDateString();
        return taskDate === today;
      }
      return false;
    });

    const thisWeekTasks = userTasks.filter(task => {
      if (task.deadline) {
        const taskDate = new Date(task.deadline);
        const today = new Date();
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 6);
        return taskDate >= weekStart && taskDate <= weekEnd;
      }
      return false;
    });

    const thisMonthTasks = userTasks.filter(task => {
      if (task.deadline) {
        const taskDate = new Date(task.deadline);
        const today = new Date();
        return taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear();
      }
      return false;
    });

    // Calculate completion rate
    const completionRate = userTasks.length > 0 ? (completedTasks.length / userTasks.length * 100).toFixed(1) : 0;

    // Calculate average completion time (for completed tasks with creation and completion dates)
    let avgCompletionTime = null;
    const completedWithDates = completedTasks.filter(task => task.createdAt && task.completedAt);
    if (completedWithDates.length > 0) {
      const totalTime = completedWithDates.reduce((sum, task) => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.completedAt);
        return sum + (completed - created);
      }, 0);
      avgCompletionTime = Math.round(totalTime / completedWithDates.length / (1000 * 60 * 60 * 24)); // Days
    }

    // Get unique clients
    const uniqueClients = [...new Set(userTasks.map(task => task.client_name).filter(Boolean))];

    // Priority distribution
    const priorityDistribution = {
      high: userTasks.filter(task => task.priority === 'High').length,
      medium: userTasks.filter(task => task.priority === 'Medium').length,
      low: userTasks.filter(task => task.priority === 'Low').length
    };

    return {
      total: userTasks.length,
      completed: completedTasks.length,
      pending: pendingTasks.length,
      overdue: overdueTasks.length,
      today: todayTasks.length,
      thisWeek: thisWeekTasks.length,
      thisMonth: thisMonthTasks.length,
      completionRate: parseFloat(completionRate),
      avgCompletionTime,
      uniqueClients: uniqueClients.length,
      clientsList: uniqueClients,
      priorityDistribution,
      userTasks,
      completedTasks,
      pendingTasks,
      overdueTasks
    };
  },

  // Filter and search tasks
  getFilteredTasks: (userTasks, activeFilter, searchTerm) => {
    let filtered = [...userTasks];

    // Apply status filter
    switch (activeFilter) {
      case 'completed':
        filtered = filtered.filter(task => task.status === 'done');
        break;
      case 'pending':
        filtered = filtered.filter(task => task.status === 'pending');
        break;
      case 'overdue':
        filtered = filtered.filter(task => {
          if (task.status === 'pending' && task.deadline) {
            return new Date(task.deadline) < new Date();
          }
          return false;
        });
        break;
      case 'today':
        filtered = filtered.filter(task => {
          if (task.deadline) {
            const taskDate = new Date(task.deadline).toDateString();
            const today = new Date().toDateString();
            return taskDate === today;
          }
          return false;
        });
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.task?.toLowerCase().includes(searchLower) ||
        task.client_name?.toLowerCase().includes(searchLower) ||
        task.notes?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  },

  // Get priority badge color
  getPriorityBadgeColor: (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  },

  // Get status badge color
  getStatusBadgeColor: (status) => {
    switch (status?.toLowerCase()) {
      case 'done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  },

  // Format date for display
  formatDate: (dateString) => {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  },

  // Check if task is overdue
  isTaskOverdue: (task) => {
    if (task.status === 'done' || !task.deadline) return false;
    return new Date(task.deadline) < new Date();
  },

  // Get performance level based on completion rate
  getPerformanceLevel: (completionRate) => {
    if (completionRate >= 90) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (completionRate >= 75) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (completionRate >= 50) return { level: 'Average', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-100' };
  },

  // Clear all state
  clearState: () => set({
    activeFilter: 'all',
    searchTerm: '',
    expandedTasks: {},
    error: null
  })
}));

export default useUserPerformanceDetailStore;