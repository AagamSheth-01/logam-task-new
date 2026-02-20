// Comprehensive Notification System with Preferences and Real-time Updates
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useSessionTimeout, SessionTimeoutWarning, SessionStatusIndicator } from '../hooks/useSessionTimeout';
import {
  Bell,
  BellOff,
  Settings,
  X,
  Check,
  Clock,
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';

// Play notification sound using Web Audio API
const playNotificationSound = (type = 'default') => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    if (type === 'success') {
      // Success sound: C → E → G (ascending cheerful)
      playSuccessSound(audioContext);
    } else if (type === 'task_assigned' || type === 'new_task') {
      // Bubble sound: rising tone (higher frequency for better effect)
      playBubbleSound(audioContext);
    } else {
      // Default sound
      playDefaultSound(audioContext);
    }
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
};

// Bubble sound (rising tone) - for new tasks
const playBubbleSound = (audioContext) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  const now = audioContext.currentTime;

  // Rise from 500 Hz to 1200 Hz (increased frequency for better effect)
  oscillator.frequency.setValueAtTime(500, now);
  oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.25);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, now + 0.25);

  oscillator.start(now);
  oscillator.stop(now + 0.25);
};

// Success sound: C → E → G (ascending cheerful)
const playSuccessSound = (audioContext) => {
  const notes = [
    { freq: 523, time: 0, duration: 0.1 },      // C
    { freq: 659, time: 0.08, duration: 0.1 },   // E
    { freq: 784, time: 0.16, duration: 0.2 }    // G
  ];

  notes.forEach(note => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = note.freq;
    oscillator.type = 'sine';

    const startTime = audioContext.currentTime + note.time;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.08);
    gainNode.gain.linearRampToValueAtTime(0, startTime + note.duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + note.duration);
  });
};

// Default sound (simple tone)
const playDefaultSound = (audioContext) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';

  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
  gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

  oscillator.start(now);
  oscillator.stop(now + 0.2);
};

// Tab notification system - flash title and update favicon
let originalTitle = '';
let titleFlashInterval = null;
let isFlashing = false;

const updateTabNotification = (count, notificationTitle) => {
  // Store original title if not already stored
  if (!originalTitle) {
    originalTitle = document.title;
  }

  // Clear any existing flash interval
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
  }

  if (count > 0) {
    // Flash the title between notification and original
    let showNotification = true;
    isFlashing = true;

    // Set initial title with count
    document.title = `(${count}) ${notificationTitle || 'New Notification'}`;

    // Flash every 1 second
    titleFlashInterval = setInterval(() => {
      if (showNotification) {
        document.title = `(${count}) ${notificationTitle || 'New Notification'}`;
      } else {
        document.title = originalTitle;
      }
      showNotification = !showNotification;
    }, 1000);

    // Stop flashing when user focuses the tab
    const stopFlashing = () => {
      if (titleFlashInterval) {
        clearInterval(titleFlashInterval);
        titleFlashInterval = null;
        isFlashing = false;
      }
      // Restore title with count indicator
      if (count > 0) {
        document.title = `(${count}) ${originalTitle}`;
      } else {
        document.title = originalTitle;
      }
    };

    // Listen for tab focus
    window.addEventListener('focus', stopFlashing, { once: true });
  } else {
    // No unread notifications - restore original title
    document.title = originalTitle;
    isFlashing = false;
  }
};

// Stop flashing and restore title
const restoreTabTitle = () => {
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
  }
  if (originalTitle) {
    document.title = originalTitle;
  }
  isFlashing = false;
};

