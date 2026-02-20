// Enhanced useNotifications hook with better error handling and features
import { useState, useEffect, useCallback } from 'react';
import { notificationService, deadlineScheduler } from '../lib/notificationService';

export const useNotifications = (userRole = 'user') => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported('Notification' in window);

    // Check current permission status
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setLoading(true);
    try {
      const granted = await notificationService.requestPermission();
      setPermissionGranted(granted);
      return granted;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTaskNotification = useCallback((taskData, type = 'assigned') => {
    if (!permissionGranted) {
      return false;
    }

    try {
      switch (type) {
        case 'assigned':
          return notificationService.showTaskAssignedNotification(taskData);
        case 'completed':
          return notificationService.showTaskCompletedNotification(taskData);
        case 'deadline':
          return notificationService.showDeadlineReminder(taskData);
        default:
          return null;
      }
    } catch (error) {
      return false;
    }
  }, [permissionGranted]);

  const scheduleDeadlineReminders = useCallback((tasks) => {
    if (permissionGranted && tasks?.length > 0) {
      deadlineScheduler.scheduleDeadlineReminders(tasks);
    }
  }, [permissionGranted]);

  const clearAllReminders = useCallback(() => {
    deadlineScheduler.clearAll();
  }, []);

  // Auto-request permission on first use for admins
  useEffect(() => {
    if (userRole === 'admin' && isSupported && Notification.permission === 'default') {
      requestPermission();
    }
  }, [userRole, isSupported, requestPermission]);

  return {
    isSupported,
    permissionGranted,
    loading,
    requestPermission,
    sendTaskNotification,
    scheduleDeadlineReminders,
    clearAllReminders
  };
};

export default useNotifications;
