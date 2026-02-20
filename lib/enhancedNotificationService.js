/**
 * Enhanced Notification Service with Maximum Reliability
 * Features: Smart retry logic, offline queue, fallback mechanisms, analytics
 */

// Enhanced Priority Levels with Color Coding
export const PRIORITY = {
  CRITICAL: { level: 'critical', weight: 4, color: '#dc2626', sound: 'urgent' },
  HIGH: { level: 'high', weight: 3, color: '#ea580c', sound: 'important' },
  MEDIUM: { level: 'medium', weight: 2, color: '#2563eb', sound: 'default' },
  LOW: { level: 'low', weight: 1, color: '#6b7280', sound: 'soft' }
};

// Enhanced Notification Types
export const NOTIFICATION_TYPE = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TASK_UPDATED: 'task_updated',
  TASK_COMMENT: 'task_comment',
  TASK_REMINDER: 'task_reminder',
  DEADLINE_APPROACHING: 'deadline_approaching',
  DEADLINE_CRITICAL: 'deadline_critical',
  DEADLINE_OVERDUE: 'deadline_overdue',
  ATTENDANCE_CLOCK_IN: 'attendance_clock_in',
  ATTENDANCE_CLOCK_OUT: 'attendance_clock_out',
  ATTENDANCE_APPROVED: 'attendance_approved',
  ATTENDANCE_REJECTED: 'attendance_rejected',
  DAILY_TASK_REMINDER: 'daily_task_reminder',
  SYSTEM_UPDATE: 'system_update',
  SYSTEM_ERROR: 'system_error',
  SYSTEM_SUCCESS: 'system_success',
  CONNECTION_STATUS: 'connection_status'
};

class EnhancedNotificationService {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'Notification' in window;
    this.permissionGranted = this.isSupported && Notification.permission === 'granted';
    this.serviceWorker = null;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Queue system for offline/failed notifications
    this.offlineQueue = [];
    this.failedQueue = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;

    // Batching system
    this.batchQueue = new Map(); // Group by type for smarter batching
    this.batchTimers = new Map();
    this.batchEnabled = true;
    this.batchDelay = 5000;

    // Settings
    this.settings = {
      soundEnabled: true,
      vibrationEnabled: true,
      desktopEnabled: true,
      batchingEnabled: true,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
      priority: {
        [NOTIFICATION_TYPE.TASK_ASSIGNED]: PRIORITY.MEDIUM,
        [NOTIFICATION_TYPE.DEADLINE_CRITICAL]: PRIORITY.CRITICAL,
        [NOTIFICATION_TYPE.DEADLINE_APPROACHING]: PRIORITY.HIGH,
        [NOTIFICATION_TYPE.ATTENDANCE_CLOCK_IN]: PRIORITY.LOW,
        [NOTIFICATION_TYPE.SYSTEM_ERROR]: PRIORITY.HIGH
      }
    };

    // Analytics
    this.analytics = {
      sent: 0,
      failed: 0,
      clicked: 0,
      dismissed: 0,
      retried: 0
    };

