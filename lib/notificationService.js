// Enhanced Notification Service with Priority Levels, Batching, and Actions
// Supports: Desktop notifications, In-app notifications, Email, Service Worker

// Notification Priority Levels
export const PRIORITY = {
  CRITICAL: 'critical',  // Immediate attention (red, sound, no batching)
  HIGH: 'high',          // Important (orange, sound, minimal batching)
  MEDIUM: 'medium',      // Normal (blue, optional sound, batching allowed)
  LOW: 'low'             // Informational (gray, no sound, batched)
};

// Notification Types
export const NOTIFICATION_TYPE = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TASK_UPDATED: 'task_updated',
  TASK_COMMENT: 'task_comment',
  DEADLINE_REMINDER: 'deadline_reminder',
  DEADLINE_CRITICAL: 'deadline_critical',
  ATTENDANCE_SUBMITTED: 'attendance_submitted',
  ATTENDANCE_APPROVED: 'attendance_approved',
  ATTENDANCE_REJECTED: 'attendance_rejected',
  SYSTEM: 'system',
  ERROR: 'error',
  SUCCESS: 'success'
};

class NotificationService {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'Notification' in window;
    this.permissionGranted = this.isSupported && Notification.permission === 'granted';
    this.batchQueue = [];
    this.batchTimer = null;
    this.serviceWorker = null;
    this.soundEnabled = true;
    this.batchingEnabled = true;

