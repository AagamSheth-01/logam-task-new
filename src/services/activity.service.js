/**
 * Activity Service
 * Handles activity logging and audit trail
 */

import { adminDb } from '../../lib/firebase-admin.js';

export class ActivityService {
  constructor() {
    this.collection = 'activities';
  }

  /**
   * Log an activity
   * @param {Object} activityData - Activity data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created activity
   */
  async logActivity(activityData, tenantId) {
    try {
      if (!tenantId) {
        console.warn('No tenantId provided for activity logging');
        return null;
      }

      const activity = {
        ...activityData,
        tenantId,
        timestamp: new Date(),
        createdAt: new Date()
      };

      const docRef = await adminDb
        .collection(this.collection)
        .add(activity);

      console.log(`📝 Activity logged: ${activityData.action} by ${activityData.userId}`);

      return {
        id: docRef.id,
        ...activity
      };
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - activity logging should not break main functionality
      return null;
    }
  }

  /**
   * Get activities for a tenant
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Activities
   */
  async getActivities(tenantId, filters = {}) {
    try {
      let query = adminDb
        .collection(this.collection)
        .where('tenantId', '==', tenantId);

      // Apply filters
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }

      if (filters.action) {
        query = query.where('action', '==', filters.action);
      }

      if (filters.clientId) {
        query = query.where('clientId', '==', filters.clientId);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      // Order by timestamp
      query = query.orderBy('timestamp', 'desc');

      const snapshot = await query.get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
      }));
    } catch (error) {
      console.error('Error getting activities:', error);
      throw error;
    }
  }

  /**
   * Get recent activities
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Number of activities to fetch
   * @returns {Promise<Array>} Recent activities
   */
  async getRecentActivities(tenantId, limit = 50) {
    return this.getActivities(tenantId, { limit });
  }

  /**
   * Get activities by user
   * @param {string} userId - User ID
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Number of activities to fetch
   * @returns {Promise<Array>} User activities
   */
  async getUserActivities(userId, tenantId, limit = 50) {
    return this.getActivities(tenantId, { userId, limit });
  }

  /**
   * Get activities by client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Number of activities to fetch
   * @returns {Promise<Array>} Client activities
   */
  async getClientActivities(clientId, tenantId, limit = 50) {
    return this.getActivities(tenantId, { clientId, limit });
  }
}

export const activityService = new ActivityService();
export default activityService;
