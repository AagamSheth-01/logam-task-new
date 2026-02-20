/**
 * Notifications API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class NotificationsApi {
  async getNotifications(params = {}) {
    return await httpClient.get('/notifications', params);
  }

  async getNotificationById(notificationId) {
    const response = await httpClient.get(`/notifications/${notificationId}`);
    return response.data || response;
  }

  async markAsRead(notificationId) {
    return await httpClient.put(`/notifications/${notificationId}`, {
      read: true,
      readAt: new Date().toISOString()
    });
  }

  async markAllAsRead() {
    return await httpClient.put('/notifications/mark-all-read');
  }

  async deleteNotification(notificationId) {
    return await httpClient.delete(`/notifications/${notificationId}`);
  }

  async clearAllNotifications() {
    return await httpClient.delete('/notifications/clear-all');
  }

  async getUnreadCount() {
    return await httpClient.get('/notifications/unread-count');
  }

  async checkReminders() {
    return await httpClient.get('/reminders/check');
  }
}

export const notificationsApi = new NotificationsApi();
export default notificationsApi;