    // Initialize service worker if available
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      this.initServiceWorker();
    }
  }

  // Initialize service worker
  async initServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.ready;
      this.serviceWorker = registration;
      console.log('✅ Service Worker ready for notifications');
    } catch (error) {
      console.warn('⚠️ Service Worker not available:', error);
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';

      if (this.permissionGranted) {
        console.log('✅ Notification permission granted');

        // Show welcome notification
        this.showNotification({
          title: 'Notifications Enabled',
          message: 'You will now receive real-time updates',
          type: NOTIFICATION_TYPE.SUCCESS,
          priority: PRIORITY.LOW
        });
      }

      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Main notification function with smart batching
  showNotification({
    title,
    message,
    type = NOTIFICATION_TYPE.SYSTEM,
    priority = PRIORITY.MEDIUM,
    data = {},
    actions = [],
    icon = null,
    badge = null,
    sound = true,
    vibrate = true
  }) {
    if (!this.permissionGranted) {
      console.warn('Notification permission not granted');
      return false;
    }

    const notification = {
      title,
      message,
      type,
      priority,
      data,
      actions,
      icon: icon || this.getDefaultIcon(type),
      badge: badge || '/icons/badge.png',
      timestamp: new Date().toISOString(),
      sound: sound && this.soundEnabled,
      vibrate: vibrate ? [200, 100, 200] : []
    };

    // Critical and High priority: show immediately, no batching
    if (priority === PRIORITY.CRITICAL || priority === PRIORITY.HIGH || !this.batchingEnabled) {
      return this._showImmediately(notification);
    }

    // Medium and Low priority: batch if enabled
    return this._addToBatch(notification);
  }

  // Show notification immediately
  _showImmediately(notification) {
    try {
      // Play sound if enabled
      if (notification.sound) {
        this._playSound(notification.priority);
      }

      // Vibrate if enabled and supported
      if (notification.vibrate && 'vibrate' in navigator) {
        navigator.vibrate(notification.vibrate);
      }

      // Show desktop notification
      const options = {
        body: notification.message,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.type,
        data: notification.data,
        requireInteraction: notification.priority === PRIORITY.CRITICAL,
        silent: !notification.sound
      };

      // Add action buttons if supported
      if (notification.actions.length > 0 && this.serviceWorker) {
        options.actions = notification.actions.map(action => ({
          action: action.id,
          title: action.label,
          icon: action.icon
        }));
      }

      let desktopNotification;

      // Use Service Worker for persistent notifications if available
      if (this.serviceWorker && this.serviceWorker.showNotification) {
        this.serviceWorker.showNotification(notification.title, options);
      } else {
        desktopNotification = new Notification(notification.title, options);

        // Handle notification click
        desktopNotification.onclick = () => {
          window.focus();
          if (notification.data.url) {
            window.location.href = notification.data.url;
          }
          desktopNotification.close();
        };
      }

      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }

  // Add notification to batch queue
  _addToBatch(notification) {
    this.batchQueue.push(notification);

    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Set new timer to show batched notifications
    const batchDelay = notification.priority === PRIORITY.MEDIUM ? 5000 : 10000;
    this.batchTimer = setTimeout(() => {
      this._showBatchedNotifications();
    }, batchDelay);

    return true;
  }

  // Show all batched notifications
  _showBatchedNotifications() {
    if (this.batchQueue.length === 0) return;

    // Group by type
    const grouped = this.batchQueue.reduce((acc, notif) => {
      if (!acc[notif.type]) {
        acc[notif.type] = [];
      }
      acc[notif.type].push(notif);
      return acc;
    }, {});

    // Show grouped notifications
    Object.entries(grouped).forEach(([type, notifications]) => {
      if (notifications.length === 1) {
        this._showImmediately(notifications[0]);
      } else {
        // Show batched notification
        const firstNotif = notifications[0];
        this._showImmediately({
          ...firstNotif,
          title: `${notifications.length} ${this._getTypeName(type)} notifications`,
          message: `You have ${notifications.length} new ${this._getTypeName(type)} updates`,
          sound: false // Don't play sound for batched notifications
        });
      }
    });

    // Clear queue
    this.batchQueue = [];
    this.batchTimer = null;
  }

  // Play notification sound based on priority
  _playSound(priority) {
    try {
      let soundFile;
      switch (priority) {
        case PRIORITY.CRITICAL:
          soundFile = '/sounds/critical.mp3';
          break;
        case PRIORITY.HIGH:
          soundFile = '/sounds/high.mp3';
          break;
        default:
          soundFile = '/sounds/notification.mp3';
      }

      const audio = new Audio(soundFile);
      audio.volume = 0.5;
      audio.play().catch(e => console.warn('Could not play sound:', e));
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }

  // Get default icon based on notification type
  getDefaultIcon(type) {
    const icons = {
      [NOTIFICATION_TYPE.TASK_ASSIGNED]: '/icons/task-assigned.png',
      [NOTIFICATION_TYPE.TASK_COMPLETED]: '/icons/task-completed.png',
      [NOTIFICATION_TYPE.DEADLINE_REMINDER]: '/icons/deadline.png',
      [NOTIFICATION_TYPE.DEADLINE_CRITICAL]: '/icons/deadline-critical.png',
      [NOTIFICATION_TYPE.ATTENDANCE_SUBMITTED]: '/icons/attendance.png',
      [NOTIFICATION_TYPE.ERROR]: '/icons/error.png',
      [NOTIFICATION_TYPE.SUCCESS]: '/icons/success.png'
    };
    return icons[type] || '/icons/Logam Academy LOGO 512x512.png';
  }

  // Get human-readable type name
  _getTypeName(type) {
    const names = {
      [NOTIFICATION_TYPE.TASK_ASSIGNED]: 'task assignment',
      [NOTIFICATION_TYPE.TASK_COMPLETED]: 'task completion',
      [NOTIFICATION_TYPE.TASK_COMMENT]: 'comment',
      [NOTIFICATION_TYPE.DEADLINE_REMINDER]: 'deadline reminder',
      [NOTIFICATION_TYPE.ATTENDANCE_SUBMITTED]: 'attendance'
    };
    return names[type] || 'notification';
  }

  // Specific notification methods for common use cases

  showTaskAssignedNotification({ task, assignedBy, deadline, priority, taskId }) {
    const priorityMap = {
      'High': PRIORITY.HIGH,
      'Medium': PRIORITY.MEDIUM,
      'Low': PRIORITY.LOW
    };

    return this.showNotification({
      title: 'New Task Assigned',
      message: `${assignedBy} assigned you: "${task}"`,
      type: NOTIFICATION_TYPE.TASK_ASSIGNED,
      priority: priorityMap[priority] || PRIORITY.MEDIUM,
      data: { taskId, url: '/dashboard?tab=tasks' },
      actions: [
        { id: 'view', label: 'View Task', icon: '/icons/view.png' },
        { id: 'mark-done', label: 'Mark Done', icon: '/icons/check.png' }
      ]
    });
  }

  showTaskCompletedNotification({ task, completedBy, taskId }) {
    return this.showNotification({
      title: 'Task Completed',
      message: `${completedBy} completed: "${task}"`,
      type: NOTIFICATION_TYPE.TASK_COMPLETED,
      priority: PRIORITY.MEDIUM,
      data: { taskId, url: '/dashboard?tab=tasks' },
      actions: [
        { id: 'view', label: 'View Details', icon: '/icons/view.png' }
      ]
    });
  }

  showTaskStatusChangeNotification({ task, oldStatus, newStatus, updatedBy, taskId }) {
    return this.showNotification({
      title: 'Task Status Updated',
      message: `"${task}" changed from ${oldStatus} to ${newStatus} by ${updatedBy}`,
      type: NOTIFICATION_TYPE.TASK_UPDATED,
      priority: PRIORITY.LOW,
      data: { taskId, url: '/dashboard?tab=tasks' }
    });
  }

  showDeadlineReminder({ task, deadline, hoursRemaining, taskId, priority }) {
    const isCritical = hoursRemaining <= 1;
    const priorityLevel = isCritical ? PRIORITY.CRITICAL :
                         hoursRemaining <= 24 ? PRIORITY.HIGH : PRIORITY.MEDIUM;

    return this.showNotification({
      title: isCritical ? '🚨 URGENT: Deadline Approaching' : '⏰ Deadline Reminder',
      message: `"${task}" is due ${this._formatTimeRemaining(hoursRemaining)}`,
      type: isCritical ? NOTIFICATION_TYPE.DEADLINE_CRITICAL : NOTIFICATION_TYPE.DEADLINE_REMINDER,
      priority: priorityLevel,
      data: { taskId, url: '/dashboard?tab=tasks' },
      actions: [
        { id: 'view', label: 'View Task', icon: '/icons/view.png' },
        { id: 'snooze', label: 'Snooze 1h', icon: '/icons/snooze.png' }
      ],
      sound: true,
      vibrate: isCritical
    });
  }

  showAttendanceNotification({ type, date, status, message }) {
    const types = {
      'submitted': NOTIFICATION_TYPE.ATTENDANCE_SUBMITTED,
      'approved': NOTIFICATION_TYPE.ATTENDANCE_APPROVED,
      'rejected': NOTIFICATION_TYPE.ATTENDANCE_REJECTED
    };

    const titles = {
      'submitted': 'Attendance Submitted',
      'approved': '✅ Attendance Approved',
      'rejected': '❌ Attendance Rejected'
    };

    return this.showNotification({
      title: titles[type] || 'Attendance Update',
      message: message || `Your attendance for ${date} has been ${type}`,
      type: types[type] || NOTIFICATION_TYPE.SYSTEM,
      priority: type === 'rejected' ? PRIORITY.HIGH : PRIORITY.MEDIUM,
      data: { date, status, url: '/dashboard?tab=attendance' },
      actions: [
        { id: 'view', label: 'View Details', icon: '/icons/view.png' }
      ]
    });
  }

  // Format time remaining in human-readable format
  _formatTimeRemaining(hoursRemaining) {
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

  // Settings
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  setBatchingEnabled(enabled) {
    this.batchingEnabled = enabled;
    if (!enabled && this.batchQueue.length > 0) {
      this._showBatchedNotifications();
    }
  }

  // Clear all pending batched notifications
  clearBatch() {
    this.batchQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

// Deadline Scheduler - Manages deadline reminders with escalation
class DeadlineScheduler {
  constructor() {
    this.scheduledReminders = new Map();
    this.notificationService = null;
  }

  setNotificationService(service) {
    this.notificationService = service;
  }

  // Schedule reminders for a task with escalation
  scheduleDeadlineReminders(task) {
    if (!task.deadline || task.status === 'done') return;

    const deadline = new Date(task.deadline);
    const now = new Date();
    const timeUntilDeadline = deadline - now;

    // Don't schedule if deadline has passed
    if (timeUntilDeadline <= 0) return;

    const taskKey = task.id || task.task;

    // Clear existing reminders for this task
    this.clearTaskReminders(taskKey);

    const reminders = [];

    // Schedule reminders at: 24h, 3h, 1h, 15min before deadline
    const reminderTimes = [
      { hours: 24, label: '24 hours' },
      { hours: 3, label: '3 hours' },
      { hours: 1, label: '1 hour' },
      { hours: 0.25, label: '15 minutes' }
    ];

    reminderTimes.forEach(({ hours, label }) => {
      const reminderTime = deadline - (hours * 60 * 60 * 1000);
      const delay = reminderTime - now;

      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          if (this.notificationService) {
            this.notificationService.showDeadlineReminder({
              task: task.task,
              deadline: task.deadline,
              hoursRemaining: hours,
              taskId: task.id,
              priority: task.priority
            });
          }
        }, delay);

        reminders.push({ timeoutId, hours, label });
      }
    });

    if (reminders.length > 0) {
      this.scheduledReminders.set(taskKey, reminders);
    }
  }

  // Schedule reminders for multiple tasks
  scheduleMultipleReminders(tasks) {
    tasks.forEach(task => this.scheduleDeadlineReminders(task));
  }

  // Clear reminders for a specific task
  clearTaskReminders(taskKey) {
    const reminders = this.scheduledReminders.get(taskKey);
    if (reminders) {
      reminders.forEach(reminder => clearTimeout(reminder.timeoutId));
      this.scheduledReminders.delete(taskKey);
    }
  }

  // Clear all reminders
  clearAll() {
    this.scheduledReminders.forEach((reminders) => {
      reminders.forEach(reminder => clearTimeout(reminder.timeoutId));
    });
    this.scheduledReminders.clear();
  }

  // Get scheduled reminders count
  getScheduledCount() {
    return this.scheduledReminders.size;
  }
}

// Create singleton instances
export const notificationService = new NotificationService();
export const deadlineScheduler = new DeadlineScheduler();

// Connect scheduler to notification service
deadlineScheduler.setNotificationService(notificationService);

// Export for testing and advanced usage
export default {
  notificationService,
  deadlineScheduler,
  PRIORITY,
  NOTIFICATION_TYPE
};
