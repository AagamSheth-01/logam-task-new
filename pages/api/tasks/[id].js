// pages/api/tasks/[id].js - Individual task management API
import { requireAuth } from '../../../lib/auth.js';
import { updateTask, deleteTask, getTaskById } from '../../../lib/firebaseService.js';
import { broadcastNotification } from '../notifications/stream.js';
// import { sendTaskCompletionEmail } from '../../../lib/email.js'; // Disabled - using in-app notifications only
// import { loadUsers } from '../../../lib/firebaseService.js';

async function handler(req, res) {
  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;
  const { id } = req.query;

  console.log('🔐 Incoming request to /api/tasks/[id]:', req.method, 'for task:', id);
  console.log('🔐 Authenticated user:', req.user);

  if (req.method === 'GET') {
    try {
      const task = await getTaskById(id, tenantId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check if user can view this task
      const canView = req.user.role?.toLowerCase() === 'admin' || 
                      task.assigned_to === req.user.username || 
                      task.given_by === req.user.username;
      
      if (!canView) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to view this task' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        task: task 
      });
      
    } catch (error) {
      console.error('❌ Error fetching task:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch task',
        error: error.message 
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const task = await getTaskById(id, tenantId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check if user can update this task
      const canUpdate = req.user.role?.toLowerCase() === 'admin' || 
                        task.assigned_to === req.user.username || 
                        task.given_by === req.user.username;
      
      if (!canUpdate) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to update this task' 
        });
      }

      const updateData = req.body;

      // Validate status if provided
      if (updateData.status && !['pending', 'done'].includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be "pending" or "done"'
        });
      }

      // Validate priority if provided
      if (updateData.priority && !['Low', 'Medium', 'High'].includes(updateData.priority)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid priority. Must be "Low", "Medium", or "High"'
        });
      }

      // Track status change for notifications
      const oldStatus = task.status;
      const statusChanged = updateData.status && updateData.status !== oldStatus;
      const taskCompleted = statusChanged && updateData.status === 'done';

      // Update the task
      const updatedTask = await updateTask(id, updateData, tenantId);

      console.log('✅ Task updated successfully:', id);

      // Send notifications for task completion
      if (taskCompleted) {
        try {
          console.log('🎉 Task completed, sending notifications...');

          // Notify task assigner (given_by)
          broadcastNotification({
            type: 'task_completed',
            title: 'Task Completed',
            message: `${req.user.username} completed: "${task.task}"`,
            timestamp: new Date().toISOString(),
            priority: 'medium',
            data: {
              taskId: id,
              completedBy: req.user.username,
              completedDate: new Date().toISOString(),
              task: task.task,
              // Add flag for daily task logger integration
              addToDailyLog: true
            }
          }, { username: task.given_by });

          // Email notifications disabled - using in-app notifications only
          // try {
          //   const users = await loadUsers(tenantId);
          //   const assigner = users.find(u => u.username === task.given_by);
          //   if (assigner && assigner.email) {
          //     await sendTaskCompletionEmail(
          //       assigner.email,
          //       assigner.username,
          //       task.task,
          //       req.user.username
          //     );
          //     console.log('✅ Task completion email sent to:', assigner.email);
          //   }
          // } catch (emailError) {
          //   console.warn('📧 Completion email failed:', emailError.message);
          // }

          console.log('✅ Task completion notifications sent');
        } catch (notifError) {
          console.warn('📢 Task completion notification failed:', notifError.message);
        }
      } else if (statusChanged) {
        // Send general status change notification
        try {
          broadcastNotification({
            type: 'task_updated',
            title: 'Task Status Changed',
            message: `"${task.task}" status changed from ${oldStatus} to ${updateData.status}`,
            timestamp: new Date().toISOString(),
            priority: 'low',
            data: {
              taskId: id,
              updatedBy: req.user.username,
              oldStatus: oldStatus,
              newStatus: updateData.status
            }
          }, { username: task.given_by });
        } catch (notifError) {
          console.warn('📢 Status change notification failed:', notifError.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        task: updatedTask
      });
      
    } catch (error) {
      console.error('❌ Error updating task:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update task',
        error: error.message 
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const task = await getTaskById(id, tenantId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check if user can delete this task
      const canDelete = req.user.role?.toLowerCase() === 'admin' ||
                        task.given_by === req.user.username;

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this task'
        });
      }

      await deleteTask(id, tenantId);

      console.log('✅ Task deleted successfully:', id);
      return res.status(200).json({ 
        success: true, 
        message: 'Task deleted successfully' 
      });
      
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete task',
        error: error.message 
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
}

export default requireAuth(handler);