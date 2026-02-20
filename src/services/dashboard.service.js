/**
 * Dashboard Service
 * Provides dashboard statistics and summaries
 */

import { taskRepository } from '../repositories/index.js';
import { ValidationError } from '../utils/errors.js';

export class DashboardService {
  constructor() {
    this.taskRepository = taskRepository;
  }

  /**
   * Calculate summary from already-fetched tasks (FAST)
   * @param {Array} tasks - Array of tasks
   * @returns {Object} Dashboard summary
   */
  calculateSummaryFromTasks(tasks) {
    const total = tasks.length;

    // Handle multiple possible status values for completed tasks
    const completedStatuses = ['done', 'completed', 'finished', 'complete'];
    const completed = tasks.filter(t => {
      const status = t.status ? t.status.toLowerCase() : '';
      return completedStatuses.includes(status);
    }).length;

    const pending = total - completed;

    // Calculate overdue tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = tasks.filter(task => {
      // Use the same completed status logic
      const status = task.status ? task.status.toLowerCase() : '';
      const isCompleted = completedStatuses.includes(status);

      if (isCompleted || !task.deadline) return false;
      try {
        const deadline = new Date(task.deadline);
        return deadline < today;
      } catch (e) {
        return false;
      }
    }).length;

    return { total, completed, pending, overdue };
  }

  /**
   * Calculate performance from already-fetched tasks (FAST)
   * @param {Array} tasks - Array of tasks
   * @returns {Object} Performance summary by user
   */
  calculatePerformanceFromTasks(tasks) {
    const summary = {};

    tasks.forEach(task => {
      const user = task.assigned_to;
      if (!user) return;

      if (!summary[user]) {
        summary[user] = {
          username: user,
          total: 0,
          completed: 0,
          pending: 0,
          time_spent: 0
        };
      }

      summary[user].total++;

      if (task.status === 'done') {
        summary[user].completed++;

        if (task.time_spent) {
          try {
            let totalHours = 0;
            if (task.time_spent.includes('days')) {
              const [days, hms] = task.time_spent.split(' days, ');
              const [h, m] = hms.split(':');
              totalHours = parseInt(days) * 24 + parseInt(h) + parseInt(m) / 60;
            } else {
              const [h, m] = task.time_spent.split(':');
              totalHours = parseInt(h) + parseInt(m) / 60;
            }
            summary[user].time_spent += Math.round(totalHours * 100) / 100;
          } catch (e) {
            // Skip invalid time entries
          }
        }
      } else {
        summary[user].pending++;
      }
    });

    return summary;
  }

  /**
   * Get dashboard summary statistics
   * Calculates total, completed, pending, and overdue tasks
   * @param {string|null} username - Optional username to filter by
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Dashboard summary
   */
  async getDashboardSummary(username = null, tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    try {
      let tasks;

      if (username) {
        // Get tasks for specific user
        tasks = await this.taskRepository.findByUser(username, tenantId);
      } else {
        // Get all tasks for tenant
        tasks = await this.taskRepository.find({ tenantId });
      }

      const total = tasks.length;

      // Handle multiple possible status values for completed tasks
      const completedStatuses = ['done', 'completed', 'finished', 'complete'];
      const completed = tasks.filter(t => {
        const status = t.status ? t.status.toLowerCase() : '';
        return completedStatuses.includes(status);
      }).length;

      const pending = total - completed;

      // Calculate overdue tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdue = tasks.filter(task => {
        // Use the same completed status logic
        const status = task.status ? task.status.toLowerCase() : '';
        const isCompleted = completedStatuses.includes(status);

        if (isCompleted || !task.deadline) {
          return false;
        }

        try {
          const deadline = new Date(task.deadline);
          return deadline < today;
        } catch (dateError) {
          console.error('Error parsing deadline:', dateError);
          return false;
        }
      }).length;

      return {
        total,
        completed,
        pending,
        overdue
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get user performance summary
   * Calculates task statistics grouped by user
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Performance summary by user
   */
  async getUserPerformanceSummary(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    try {
      const tasks = await this.taskRepository.find({ tenantId });
      const summary = {};

      tasks.forEach(task => {
        const user = task.assigned_to;
        if (!user) return;

        // Initialize user summary if not exists
        if (!summary[user]) {
          summary[user] = {
            username: user,
            total: 0,
            completed: 0,
            pending: 0,
            time_spent: 0
          };
        }

        summary[user].total++;

        if (task.status === 'done') {
          summary[user].completed++;

          // Parse time spent
          if (task.time_spent) {
            try {
              let totalHours = 0;

              if (task.time_spent.includes('days')) {
                // Format: "X days, HH:MM"
                const [days, hms] = task.time_spent.split(' days, ');
                const [h, m] = hms.split(':');
                totalHours = parseInt(days) * 24 + parseInt(h) + parseInt(m) / 60;
              } else {
                // Format: "HH:MM"
                const [h, m] = task.time_spent.split(':');
                totalHours = parseInt(h) + parseInt(m) / 60;
              }

              summary[user].time_spent += Math.round(totalHours * 100) / 100;
            } catch (timeError) {
              console.error('Error parsing time_spent:', timeError);
              // Skip invalid time entries
            }
          }
        } else {
          summary[user].pending++;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error getting user performance summary:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive performance data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Detailed performance metrics
   */
  async getPerformanceData(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    try {
      const tasks = await this.taskRepository.find({ tenantId });
      const userPerformance = await this.getUserPerformanceSummary(tenantId);

      // Calculate team-wide metrics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

      // Calculate completion rate
      const completionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // Get unique users
      const uniqueUsers = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];

      // Calculate overdue tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueTasks = tasks.filter(task => {
        if (task.status === 'done' || !task.deadline) return false;
        try {
          const deadline = new Date(task.deadline);
          return deadline < today;
        } catch (e) {
          return false;
        }
      }).length;

      return {
        teamMetrics: {
          totalTasks,
          completedTasks,
          pendingTasks,
          inProgressTasks,
          overdueTasks,
          completionRate,
          activeUsers: uniqueUsers.length
        },
        userPerformance,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting performance data:', error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics for a specific date range
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStatsByDateRange(startDate, endDate, tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    try {
      const tasks = await this.taskRepository.find({ tenantId });

      // Filter tasks by date range
      const start = new Date(startDate);
      const end = new Date(endDate);

      const filteredTasks = tasks.filter(task => {
        if (!task.createdAt) return false;
        try {
          const taskDate = task.createdAt?.toDate?.() || new Date(task.createdAt);
          return taskDate >= start && taskDate <= end;
        } catch (e) {
          return false;
        }
      });

      const total = filteredTasks.length;
      const completed = filteredTasks.filter(t => t.status === 'done').length;
      const pending = filteredTasks.filter(t => t.status === 'pending').length;
      const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;

      return {
        dateRange: {
          start: startDate,
          end: endDate
        },
        total,
        completed,
        pending,
        inProgress,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting dashboard stats by date range:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
