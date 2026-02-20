import { requireAuth } from '../../../lib/auth';
// Email notifications disabled - using in-app notifications only
// import { sendTaskAssignmentEmail, sendTaskCompletionEmail } from '../../../lib/email';
// import { loadUsers } from '../../../lib/googleSheets';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Email notifications disabled - using in-app notifications only
  // Return success to not break any callers
  return res.status(200).json({
    success: true,
    message: 'Email notifications disabled. Using in-app notifications only.',
    disabled: true
  });

  // Original email notification code (disabled)
  /*
  const { tenantId } = req;

  try {
    const { type, taskData, userId } = req.body;

    // Load users to get email addresses
    const users = await loadUsers({ tenantId });
    const targetUser = users.find(u => u.username === userId);

    if (!targetUser || !targetUser.email) {
      return res.status(404).json({
        success: false,
        message: 'User not found or no email address'
      });
    }

    let emailResult;

    switch (type) {
      case 'task_assigned':
        emailResult = await sendTaskAssignmentEmail(
          targetUser.email,
          targetUser.username,
          taskData.task,
          taskData.assignedBy || req.user.username,
          taskData.deadline,
          taskData.priority
        );
        break;

      case 'task_completed':
        // Find the user who assigned the task
        const assigner = users.find(u => u.username === taskData.assignedBy);
        if (assigner && assigner.email) {
          emailResult = await sendTaskCompletionEmail(
            assigner.email,
            assigner.username,
            taskData.task,
            taskData.completedBy
          );
        }
        break;

      case 'deadline_reminder':
        // Send deadline reminder email
        emailResult = await sendEmail(
          targetUser.email,
          '⏰ Task Deadline Reminder - Logam Task Manager',
          `Hi ${targetUser.username},

This is a reminder that your task "${taskData.task}" is due on ${taskData.deadline}.

Please log into the Task Manager to update your progress.

Best regards,
Logam Task Manager Pro Team`
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type'
        });
    }

    if (emailResult && emailResult.success) {
      return res.status(200).json({
        success: true,
        message: 'Notification sent successfully',
        messageId: emailResult.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notification email'
      });
    }

  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
  */
}

export default requireAuth(handler);