/**
 * Dashboard Recent Activity API
 * Returns user's recent task activity and updates
 */

import { asyncHandler, authenticate } from '../../../src/middleware/index.js';
import { taskService } from '../../../src/services/index.js';
import { successResponse, errorResponse } from '../../../src/utils/response.util.js';

export default asyncHandler(async (req, res) => {
  // Only allow GET method
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return errorResponse(res, 'Method not allowed', 405);
  }

  // Authenticate user
  await authenticate(req, res);

  const currentUser = req.user;
  const { limit = 20 } = req.query;

  try {
    let tasks;

    // Always get user-specific tasks for privacy
    // Admin privileges removed to ensure users only see their own data
    tasks = await taskService.getUserRecentTasks(
      currentUser.username,
      currentUser.tenantId,
      parseInt(limit)
    );

    // Process tasks into activity items
    const recentActivity = tasks
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, parseInt(limit))
      .map(task => {
        const isUpdated = task.updated_at && task.updated_at !== task.created_at;
        const activityDate = isUpdated ? task.updated_at : task.created_at;


        return {
          id: task.id,
          title: task.task || task.title || task.name || task.description || task.subject || 'Untitled Task',
          status: task.status,
          priority: task.priority,
          assigned_to: task.assigned_to,
          created_by: task.created_by,
          updated_by: task.updated_by,
          activity_type: isUpdated ? 'updated' : 'created',
          activity_date: activityDate,
          deadline: task.deadline,
          timeAgo: getTimeAgo(activityDate)
        };
      });

    return successResponse(res, recentActivity, 'Recent activity retrieved successfully');

  } catch (error) {
    console.error('Error loading recent activity:', error);
    return errorResponse(res, error.message || 'Failed to load recent activity', 500);
  }
});

/**
 * Helper function to calculate time ago
 */
function getTimeAgo(dateInput) {
  try {
    // Handle different date formats
    let date;
    if (!dateInput) {
      return 'Unknown';
    }

    // Convert Firebase Timestamp or string to Date
    if (dateInput._seconds && dateInput._nanoseconds) {
      // Firebase Timestamp object
      date = new Date(dateInput._seconds * 1000);
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      // Try to convert to date
      date = new Date(dateInput);
    }

    // Validate the date
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error calculating time ago:', error, dateInput);
    return 'Unknown';
  }
}