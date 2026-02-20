/**
 * useNotifications Hook
 */

import { useEffect, useCallback } from 'react';
import useNotificationsStore from '../store/notificationsStore.js';
import notificationsApi from '../api/notificationsApi.js';

export function useNotifications(initialFilters = {}, options = {}) {
  const { autoLoad = true, pollInterval = null } = options;

  const {
    notifications,
    unreadCount,
    loading,
    error,
    filters,
    setNotifications,
    setUnreadCount,
    setLoading,
    setError,
    setFilters,
    addNotification: addNotificationToStore,
    markNotificationAsRead: markAsReadInStore,
    markAllAsRead: markAllAsReadInStore,
    removeNotification: removeNotificationFromStore,
    clearAll: clearAllInStore
  } = useNotificationsStore();

  const loadNotifications = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await notificationsApi.getNotifications(mergedFilters);

      if (response.success) {
        setNotifications(response.notifications || response.data || []);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setNotifications, setLoading, setError]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();

      if (response.success) {
        setUnreadCount(response.count || response.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }, [setUnreadCount]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const result = await notificationsApi.markAsRead(notificationId);
      if (result.success) {
        markAsReadInStore(notificationId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [markAsReadInStore, setError]);

  const markAllAsRead = useCallback(async () => {
    try {
      const result = await notificationsApi.markAllAsRead();
      if (result.success) {
        markAllAsReadInStore();
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [markAllAsReadInStore, setError]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const result = await notificationsApi.deleteNotification(notificationId);
      if (result.success) {
        removeNotificationFromStore(notificationId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeNotificationFromStore, setError]);

  const clearAll = useCallback(async () => {
    try {
      const result = await notificationsApi.clearAllNotifications();
      if (result.success) {
        clearAllInStore();
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [clearAllInStore, setError]);

  // Auto-load notifications on mount
  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadNotifications(initialFilters);
      loadUnreadCount();
    }
  }, [autoLoad]);

  // Optional polling
  useEffect(() => {
    if (pollInterval) {
      const interval = setInterval(() => {
        loadNotifications();
        loadUnreadCount();
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [pollInterval, loadNotifications, loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    filters,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    setFilters
  };
}

export default useNotifications;