const NotificationSystem = ({ currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCenter, setShowCenter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const eventSourceRef = useRef(null);
  const notificationRef = useRef(null); // Reference for click-outside detection
  const [preferences, setPreferences] = useState({
    taskAssignments: true,
    taskCompletions: true,
    taskComments: true,
    deadlineReminders: true,
    attendanceAlerts: true,
    sessionWarnings: true,
    sound: true,
    desktop: true,
    batching: true,
    email: false
  });

  const { 
    isSupported, 
    permissionGranted, 
    requestPermission, 
    sendTaskNotification 
  } = useNotifications(currentUser?.role);

  const {
    isActive,
    timeRemaining,
    showWarning,
    extendSession,
    updateActivity,
    timeRemainingFormatted,
    isExpiring
  } = useSessionTimeout(
    () => {
      // On timeout
      addNotification({
        type: 'error',
        title: 'Session Expired',
        message: 'You have been logged out due to inactivity',
        timestamp: new Date().toISOString()
      });
    },
    () => {
      // On warning
      if (preferences.sessionWarnings) {
        addNotification({
          type: 'warning',
          title: 'Session Expiring',
          message: 'Your session will expire in 5 minutes',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  // Update tab title when unread count changes
  useEffect(() => {
    if (unreadCount === 0) {
      restoreTabTitle();
    }
  }, [unreadCount]);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
  }, []);

  // Add notification to the list
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only latest 50
    setUnreadCount(prev => {
      const newCount = prev + 1;

      // Update tab title and favicon when notification arrives
      updateTabNotification(newCount, notification.title);

      return newCount;
    });

    // Show browser notification if enabled
    if (permissionGranted && preferences.desktop) {
      let icon = '/icons/Logam Academy LOGO 512x512.png';

      switch (notification.type) {
        case 'success':
          icon = '/icons/success.png';
          break;
        case 'error':
          icon = '/icons/error.png';
          break;
        case 'warning':
          icon = '/icons/warning.png';
          break;
      }

      new Notification(notification.title, {
        body: notification.message,
        icon: icon,
        badge: '/icons/badge.png',
        requireInteraction: false,
        tag: 'logam-notification' // Group similar notifications
      });
    }

    // Play sound if enabled (force play even if tab is not in focus)
    if (preferences.sound) {
      // Determine sound type based on notification type
      let soundType = 'default';

      if (notification.type === 'task_assigned' || notification.title?.includes('Task Assigned') || notification.title?.includes('New Task')) {
        soundType = 'task_assigned';
      } else if (notification.type === 'task_completed' || notification.title?.includes('Task Completed') || notification.title?.includes('Completed')) {
        soundType = 'success';
      }

      // Play sound with retry logic for tab in background
      try {
        playNotificationSound(soundType);
      } catch (e) {
        // Retry after a short delay if first attempt fails
        setTimeout(() => {
          try {
            playNotificationSound(soundType);
          } catch (retryError) {
            console.warn('Could not play notification sound after retry:', retryError);
          }
        }, 100);
      }
    }
  }, [permissionGranted, preferences.desktop, preferences.sound]);

  // Mark notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
    // Restore original tab title
    restoreTabTitle();
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    // Restore original tab title
    restoreTabTitle();
  }, []);

  // Listen for real-time notifications via Server-Sent Events
  useEffect(() => {
    if (!currentUser?.username) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Get auth token from localStorage
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`/api/notifications/stream?user=${currentUser.username}&token=${encodeURIComponent(token)}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Skip heartbeat messages
        if (data.type === 'heartbeat' || data.type === 'connection') {
          return;
        }

        // Filter based on preferences
        const shouldShow = (
          (data.type === 'task_assigned' && preferences.taskAssignments) ||
          (data.type === 'task_completed' && preferences.taskCompletions) ||
          (data.type === 'task_updated' && preferences.taskCompletions) ||
          (data.type === 'task_comment' && preferences.taskComments) ||
          (data.type === 'deadline_reminder' && preferences.deadlineReminders) ||
          (data.type === 'deadline_critical' && preferences.deadlineReminders) ||
          (data.type === 'attendance_submitted' && preferences.attendanceAlerts) ||
          (data.type === 'attendance_approved' && preferences.attendanceAlerts) ||
          (data.type === 'attendance_rejected' && preferences.attendanceAlerts)
        );

        if (shouldShow) {
          addNotification(data);

          // Emit custom event for task-related notifications so dashboard can refresh
          if (data.type === 'task_assigned' ||
              data.type === 'task_completed' ||
              data.type === 'task_updated' ||
              data.type === 'task_comment') {
            window.dispatchEvent(new CustomEvent('taskUpdated', {
              detail: { notification: data }
            }));
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    eventSource.onerror = (error) => {
      // Try to reconnect after 5 seconds
      setTimeout(() => {
        if (currentUser?.username) {
          // Reconnect silently
        }
      }, 5000);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [currentUser?.username, preferences, addNotification]);

  // Listen for service worker notification actions
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
        const { action, data } = event.data;
        handleNotificationAction(action, data);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Handle notification actions from service worker
  const handleNotificationAction = useCallback(async (action, data) => {
    setLoadingAction(action);

    try {
      if (action === 'mark-done' && data.taskId) {
        // Mark task as done
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${data.taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'done' })
        });

        if (response.ok) {
          addNotification({
            type: 'success',
            title: 'Task Marked Complete',
            message: 'Task has been marked as done',
            timestamp: new Date().toISOString()
          });
        }
      } else if (action === 'snooze' && data.taskId) {
        // Snooze notification for 1 hour
        addNotification({
          type: 'success',
          title: 'Notification Snoozed',
          message: 'You will be reminded again in 1 hour',
          timestamp: new Date().toISOString()
        });
      } else if (action === 'view-task' && data.taskId) {
        // Navigate to task
        window.location.href = `/dashboard?tab=tasks&taskId=${data.taskId}`;
      } else if (action === 'view-attendance' && data.attendanceId) {
        // Navigate to attendance
        window.location.href = `/dashboard?tab=attendance&attendanceId=${data.attendanceId}`;
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      addNotification({
        type: 'error',
        title: 'Action Failed',
        message: 'Failed to perform action. Please try again.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoadingAction(null);
    }
  }, [addNotification]);

  // Request notification permission on mount
  useEffect(() => {
    if (isSupported && !permissionGranted && currentUser?.role === 'admin') {
      requestPermission();
    }
  }, [isSupported, permissionGranted, currentUser?.role, requestPermission]);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowCenter(false);
        setShowSettings(false);
      }
    };

    if (showCenter || showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCenter, showSettings]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'task_assigned': return <User className="w-5 h-5 text-blue-500" />;
      case 'task_completed': return <Check className="w-5 h-5 text-green-500" />;
      case 'task_comment': return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'deadline_reminder': return <Clock className="w-5 h-5 text-orange-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <>
      {/* Session Status Indicator - Hidden by default */}
      {/* Uncomment to show session timer in top corner */}
      {/* <SessionStatusIndicator
        isActive={isActive}
        timeRemaining={timeRemaining}
        isExpiring={isExpiring}
        onExtend={extendSession}
      /> */}

      {/* Session Timeout Warning - Keep this for security */}
      <SessionTimeoutWarning
        isVisible={showWarning}
        timeRemaining={timeRemainingFormatted}
        onExtend={extendSession}
        onLogout={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }}
      />

      {/* Notification Bell */}
      <div className="relative" ref={notificationRef}>
        <button
          onClick={() => setShowCenter(!showCenter)}
          className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          {permissionGranted ? (
            <Bell className="w-6 h-6" />
          ) : (
            <BellOff className="w-6 h-6" />
          )}

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Center Dropdown */}
        {showCenter && (
          <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCenter(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            {notifications.length > 0 && (
              <div className="p-3 border-b border-gray-200 flex justify-between">
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Mark all read
                </button>
                <button
                  onClick={clearAll}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Notification Settings</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Permission Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Browser Notifications</p>
                  <p className="text-sm text-gray-600">Enable desktop notifications</p>
                </div>
                <div className="flex items-center space-x-2">
                  {permissionGranted ? (
                    <span className="text-green-600 font-medium">Enabled</span>
                  ) : (
                    <button
                      onClick={requestPermission}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Types */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Notification Types</h4>

                {[
                  { key: 'taskAssignments', label: 'Task Assignments' },
                  { key: 'taskCompletions', label: 'Task Completions' },
                  { key: 'taskComments', label: 'Task Comments' },
                  { key: 'deadlineReminders', label: 'Deadline Reminders' },
                  { key: 'attendanceAlerts', label: 'Attendance Alerts' },
                  { key: 'sessionWarnings', label: 'Session Warnings' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[key]}
                        onChange={(e) => 
                          savePreferences({ ...preferences, [key]: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Sound & Desktop */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Preferences</h4>

                {[
                  { key: 'sound', label: 'Sound Effects' },
                  { key: 'desktop', label: 'Desktop Notifications' },
                  { key: 'batching', label: 'Group Similar Notifications' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[key]}
                        onChange={(e) => 
                          savePreferences({ ...preferences, [key]: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationSystem;