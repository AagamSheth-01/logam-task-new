/**
 * Dashboard Upcoming Tasks API
 * Returns user's upcoming tasks with deadlines
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
  const { limit = 10 } = req.query;

  try {
    let tasks;

    // Always get user-specific tasks for privacy
    // Admin privileges removed to ensure users only see their own data
    tasks = await taskService.getUserUpcomingTasks(
      currentUser.username,
      currentUser.tenantId,
      parseInt(limit)
    );


    // Sort by deadline (soonest first)
    const upcomingTasks = tasks
      .filter(task => task.deadline && task.status !== 'done')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, parseInt(limit))
      .map(task => {
        // Safe date conversion
        let deadlineDate;
        try {
          if (task.deadline._seconds && task.deadline._nanoseconds) {
            // Firebase Timestamp
            deadlineDate = new Date(task.deadline._seconds * 1000);
          } else {
            deadlineDate = new Date(task.deadline);
          }
        } catch (error) {
          console.error('Error parsing deadline:', error, task.deadline);
          deadlineDate = new Date(); // Default to today
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day
        deadlineDate.setHours(0, 0, 0, 0); // Set to start of day

        const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));


        return {
          id: task.id,
          title: task.task || task.title || task.name || task.description || task.subject || 'Untitled Task',
          description: task.description,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          assigned_to: task.assigned_to,
          created_at: task.created_at,
          daysUntilDeadline
        };
      });

    return successResponse(res, upcomingTasks, 'Upcoming tasks retrieved successfully');

  } catch (error) {
    console.error('Error loading upcoming tasks:', error);
    return errorResponse(res, error.message || 'Failed to load upcoming tasks', 500);
  }
});