// pages/api/tasks/index.js - Updated to use Firebase instead of Google Sheets
import { requireAuth } from '../../../lib/auth.js';
import { loadTasks, addTask, getUserTasks } from '../../../lib/firebaseService.js';
// import { sendTaskAssignmentEmail } from '../../../lib/email.js'; // Disabled - using in-app notifications only
import { loadUsers } from '../../../lib/firebaseService';
import { broadcastNotification } from '../notifications/stream.js';

async function handler(req, res) {
  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;

  console.log('🔐 Incoming request to /api/tasks');
  console.log('🔐 Authenticated user:', req.user);

  if (req.method === 'GET') {
    try {
      const { user: username, all } = req.query;

      // If admin requests all tasks
      if (all && req.user.role?.toLowerCase() === 'admin') {
        console.log('📋 Admin requesting all tasks');
        const allTasks = await loadTasks(tenantId);
        return res.status(200).json({ success: true, tasks: allTasks || [] });
      }

      // If specific user is requested
      if (username) {
        console.log("🔁 /api/tasks called with user:", username);
        console.log("🔁 Authenticated user from token:", req.user);

        if (req.user.role?.toLowerCase() === 'admin' || req.user.username === username) {
          console.log('✅ Authorized to fetch tasks for:', username);
          const tasks = await getUserTasks(username, tenantId);
          return res.status(200).json({ success: true, tasks: tasks || [] });
        } else {
          return res.status(403).json({
            success: false,
            message: 'You can only access your own tasks'
          });
        }
      }

      // Default: return current user's tasks
      const currentUsername = req.user.username;
      console.log('📋 Getting tasks for current user:', currentUsername);
      const tasks = await getUserTasks(currentUsername, tenantId);
      return res.status(200).json({ success: true, tasks: tasks || [] });
      
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load tasks',
        error: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { task, assigned_to, client_name, deadline, priority, assignerNotes, assignerPrivateNotes } = req.body;

      console.log('📝 Creating new task:', { task, assigned_to, client_name, deadline, priority });

      // Enhanced validation
      const errors = [];

      // Required fields validation
      if (!task || !task.trim()) {
        errors.push('Task description is required');
      }

      if (!assigned_to || !assigned_to.trim()) {
        errors.push('Assigned user is required');
      }

      if (!deadline) {
        errors.push('Deadline is required');
      } else {
        const deadlineDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (deadlineDate < today) {
          errors.push('Deadline cannot be in the past');
        }
        
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        if (deadlineDate > maxDate) {
          errors.push('Deadline cannot be more than 1 year in the future');
        }
      }

      // Priority validation
      const validPriorities = ['Low', 'Medium', 'High'];
      if (priority && !validPriorities.includes(priority)) {
        errors.push('Priority must be Low, Medium, or High');
      }

      // Notes validation
      if (assignerNotes && assignerNotes.length > 2000) {
        errors.push('Assignment notes cannot exceed 2000 characters');
      }

      if (assignerPrivateNotes && assignerPrivateNotes.length > 2000) {
        errors.push('Private notes cannot exceed 2000 characters');
      }

      // Client name validation
      if (client_name && client_name.trim().length > 100) {
        errors.push('Client name cannot exceed 100 characters');
      }

      // Return validation errors
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      // Prepare task data
      const taskData = {
        task: task.trim(),
        assigned_to: assigned_to.trim(),
        client_name: client_name?.trim() || '',
        deadline: deadline,
        priority: priority || 'Medium',
        given_by: req.user.username,
        assignerNotes: assignerNotes?.trim() || '',
        assignerPrivateNotes: assignerPrivateNotes?.trim() || ''
      };

      // Add task to Firebase
      const newTask = await addTask(taskData, tenantId);
      console.log('✅ Task created successfully:', newTask.id);

      // Email notifications disabled - using in-app notifications only
      // Load users for notifications (disabled)
      // const users = await loadUsers(tenantId);
      // const assignedUser = users.find(u => u.username === assigned_to);
      // try {
      //   console.log('📧 Sending assignment email...');
      //   if (assignedUser && assignedUser.email) {
      //     await sendTaskAssignmentEmail(
      //       assignedUser.email,
      //       assignedUser.username,
      //       task,
      //       req.user.username,
      //       deadline,
      //       priority,
      //       client_name
      //     );
      //     console.log('✅ Assignment email sent to:', assignedUser.email);
      //   } else {
      //     console.log('⚠️ Assigned user not found or has no email');
      //   }
      // } catch (emailError) {
      //   console.warn('📧 Assignment email failed:', emailError.message);
      // }

      // Send real-time notification via SSE
      try {
        console.log('📢 Broadcasting task assignment notification...');
        const priorityMap = {
          'High': 'high',
          'Medium': 'medium',
          'Low': 'low'
        };

        broadcastNotification({
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `${req.user.username} assigned you: "${task}"`,
          timestamp: new Date().toISOString(),
          priority: priorityMap[priority] || 'medium',
          data: {
            taskId: newTask.id,
            assignedBy: req.user.username,
            deadline: deadline,
            priority: priority,
            clientName: client_name
          }
        }, { username: assigned_to });
        console.log('✅ Real-time notification broadcasted to:', assigned_to);
      } catch (notifError) {
        console.warn('📢 Real-time notification failed:', notifError.message);
        // Don't fail the request if notification fails
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Task created successfully',
        task: newTask
      });
      
    } catch (error) {
      console.error('❌ Error creating task:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create task',
        error: error.message 
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

export default requireAuth(handler);