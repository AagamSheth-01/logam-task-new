/**
 * Notifications Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useNotificationsStore = create(
  devtools(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      filters: {
        read: null,
        type: null
      },

      setNotifications: (notifications) => set({ notifications }),
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: !notification.read ? state.unreadCount + 1 : state.unreadCount
      })),

      markNotificationAsRead: (notificationId) => set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      })),

      markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })),
        unreadCount: 0
      })),

      removeNotification: (notificationId) => set((state) => {
        const notification = state.notifications.find(n => n.id === notificationId);
        return {
          notifications: state.notifications.filter(n => n.id !== notificationId),
          unreadCount: notification && !notification.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount
        };
      }),

      clearAll: () => set({
        notifications: [],
        unreadCount: 0
      }),

      reset: () => set({
        notifications: [],
        unreadCount: 0,
        error: null
      })
    }),
    { name: 'Notifications Store' }
  )
);

export default useNotificationsStore;
