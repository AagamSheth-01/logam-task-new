/**
 * Analytics Service
 * Handles analytics and statistics calculations
 */

import { taskRepository } from '../repositories/index.js';
import { dailyTaskRepository } from '../repositories/index.js';

export class AnalyticsService {
  /**
   * Get graphic designer analytics for a specific user
   * Calculates task completion rates, daily task stats, and productivity metrics
   * @param {string} username - Username to get analytics for
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Analytics data
   */
  async getGraphicDesignerAnalytics(username, tenantId) {
    try {
      // Get all tasks for this user
      const allTasks = await taskRepository.find({ tenantId });
      const userTasks = allTasks.filter(task => task.assigned_to === username);

      // Get daily tasks for this user
      const allDailyTasks = await dailyTaskRepository.findByTenant(tenantId);
      const userDailyTasks = allDailyTasks.filter(dt => dt.username === username);

      // Calculate task statistics
      const totalTasks = userTasks.length;
      const completedTasks = userTasks.filter(t => t.status === 'done').length;
      const pendingTasks = userTasks.filter(t => t.status === 'pending').length;
      const inProgressTasks = userTasks.filter(t => t.status === 'in_progress').length;

      // Calculate priority breakdown
      const highPriorityTasks = userTasks.filter(t => t.priority === 'High').length;
      const mediumPriorityTasks = userTasks.filter(t => t.priority === 'Medium').length;
      const lowPriorityTasks = userTasks.filter(t => t.priority === 'Low').length;

      // Calculate overdue tasks
      const now = new Date();
      const overdueTasks = userTasks.filter(t => {
        if (t.status === 'done' || !t.deadline) return false;
        try {
          return new Date(t.deadline) < now;
        } catch (e) {
          return false;
        }
      }).length;

      // Calculate completion rate
      const completionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // Calculate daily task statistics
      const totalDailyTasks = userDailyTasks.length;
      const completedDailyTasks = userDailyTasks.filter(dt => dt.completed).length;
      const dailyCompletionRate = totalDailyTasks > 0
        ? Math.round((completedDailyTasks / totalDailyTasks) * 100)
        : 0;

      // Get recent completed tasks (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentlyCompleted = userTasks.filter(t => {
        if (t.status !== 'done' || !t.completedAt) return false;
        try {
          const completedDate = t.completedAt?.toDate?.() || new Date(t.completedAt);
          return completedDate >= sevenDaysAgo;
        } catch (e) {
          return false;
        }
      }).length;

      // Calculate average tasks per week
      const tasksPerWeek = recentlyCompleted;

      return {
        username,
        taskStatistics: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          overdue: overdueTasks,
          completionRate
        },
        priorityBreakdown: {
          high: highPriorityTasks,
          medium: mediumPriorityTasks,
          low: lowPriorityTasks
        },
        dailyTasks: {
          total: totalDailyTasks,
          completed: completedDailyTasks,
          completionRate: dailyCompletionRate
        },
        productivity: {
          recentlyCompleted,
          tasksPerWeek,
          averageCompletionRate: Math.round((completionRate + dailyCompletionRate) / 2)
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating graphic designer analytics:', error);
      throw error;
    }
  }

  /**
   * Get team-wide analytics
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Team analytics
   */
  async getTeamAnalytics(tenantId) {
    try {
      const allTasks = await taskRepository.find({ tenantId });

      // Calculate overall statistics
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.status === 'done').length;
      const pendingTasks = allTasks.filter(t => t.status === 'pending').length;

      const completionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // Get unique users
      const uniqueUsers = [...new Set(allTasks.map(t => t.assigned_to))];

      return {
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate,
        activeUsers: uniqueUsers.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating team analytics:', error);
      throw error;
    }
  }
}

export default AnalyticsService;
