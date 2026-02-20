// pages/api/daily-tasks.js (FIXED VERSION with Debug Logging)

import { addDailyTask, getDailyTasks, getAllUsersDailyTasks, getDailyTaskAnalytics, deleteDailyTask, getTodayAttendance, updateAttendanceRecord } from '../../lib/firebaseService.js';
import jwt from 'jsonwebtoken';
import { getIndiaTime, getIndiaDate } from '../../lib/timezone.js';
import { broadcastNotification } from './notifications/stream.js';

// Helper function to generate unique task IDs
const generateTaskId = () => `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

// Helper function to verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Helper function to extract username from token
const getUsernameFromToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  return decoded ? decoded.username : null;
};

// Enhanced validation for daily tasks
const validateDailyTaskData = (data) => {
  const errors = [];
  
  if (!data.date) {
    errors.push('Date is required');
  } else {
    const taskDate = new Date(data.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (taskDate > today) {
      errors.push('Cannot log tasks for future dates');
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (taskDate < thirtyDaysAgo) {
      errors.push('Cannot log tasks older than 30 days');
    }
  }

  if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
    errors.push('At least one task is required');
  } else {
    data.tasks.forEach((task, index) => {
      if (task.id && typeof task.id !== 'string') {
        errors.push(`Task ${index + 1}: Invalid task ID format`);
      }
      
      if (!task.description || !task.description.trim()) {
        errors.push(`Task ${index + 1}: Description is required`);
      } else if (task.description.trim().length < 3) {
        errors.push(`Task ${index + 1}: Description too short (minimum 3 characters)`);
      } else if (task.description.trim().length > 500) {
        errors.push(`Task ${index + 1}: Description too long (maximum 500 characters)`);
      }
      
      if (!task.category) {
        errors.push(`Task ${index + 1}: Category is required`);
      }
      
      const validCategories = [
        'general', 'development', 'design', 'meeting', 'research', 
        'documentation', 'testing', 'support', 'client-work', 'admin'
      ];
      
      if (task.category && !validCategories.includes(task.category)) {
        errors.push(`Task ${index + 1}: Invalid category "${task.category}"`);
      }
      
      if (typeof task.timeSpent !== 'number' || task.timeSpent < 0) {
        errors.push(`Task ${index + 1}: Valid time spent is required`);
      } else if (task.timeSpent > 12) {
        errors.push(`Task ${index + 1}: Time spent (${task.timeSpent}h) seems excessive for a single task`);
      }
      
      if (task.priority && !['low', 'medium', 'high'].includes(task.priority)) {
        errors.push(`Task ${index + 1}: Invalid priority "${task.priority}"`);
      }
    });
    
    const totalHours = data.tasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
    if (totalHours > 16) {
      errors.push(`Total time (${totalHours.toFixed(1)}h) exceeds reasonable daily limit (16h)`);
    }
    if (totalHours === 0) {
      errors.push('Total time cannot be zero. Please log actual time spent.');
    }
  }

  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes too long (maximum 1000 characters)');
  }

  return errors;
};

// Helper function to sanitize and process task data
const processTaskData = (tasks) => {
  return tasks.filter(task => 
    task.description && 
    task.description.trim() && 
    task.category &&
    typeof task.timeSpent === 'number' && 
    task.timeSpent >= 0
  ).map(task => ({
    id: task.id || generateTaskId(),
    description: task.description.trim(),
    category: task.category,
    timeSpent: Math.round(task.timeSpent * 100) / 100,
    priority: task.priority || 'medium'
  }));
};

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify authentication for all requests
  const authHeader = req.headers.authorization;
  const username = getUsernameFromToken(authHeader);

  if (!username) {
    console.log('❌ Authentication failed:', authHeader ? 'Invalid token' : 'Missing token');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing token'
    });
  }

  // Get user role and tenantId for admin-only operations
  const decoded = verifyToken(authHeader.split(' ')[1]);
  const isAdmin = decoded && decoded.role && decoded.role.toLowerCase() === 'admin';

  // Multi-tenancy: Extract tenantId from authenticated request
  const tenantId = decoded?.tenantId;

  console.log(`🔍 Daily Tasks API - ${req.method} request from ${username} (${isAdmin ? 'admin' : 'user'})`);

  try {
    if (req.method === 'POST') {
      // Handle daily task creation/update
      const { date, tasks, totalHours, notes } = req.body;

      console.log('📝 Creating daily task:', { 
        username, 
        date, 
        tasksCount: tasks?.length, 
        totalHours,
        hasNotes: !!notes 
      });

      // Enhanced validation
      const validationErrors = validateDailyTaskData(req.body);
      if (validationErrors.length > 0) {
        console.log('❌ Validation failed:', validationErrors);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      // Process and clean tasks
      const validTasks = processTaskData(tasks);

      if (validTasks.length === 0) {
        console.log('❌ No valid tasks after processing');
        return res.status(400).json({
          success: false,
          message: 'No valid tasks provided after processing'
        });
      }

      // Calculate total hours
      const calculatedTotalHours = validTasks.reduce((sum, task) => sum + task.timeSpent, 0);
      const finalTotalHours = totalHours ? 
        Math.abs(totalHours - calculatedTotalHours) < 0.1 ? totalHours : calculatedTotalHours 
        : calculatedTotalHours;

      // Prepare daily task data
      const dailyTaskData = {
        username: username,
        date: date,
        tasks: validTasks,
        totalHours: Math.round(finalTotalHours * 100) / 100,
        notes: notes?.trim() || '',
        submittedBy: username,
        metadata: {
          taskCount: validTasks.length,
          categories: [...new Set(validTasks.map(t => t.category))],
          averageTaskTime: validTasks.length > 0 ? finalTotalHours / validTasks.length : 0,
          highPriorityTasks: validTasks.filter(t => t.priority === 'high').length,
          mediumPriorityTasks: validTasks.filter(t => t.priority === 'medium').length,
          lowPriorityTasks: validTasks.filter(t => t.priority === 'low').length,
          submitTime: new Date().toISOString(),
          version: '2.1'
        }
      };

      console.log('💾 Saving to Firebase:', {
        username: dailyTaskData.username,
        date: dailyTaskData.date,
        taskCount: dailyTaskData.tasks.length,
        totalHours: dailyTaskData.totalHours
      });

      // Save to Firebase
      const savedTask = await addDailyTask(dailyTaskData, tenantId);

      console.log('✅ Successfully saved daily task with ID:', savedTask.id);

      return res.status(200).json({
        success: true,
        message: 'Daily tasks saved successfully',
        dailyTask: savedTask,
        summary: {
          totalHours: finalTotalHours,
          taskCount: validTasks.length,
          categories: dailyTaskData.metadata.categories,
          averageTaskTime: dailyTaskData.metadata.averageTaskTime
        }
      });

    } else if (req.method === 'GET') {
      // Handle daily task retrieval
      const { date, startDate, endDate, allUsers, analytics, user: targetUser } = req.query;

      console.log('📖 Fetching daily tasks:', {
        date, startDate, endDate, allUsers, analytics, targetUser,
        requestedBy: username, isAdmin
      });

      let filters = { tenantId };

      // Check permissions for viewing other users' data
      if (allUsers === 'true' || targetUser) {
        if (!isAdmin) {
          console.log('❌ Non-admin trying to access all users data');
          return res.status(403).json({
            success: false,
            message: 'Forbidden: Admin access required to view all users data'
          });
        }
        console.log('✅ Admin accessing all users data');
      } else {
        // Regular user can only see their own data
        filters.username = username;
        console.log('👤 User accessing own data only');
      }

      // Apply specific user filter for admin requests
      if (targetUser && isAdmin) {
        filters.username = targetUser;
        console.log('🎯 Admin viewing specific user:', targetUser);
      }

      // Apply date filters
      if (date) {
        filters.date = date;
        console.log('📅 Filtering by date:', date);
      } else if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 90) {
          console.log('❌ Date range too large:', diffDays);
          return res.status(400).json({
            success: false,
            message: 'Date range cannot exceed 90 days'
          });
        }
        
        filters.startDate = startDate;
        filters.endDate = endDate;
        console.log('📅 Filtering by date range:', startDate, 'to', endDate);
      }

      console.log('🔍 Applied filters:', filters);

      if (analytics === 'true' && isAdmin) {
        console.log('📊 Fetching analytics data...');
        const analyticsData = await getDailyTaskAnalytics(filters);
        console.log('📊 Analytics data retrieved:', {
          userCount: analyticsData.uniqueUsers,
          totalHours: analyticsData.totalHours,
          totalTasks: analyticsData.totalTasks
        });
        return res.status(200).json({
          success: true,
          analytics: analyticsData
        });
      } else if (allUsers === 'true' && isAdmin) {
        console.log('👥 Fetching all users data...');
        const allUsersData = await getAllUsersDailyTasks(filters);
        console.log('👥 All users data retrieved:', {
          entryCount: allUsersData.dailyTasks?.length || 0,
          uniqueUsers: allUsersData.summary?.uniqueUsers || 0
        });
        return res.status(200).json({
          success: true,
          dailyTasks: allUsersData.dailyTasks || [],
          summary: allUsersData.summary || {},
          userCount: allUsersData.summary?.uniqueUsers || 0,
          totalEntries: allUsersData.dailyTasks?.length || 0
        });
      } else {
        console.log('📖 Fetching individual user data...');
        const dailyTasks = await getDailyTasks(filters);
        console.log('📖 Individual data retrieved:', {
          entryCount: dailyTasks.length,
          user: filters.username
        });

        const response = {
          success: true,
          dailyTasks: dailyTasks,
          count: dailyTasks.length
        };

        // Add statistics if multiple entries
        if (dailyTasks.length > 0) {
          const totalHours = dailyTasks.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
          const totalTasks = dailyTasks.reduce((sum, entry) => sum + (entry.tasks?.length || 0), 0);
          const categories = [...new Set(dailyTasks.flatMap(entry => 
            entry.tasks?.map(task => task.category) || []
          ))];

          const categoryBreakdown = {};
          dailyTasks.forEach(entry => {
            entry.tasks?.forEach(task => {
              categoryBreakdown[task.category] = (categoryBreakdown[task.category] || 0) + task.timeSpent;
            });
          });

          response.stats = {
            totalHours: Math.round(totalHours * 100) / 100,
            totalTasks,
            averageHoursPerDay: dailyTasks.length > 0 ? Math.round((totalHours / dailyTasks.length) * 100) / 100 : 0,
            categoriesUsed: categories.length,
            categoryBreakdown,
            dateRange: {
              start: dailyTasks[dailyTasks.length - 1]?.date,
              end: dailyTasks[0]?.date
            },
            productivity: totalHours > 0 ? Math.round((totalTasks / totalHours) * 100) / 100 : 0
          };

          console.log('📊 Stats calculated:', response.stats);
        }

        return res.status(200).json(response);
      }

    } else if (req.method === 'PUT') {
      // Handle daily task updates
      const { date } = req.query;
      const updateData = req.body;

      console.log('✏️ Updating daily task:', { username, date, updateData });

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date parameter is required for updates'
        });
      }

      // Validate update data
      const validationErrors = validateDailyTaskData({ ...updateData, date });
      if (validationErrors.length > 0) {
        console.log('❌ Update validation failed:', validationErrors);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      // Process tasks
      const validTasks = processTaskData(updateData.tasks);
      const totalHours = validTasks.reduce((sum, task) => sum + task.timeSpent, 0);

      // Update the daily task entry
      const updatedTaskData = {
        ...updateData,
        username,
        date,
        tasks: validTasks,
        totalHours: Math.round(totalHours * 100) / 100,
        submittedBy: username,
        metadata: {
          taskCount: validTasks.length,
          categories: [...new Set(validTasks.map(t => t.category))],
          averageTaskTime: validTasks.length > 0 ? totalHours / validTasks.length : 0,
          lastUpdated: new Date().toISOString(),
          version: '2.1'
        }
      };

      const updatedTask = await addDailyTask(updatedTaskData, tenantId);

      console.log('✅ Successfully updated daily task');

      return res.status(200).json({
        success: true,
        message: 'Daily tasks updated successfully',
        dailyTask: updatedTask
      });

    } else if (req.method === 'DELETE') {
      // Handle daily task deletion
      const { date, user: targetUsername } = req.query;

      console.log('🗑️ Deleting daily task:', { username, date, targetUsername });

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date parameter is required for deletion'
        });
      }

      // Check permissions for deletion
      if (targetUsername && targetUsername !== username && !isAdmin) {
        console.log('❌ Non-admin trying to delete other user entry');
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot delete other users\' entries'
        });
      }

      const usernameToDelete = targetUsername || username;

      try {
        const deleted = await deleteDailyTask(usernameToDelete, date, tenantId);

        if (deleted) {
          console.log('✅ Successfully deleted daily task');
          return res.status(200).json({
            success: true,
            message: 'Daily task entry deleted successfully'
          });
        } else {
          console.log('❌ Daily task entry not found for deletion');
          return res.status(404).json({
            success: false,
            message: 'Daily task entry not found'
          });
        }
      } catch (deleteError) {
        console.error('❌ Error deleting daily task:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete daily task entry'
        });
      }

    } else {
      // Method not allowed
      console.log('❌ Method not allowed:', req.method);
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed`,
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      });
    }

  } catch (error) {
    console.error('💥 Daily tasks API error:', error);
    
    // Enhanced error handling
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Resource not found';
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      statusCode = 400;
      errorMessage = 'Invalid data provided';
    } else if (error.message.includes('unauthorized') || error.message.includes('permission')) {
      statusCode = 403;
      errorMessage = 'Access denied';
    } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      statusCode = 409;
      errorMessage = 'Resource already exists';
    } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
    }
    
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
}

// Export for testing purposes
export { validateDailyTaskData, processTaskData };