    this.init();
  }

  async init() {
    try {
      // Initialize service worker
      await this.initServiceWorker();

      // Load settings from localStorage
      this.loadSettings();

      // Set up online/offline detection
      this.setupConnectionMonitoring();

      // Set up periodic cleanup
      this.setupPeriodicCleanup();

      console.log('✅ Enhanced Notification Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
    }
  }

  async initServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      this.serviceWorker = registration;

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      console.log('✅ Service Worker ready for notifications');
    } catch (error) {
      console.warn('⚠️ Service Worker not available:', error);
    }
  }

  setupConnectionMonitoring() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
      this.showConnectionNotification(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showConnectionNotification(false);
    });
  }

  setupPeriodicCleanup() {
    // Clean up old entries every 5 minutes
    setInterval(() => {
      this.cleanupOldEntries();
    }, 5 * 60 * 1000);
  }

  // Enhanced permission request with better UX
  async requestPermission(options = {}) {
    if (!this.isSupported) {
      throw new Error('Notifications not supported in this browser');
    }

    if (this.permissionGranted) {
      return true;
    }

    try {
      // Show custom permission dialog first if provided
      if (options.customDialog) {
        const userConsent = await options.customDialog();
        if (!userConsent) return false;
      }

      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';

      if (this.permissionGranted) {
        console.log('✅ Notification permission granted');

        // Show welcome notification
        await this.show({
          title: 'Notifications Enabled! 🎉',
          message: 'You\'ll now receive real-time updates about your tasks and activities.',
          type: NOTIFICATION_TYPE.SYSTEM_SUCCESS,
          priority: PRIORITY.LOW,
          persistent: false
        });

        this.analytics.sent++;
        this.saveAnalytics();
      } else {
        console.warn('❌ Notification permission denied');

        // Show fallback options
        if (options.onPermissionDenied) {
          options.onPermissionDenied();
        }
      }

      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Main notification method with enhanced features
  async show({
    title,
    message,
    type = NOTIFICATION_TYPE.SYSTEM_UPDATE,
    priority = PRIORITY.MEDIUM,
    data = {},
    actions = [],
    icon = null,
    badge = null,
    persistent = false,
    silent = false,
    tag = null,
    renotify = false,
    requireInteraction = false,
    url = null,
    sound = null,
    vibrate = null
  }) {
    try {
      // Check if we should show notification during quiet hours
      if (this.isQuietHour() && priority.weight < PRIORITY.HIGH.weight) {
        console.log('🔇 Notification queued due to quiet hours');
        this.queueForLater({ title, message, type, priority, data, actions });
        return { success: true, queued: true };
      }

      const notification = {
        id: this.generateId(),
        title,
        message,
        type,
        priority,
        data: { ...data, url },
        actions,
        icon: icon || this.getDefaultIcon(type),
        badge: badge || '/icons/badge.png',
        timestamp: new Date().toISOString(),
        persistent,
        silent: silent || !this.settings.soundEnabled,
        tag: tag || type,
        renotify,
        requireInteraction: requireInteraction || priority === PRIORITY.CRITICAL,
        sound: sound || this.getSoundForPriority(priority),
        vibrate: vibrate || this.getVibrationPattern(priority),
        attempts: 0
      };

      // Handle batching for non-critical notifications
      if (this.shouldBatch(notification)) {
        return this.addToBatch(notification);
      }

      // Show immediately
      return await this.showImmediate(notification);

    } catch (error) {
      console.error('Error showing notification:', error);
      this.analytics.failed++;
      this.saveAnalytics();
      return { success: false, error: error.message };
    }
  }

  async showImmediate(notification) {
    try {
      // Check permission
      if (!this.permissionGranted) {
        if (this.isOnline) {
          this.offlineQueue.push(notification);
        }
        return { success: false, reason: 'No permission' };
      }

      // Play sound if enabled
      if (!notification.silent && this.settings.soundEnabled) {
        this.playSound(notification.sound, notification.priority);
      }

      // Vibrate if enabled
      if (notification.vibrate && this.settings.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate(notification.vibrate);
      }

      // Prepare notification options
      const options = {
        body: notification.message,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        data: notification.data,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent,
        renotify: notification.renotify,
        timestamp: Date.now()
      };

      // Add actions if supported
      if (notification.actions.length > 0) {
        options.actions = notification.actions.slice(0, 2); // Max 2 actions
      }

      let notificationInstance;

      // Use Service Worker for persistent notifications
      if (this.serviceWorker && notification.persistent) {
        await this.serviceWorker.showNotification(notification.title, options);
      } else {
        notificationInstance = new Notification(notification.title, options);

        // Handle events
        this.setupNotificationEvents(notificationInstance, notification);
      }

      // Track success
      this.analytics.sent++;
      this.saveAnalytics();

      console.log(`📱 Notification shown: ${notification.title}`);
      return { success: true, notification: notificationInstance };

    } catch (error) {
      console.error('Failed to show notification:', error);

      // Add to retry queue
      this.addToRetryQueue(notification, error);

      this.analytics.failed++;
      this.saveAnalytics();

      return { success: false, error: error.message };
    }
  }

  setupNotificationEvents(notificationInstance, notification) {
    notificationInstance.onclick = () => {
      this.analytics.clicked++;
      this.saveAnalytics();

      window.focus();

      if (notification.data.url) {
        window.location.href = notification.data.url;
      }

      notificationInstance.close();

      // Emit custom event
      window.dispatchEvent(new CustomEvent('notificationClicked', {
        detail: notification
      }));
    };

    notificationInstance.onclose = () => {
      this.analytics.dismissed++;
      this.saveAnalytics();
    };

    notificationInstance.onerror = (error) => {
      console.error('Notification error:', error);
      this.addToRetryQueue(notification, error);
    };
  }

  // Smart batching system
  shouldBatch(notification) {
    return (
      this.settings.batchingEnabled &&
      notification.priority.weight <= PRIORITY.MEDIUM.weight &&
      !notification.requireInteraction &&
      !notification.persistent
    );
  }

  addToBatch(notification) {
    const batchKey = `${notification.type}_${notification.priority.level}`;

    if (!this.batchQueue.has(batchKey)) {
      this.batchQueue.set(batchKey, []);
    }

    this.batchQueue.get(batchKey).push(notification);

    // Clear existing timer for this batch
    if (this.batchTimers.has(batchKey)) {
      clearTimeout(this.batchTimers.get(batchKey));
    }

    // Set new timer
    const delay = notification.priority === PRIORITY.HIGH ? 2000 : this.batchDelay;
    const timer = setTimeout(() => {
      this.processBatch(batchKey);
    }, delay);

    this.batchTimers.set(batchKey, timer);

    return { success: true, batched: true };
  }

  async processBatch(batchKey) {
    const notifications = this.batchQueue.get(batchKey) || [];
    if (notifications.length === 0) return;

    this.batchQueue.delete(batchKey);
    this.batchTimers.delete(batchKey);

    if (notifications.length === 1) {
      // Single notification - show normally
      await this.showImmediate(notifications[0]);
    } else {
      // Multiple notifications - create batch notification
      const firstNotif = notifications[0];
      const batchNotification = {
        ...firstNotif,
        title: this.getBatchTitle(firstNotif.type, notifications.length),
        message: this.getBatchMessage(firstNotif.type, notifications.length),
        data: {
          ...firstNotif.data,
          batchedNotifications: notifications.map(n => n.id),
          url: this.getBatchUrl(firstNotif.type)
        },
        silent: true, // Don't play sound for batch
        vibrate: null
      };

      await this.showImmediate(batchNotification);
    }
  }

  // Retry mechanism for failed notifications
  addToRetryQueue(notification, error) {
    const attempts = this.retryAttempts.get(notification.id) || 0;

    if (attempts < this.maxRetries) {
      this.retryAttempts.set(notification.id, attempts + 1);

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempts) * 1000;

      setTimeout(() => {
        this.retryNotification(notification);
      }, delay);

      console.log(`🔄 Retrying notification (attempt ${attempts + 1}/${this.maxRetries}):`, notification.title);
    } else {
      console.error('❌ Max retries exceeded for notification:', notification.title);
      this.retryAttempts.delete(notification.id);

      // Add to failed queue for manual review
      this.failedQueue.push({
        notification,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async retryNotification(notification) {
    this.analytics.retried++;
    this.saveAnalytics();

    const result = await this.showImmediate(notification);

    if (result.success) {
      this.retryAttempts.delete(notification.id);
    }
  }

  // Offline queue processing
  processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log(`📡 Processing ${this.offlineQueue.length} offline notifications`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    queue.forEach(async (notification) => {
      await this.showImmediate(notification);
    });
  }

  // Sound system with priority-based sounds
  playSound(soundFile, priority) {
    try {
      const audio = new Audio(soundFile);

      // Set volume based on priority
      switch (priority) {
        case PRIORITY.CRITICAL:
          audio.volume = 0.8;
          break;
        case PRIORITY.HIGH:
          audio.volume = 0.6;
          break;
        default:
          audio.volume = 0.4;
      }

      audio.play().catch(e => {
        console.warn('Could not play notification sound:', e);
      });
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }

  getSoundForPriority(priority) {
    const sounds = {
      [PRIORITY.CRITICAL.level]: '/sounds/urgent.mp3',
      [PRIORITY.HIGH.level]: '/sounds/important.mp3',
      [PRIORITY.MEDIUM.level]: '/sounds/default.mp3',
      [PRIORITY.LOW.level]: '/sounds/soft.mp3'
    };
    return sounds[priority.level] || '/sounds/default.mp3';
  }

  getVibrationPattern(priority) {
    const patterns = {
      [PRIORITY.CRITICAL.level]: [100, 50, 100, 50, 100],
      [PRIORITY.HIGH.level]: [200, 100, 200],
      [PRIORITY.MEDIUM.level]: [200],
      [PRIORITY.LOW.level]: null
    };
    return patterns[priority.level];
  }

  // Utility methods
  generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDefaultIcon(type) {
    const icons = {
      [NOTIFICATION_TYPE.TASK_ASSIGNED]: '/icons/task-assigned.png',
      [NOTIFICATION_TYPE.TASK_COMPLETED]: '/icons/task-completed.png',
      [NOTIFICATION_TYPE.DEADLINE_CRITICAL]: '/icons/deadline-critical.png',
      [NOTIFICATION_TYPE.DEADLINE_APPROACHING]: '/icons/deadline.png',
      [NOTIFICATION_TYPE.ATTENDANCE_CLOCK_IN]: '/icons/clock-in.png',
      [NOTIFICATION_TYPE.ATTENDANCE_CLOCK_OUT]: '/icons/clock-out.png',
      [NOTIFICATION_TYPE.SYSTEM_ERROR]: '/icons/error.png',
      [NOTIFICATION_TYPE.SYSTEM_SUCCESS]: '/icons/success.png'
    };
    return icons[type] || '/icons/Logam Academy LOGO 512x512.png';
  }

  isQuietHour() {
    if (!this.settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  getBatchTitle(type, count) {
    const titles = {
      [NOTIFICATION_TYPE.TASK_ASSIGNED]: `${count} New Tasks Assigned`,
      [NOTIFICATION_TYPE.TASK_COMPLETED]: `${count} Tasks Completed`,
      [NOTIFICATION_TYPE.DEADLINE_APPROACHING]: `${count} Deadline Reminders`,
      [NOTIFICATION_TYPE.ATTENDANCE_CLOCK_IN]: `${count} Attendance Updates`
    };
    return titles[type] || `${count} New Notifications`;
  }

  getBatchMessage(type, count) {
    const messages = {
      [NOTIFICATION_TYPE.TASK_ASSIGNED]: `You have ${count} new tasks waiting for you`,
      [NOTIFICATION_TYPE.TASK_COMPLETED]: `${count} of your assigned tasks have been completed`,
      [NOTIFICATION_TYPE.DEADLINE_APPROACHING]: `${count} tasks have approaching deadlines`,
      [NOTIFICATION_TYPE.ATTENDANCE_CLOCK_IN]: `${count} attendance notifications`
    };
    return messages[type] || `You have ${count} new notifications`;
  }

  getBatchUrl(type) {
    const urls = {
      [NOTIFICATION_TYPE.TASK_ASSIGNED]: '/dashboard?tab=my-tasks&filter=assigned-to-me',
      [NOTIFICATION_TYPE.TASK_COMPLETED]: '/dashboard?tab=my-tasks&filter=completed',
      [NOTIFICATION_TYPE.DEADLINE_APPROACHING]: '/dashboard?tab=my-tasks&filter=due-soon',
      [NOTIFICATION_TYPE.ATTENDANCE_CLOCK_IN]: '/dashboard?tab=attendance'
    };
    return urls[type] || '/dashboard';
  }

  // Connection status notifications
  showConnectionNotification(isOnline) {
    const title = isOnline ? '🟢 Connection Restored' : '🔴 Connection Lost';
    const message = isOnline
      ? 'You\'re back online. Syncing notifications...'
      : 'You\'re offline. Notifications will be queued.';

    this.show({
      title,
      message,
      type: NOTIFICATION_TYPE.CONNECTION_STATUS,
      priority: isOnline ? PRIORITY.LOW : PRIORITY.MEDIUM,
      silent: !isOnline,
      persistent: false
    });
  }

  // Settings management
  loadSettings() {
    try {
      const saved = localStorage.getItem('enhancedNotificationSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('enhancedNotificationSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }

  updateSetting(key, value) {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      if (this.settings[parent]) {
        this.settings[parent][child] = value;
      }
    } else {
      this.settings[key] = value;
    }
    this.saveSettings();
  }

  // Analytics
  saveAnalytics() {
    try {
      localStorage.setItem('notificationAnalytics', JSON.stringify(this.analytics));
    } catch (error) {
      console.warn('Failed to save notification analytics:', error);
    }
  }

  getAnalytics() {
    return { ...this.analytics };
  }

  resetAnalytics() {
    this.analytics = {
      sent: 0,
      failed: 0,
      clicked: 0,
      dismissed: 0,
      retried: 0
    };
    this.saveAnalytics();
  }

  // Cleanup
  cleanupOldEntries() {
    // Clean up old retry attempts
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    this.retryAttempts.forEach((attempts, id) => {
      const [, timestamp] = id.split('_');
      if (now - parseInt(timestamp) > maxAge) {
        this.retryAttempts.delete(id);
      }
    });

    // Clean up old failed notifications
    this.failedQueue = this.failedQueue.filter(item => {
      return now - new Date(item.timestamp).getTime() < maxAge;
    });
  }

  // Service Worker message handling
  handleServiceWorkerMessage(event) {
    if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
      const { action, notificationData } = event.data;
      this.handleNotificationAction(action, notificationData);
    }
  }

  handleNotificationAction(action, data) {
    // Emit custom event for action handling
    window.dispatchEvent(new CustomEvent('notificationAction', {
      detail: { action, data }
    }));
  }

  // Public API for specific notification types
  async showTaskAssigned({ task, assignedBy, deadline, priority, taskId }) {
    return this.show({
      title: '📝 New Task Assigned',
      message: `${assignedBy} assigned you: "${task}"`,
      type: NOTIFICATION_TYPE.TASK_ASSIGNED,
      priority: this.settings.priority[NOTIFICATION_TYPE.TASK_ASSIGNED] || PRIORITY.MEDIUM,
      data: { taskId, assignedBy, deadline },
      url: `/dashboard?tab=my-tasks&taskId=${taskId}`,
      actions: [
        { action: 'view', title: 'View Task', icon: '/icons/view.png' },
        { action: 'mark-done', title: 'Mark Done', icon: '/icons/check.png' }
      ],
      requireInteraction: priority === 'High'
    });
  }

  async showTaskCompleted({ task, completedBy, taskId }) {
    return this.show({
      title: '✅ Task Completed',
      message: `${completedBy} completed: "${task}"`,
      type: NOTIFICATION_TYPE.TASK_COMPLETED,
      priority: PRIORITY.MEDIUM,
      data: { taskId, completedBy },
      url: `/dashboard?tab=my-tasks&taskId=${taskId}`,
      actions: [
        { action: 'view', title: 'View Details', icon: '/icons/view.png' }
      ]
    });
  }

  async showDeadlineApproaching({ task, deadline, hoursRemaining, taskId, priority }) {
    const isCritical = hoursRemaining <= 1;
    const isUrgent = hoursRemaining <= 6;

    return this.show({
      title: isCritical ? '🚨 URGENT: Deadline NOW!' : isUrgent ? '⚠️ Deadline Approaching' : '📅 Deadline Reminder',
      message: `"${task}" is due ${this.formatTimeRemaining(hoursRemaining)}`,
      type: isCritical ? NOTIFICATION_TYPE.DEADLINE_CRITICAL : NOTIFICATION_TYPE.DEADLINE_APPROACHING,
      priority: isCritical ? PRIORITY.CRITICAL : isUrgent ? PRIORITY.HIGH : PRIORITY.MEDIUM,
      data: { taskId, deadline, hoursRemaining },
      url: `/dashboard?tab=my-tasks&taskId=${taskId}`,
      requireInteraction: isCritical,
      actions: [
        { action: 'view', title: 'View Task', icon: '/icons/view.png' },
        { action: 'snooze', title: 'Snooze 1h', icon: '/icons/snooze.png' }
      ]
    });
  }

  async showAttendanceReminder() {
    return this.show({
      title: '⏰ Don\'t Forget to Clock In',
      message: 'Remember to mark your attendance for today',
      type: NOTIFICATION_TYPE.ATTENDANCE_CLOCK_IN,
      priority: PRIORITY.MEDIUM,
      url: '/dashboard?tab=attendance',
      actions: [
        { action: 'clock-in', title: 'Clock In', icon: '/icons/clock.png' }
      ]
    });
  }

  async showDailyTaskReminder({ taskCount }) {
    return this.show({
      title: '📋 Daily Task Log Reminder',
      message: taskCount > 0 ?
        `You have ${taskCount} incomplete daily tasks` :
        'Don\'t forget to log your daily tasks',
      type: NOTIFICATION_TYPE.DAILY_TASK_REMINDER,
      priority: PRIORITY.LOW,
      url: '/dashboard?tab=daily-tasks'
    });
  }

  formatTimeRemaining(hoursRemaining) {
    if (hoursRemaining < 0.5) {
      return 'right now';
    } else if (hoursRemaining < 1) {
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

  // Destroy service
  destroy() {
    // Clear all timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();

    // Clear queues
    this.offlineQueue = [];
    this.failedQueue = [];
    this.batchQueue.clear();
    this.retryAttempts.clear();

    console.log('🧹 Enhanced notification service destroyed');
  }
}

// Create singleton instance
export const enhancedNotificationService = new EnhancedNotificationService();

export default enhancedNotificationService;