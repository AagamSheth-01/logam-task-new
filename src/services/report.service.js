/**
 * Report Service
 * Handles report generation and performance summaries
 */

import { taskRepository, userRepository } from '../repositories/index.js';
import { getUserPerformanceSummary } from '../../lib/firebaseService.js';

export class ReportService {
  /**
   * Get user performance summary
   * Uses existing firebaseService function for complex aggregation
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Performance summary
   */
  async getUserPerformanceSummary(tenantId) {
    try {
      const performance = await getUserPerformanceSummary(tenantId);
      return performance;
    } catch (error) {
      console.error('Error getting user performance summary:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive performance report
   * Includes task statistics, user statistics, and performance metrics
   * @param {string} tenantId - Organization ID
   * @param {string} generatedBy - Username of report generator
   * @returns {Promise<Object>} Comprehensive report data
   */
  async generatePerformanceReport(tenantId, generatedBy) {
    try {
      // Fetch all required data in parallel
      const [tasks, users, performance] = await Promise.all([
        taskRepository.find({ tenantId }),
        userRepository.findByTenant(tenantId),
        this.getUserPerformanceSummary(tenantId)
      ]);

      // Calculate task statistics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const pendingTasks = totalTasks - completedTasks;

      // Calculate overdue tasks
      const now = new Date();
      const overdueTasks = tasks.filter(t => {
        if (t.status === 'done' || !t.deadline) return false;
        try {
          return new Date(t.deadline) < now;
        } catch (dateError) {
          return false;
        }
      }).length;

      // Calculate user statistics
      const userStats = users.map(user => {
        const userTasks = tasks.filter(t => t.assigned_to === user.username);
        const userCompleted = userTasks.filter(t => t.status === 'done').length;

        return {
          username: user.username,
          role: user.role,
          email: user.email,
          totalTasks: userTasks.length,
          completedTasks: userCompleted,
          completionRate: userTasks.length > 0
            ? Math.round((userCompleted / userTasks.length) * 100)
            : 0
        };
      });

      // Calculate priority breakdown
      const priorityBreakdown = {
        high: tasks.filter(t => t.priority === 'High').length,
        medium: tasks.filter(t => t.priority === 'Medium').length,
        low: tasks.filter(t => t.priority === 'Low').length
      };

      // Calculate status breakdown
      const statusBreakdown = {
        done: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks
      };

      // Overall completion rate
      const overallCompletionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      return {
        generated_on: new Date().toISOString(),
        generated_by: generatedBy,
        summary: {
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
          totalUsers: users.length,
          overallCompletionRate
        },
        userStatistics: userStats,
        performance,
        taskBreakdown: {
          byPriority: priorityBreakdown,
          byStatus: statusBreakdown
        }
      };
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Generate task distribution report
   * Shows how tasks are distributed across users and priorities
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Task distribution data
   */
  async generateTaskDistributionReport(tenantId) {
    try {
      const tasks = await taskRepository.find({ tenantId });

      // Group tasks by assigned user
      const tasksByUser = {};
      tasks.forEach(task => {
        const assignee = task.assigned_to || 'Unassigned';
        if (!tasksByUser[assignee]) {
          tasksByUser[assignee] = {
            total: 0,
            completed: 0,
            pending: 0,
            byPriority: { High: 0, Medium: 0, Low: 0 }
          };
        }
        tasksByUser[assignee].total++;
        if (task.status === 'done') {
          tasksByUser[assignee].completed++;
        } else {
          tasksByUser[assignee].pending++;
        }
        const priority = task.priority || 'Medium';
        tasksByUser[assignee].byPriority[priority]++;
      });

      return {
        distributionByUser: tasksByUser,
        totalTasks: tasks.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating task distribution report:', error);
      throw error;
    }
  }
}

export default ReportService;
