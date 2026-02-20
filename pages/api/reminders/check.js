// API endpoint to check and send deadline reminders
// This should be called periodically (e.g., via cron job or Next.js API route)
import { verifyToken } from '../../../lib/auth';
import { loadTasks } from '../../../lib/firebaseService';
import { broadcastNotification } from '../notifications/stream';
import { sendEmail } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Verify Vercel Cron secret or admin auth
  const cronSecret = req.headers['x-vercel-cron-secret'] || req.headers['authorization'];

  // Allow Vercel Cron (using secret) or authenticated admin
  let tenantId = null;
  let isAuthorized = false;

  if (cronSecret === process.env.CRON_SECRET) {
    // Vercel Cron authenticated
    isAuthorized = true;
    tenantId = null; // Will process all tenants
    console.log('✅ Vercel Cron authenticated');
  } else if (cronSecret?.startsWith('Bearer ')) {
    // Manual admin trigger
    const token = cronSecret.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (decoded && decoded.valid && decoded.user?.role?.toLowerCase() === 'admin') {
      isAuthorized = true;
      tenantId = decoded.user.tenantId || decoded.tenantId;
      console.log('✅ Admin authenticated:', decoded.user.username);
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Only admins or Vercel Cron can trigger reminder checks'
    });
  }

  try {
    console.log('🔔 Checking for deadline reminders...');

    // Load all active tasks
    const allTasks = await loadTasks(tenantId);
    const activeTasks = allTasks.filter(task => task.status !== 'done');

    const now = new Date();
    const remindersSent = [];

    for (const task of activeTasks) {
      if (!task.deadline) continue;

      const deadline = new Date(task.deadline);
      const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);

      // Skip if deadline has passed
      if (hoursUntilDeadline < 0) continue;

      let shouldRemind = false;
      let priorityLevel = 'medium';
      let reminderType = 'deadline_reminder';

      // Critical: Less than 1 hour
      if (hoursUntilDeadline <= 1 && hoursUntilDeadline > 0.75) {
        shouldRemind = true;
        priorityLevel = 'critical';
        reminderType = 'deadline_critical';
      }
      // High: Less than 3 hours
      else if (hoursUntilDeadline <= 3 && hoursUntilDeadline > 2.75) {
        shouldRemind = true;
        priorityLevel = 'high';
      }
      // Medium: Less than 24 hours
      else if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 23.75) {
        shouldRemind = true;
        priorityLevel = 'medium';
      }
      // Low: 3 days notice
      else if (hoursUntilDeadline <= 72 && hoursUntilDeadline > 71.75) {
        shouldRemind = true;
        priorityLevel = 'low';
      }

      if (shouldRemind) {
        const isCritical = priorityLevel === 'critical';

        // Send real-time notification
        try {
          broadcastNotification({
            type: reminderType,
            title: isCritical ? '🚨 URGENT: Deadline Approaching' : '⏰ Deadline Reminder',
            message: `"${task.task}" is due ${formatTimeRemaining(hoursUntilDeadline)}`,
            timestamp: new Date().toISOString(),
            priority: priorityLevel,
            data: {
              taskId: task.id,
              deadline: task.deadline,
              priority: task.priority,
              hoursRemaining: hoursUntilDeadline,
              task: task.task
            }
          }, { username: task.assigned_to });

          remindersSent.push({
            task: task.task,
            assignedTo: task.assigned_to,
            hoursRemaining: hoursUntilDeadline,
            priority: priorityLevel
          });

          console.log(`✅ Reminder sent for task "${task.task}" to ${task.assigned_to}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder for task "${task.task}":`, error);
        }
      }
    }

    console.log(`🔔 Reminder check complete. Sent ${remindersSent.length} reminders.`);

    return res.status(200).json({
      success: true,
      message: `Sent ${remindersSent.length} deadline reminders`,
      reminders: remindersSent
    });

  } catch (error) {
    console.error('❌ Error checking reminders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check reminders',
      error: error.message
    });
  }
}

function formatTimeRemaining(hoursRemaining) {
  if (hoursRemaining < 1) {
    const minutes = Math.round(hoursRemaining * 60);
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (hoursRemaining < 24) {
    const hours = Math.round(hoursRemaining);
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.round(hoursRemaining / 24);
    return `in ${days} day${days !== 1 ? 's' : ''}`;
  }
}
