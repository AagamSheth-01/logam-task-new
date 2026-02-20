/**
 * Organization Repository
 * Provides clean interface for organization database operations
 * Uses Firestore Admin SDK directly for organization management
 */

import { BaseRepository } from './base.repository.js';
import { adminDb } from '../../lib/firebase-admin.js';

export class OrganizationRepository extends BaseRepository {
  constructor() {
    super('organizations');
  }

  /**
   * Find organization by ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Organization object or null
   */
  async findById(organizationId) {
    try {
      const doc = await adminDb
        .collection('organizations')
        .doc(organizationId)
        .get();

      return this.docToObject(doc);
    } catch (error) {
      this.handleError(error, 'find organization by ID');
    }
  }

  /**
   * Find organization by slug
   * @param {string} slug - Organization slug
   * @returns {Promise<Object|null>} Organization object or null
   */
  async findBySlug(slug) {
    try {
      const snapshot = await adminDb
        .collection('organizations')
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      return this.docToObject(snapshot.docs[0]);
    } catch (error) {
      this.handleError(error, 'find organization by slug');
    }
  }

  /**
   * Get all organizations (for super admin)
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of organizations
   */
  async findAll(filters = {}) {
    try {
      let query = adminDb.collection('organizations');

      // Apply filters
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.plan) {
        query = query.where('plan', '==', filters.plan);
      }

      const snapshot = await query.get();

      return snapshot.docs.map(doc => this.docToObject(doc));
    } catch (error) {
      this.handleError(error, 'find all organizations');
    }
  }

  /**
   * Create a new organization
   * @param {Object} organizationData - Organization data
   * @param {string} organizationId - Optional custom organization ID
   * @returns {Promise<Object>} Created organization object
   */
  async create(organizationData, organizationId = null) {
    try {
      const orgId = organizationId || `org-${Date.now()}`;

      await adminDb
        .collection('organizations')
        .doc(orgId)
        .set({
          ...organizationData,
          id: orgId,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      return await this.findById(orgId);
    } catch (error) {
      this.handleError(error, 'create organization');
    }
  }

  /**
   * Update organization
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated organization object
   */
  async update(organizationId, updateData) {
    try {
      await adminDb
        .collection('organizations')
        .doc(organizationId)
        .update({
          ...updateData,
          updatedAt: new Date()
        });

      return await this.findById(organizationId);
    } catch (error) {
      this.handleError(error, 'update organization');
    }
  }

  /**
   * Delete organization (soft delete by updating status)
   * @param {string} organizationId - Organization ID
   * @returns {Promise<void>}
   */
  async delete(organizationId) {
    try {
      await adminDb
        .collection('organizations')
        .doc(organizationId)
        .update({
          status: 'cancelled',
          updatedAt: new Date()
        });
    } catch (error) {
      this.handleError(error, 'delete organization');
    }
  }

  /**
   * Hard delete organization (permanent deletion)
   * WARNING: This permanently deletes the organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<void>}
   */
  async hardDelete(organizationId) {
    try {
      await adminDb
        .collection('organizations')
        .doc(organizationId)
        .delete();
    } catch (error) {
      this.handleError(error, 'hard delete organization');
    }
  }

  /**
   * Check if slug is available
   * @param {string} slug - Organization slug
   * @returns {Promise<boolean>} True if available
   */
  async isSlugAvailable(slug) {
    try {
      const org = await this.findBySlug(slug);
      return !org;
    } catch (error) {
      this.handleError(error, 'check slug availability');
    }
  }

  /**
   * Update organization usage
   * @param {string} organizationId - Organization ID
   * @param {Object} usageData - Usage data (users, storage, apiCalls, etc.)
   * @returns {Promise<void>}
   */
  async updateUsage(organizationId, usageData) {
    try {
      const updateObj = {};

      Object.keys(usageData).forEach(key => {
        updateObj[`usage.${key}`] = usageData[key];
      });

      await adminDb
        .collection('organizations')
        .doc(organizationId)
        .update({
          ...updateObj,
          updatedAt: new Date()
        });
    } catch (error) {
      this.handleError(error, 'update organization usage');
    }
  }

  /**
   * Increment usage counter
   * @param {string} organizationId - Organization ID
   * @param {string} counter - Counter name (users, tasks, clients, etc.)
   * @param {number} increment - Amount to increment (default: 1)
   * @returns {Promise<void>}
   */
  async incrementUsage(organizationId, counter, increment = 1) {
    try {
      const admin = await import('firebase-admin');

      await adminDb
        .collection('organizations')
        .doc(organizationId)
        .update({
          [`usage.${counter}`]: admin.default.firestore.FieldValue.increment(increment),
          updatedAt: new Date()
        });
    } catch (error) {
      this.handleError(error, 'increment usage counter');
    }
  }

  /**
   * Check if organization has exceeded limit
   * @param {string} organizationId - Organization ID
   * @param {string} limitType - Limit type (maxUsers, maxStorage, etc.)
   * @returns {Promise<boolean>} True if limit exceeded
   */
  async hasExceededLimit(organizationId, limitType) {
    try {
      const org = await this.findById(organizationId);
      if (!org) return true;

      const limit = org.limits?.[limitType];
      const usageKey = limitType.replace('max', '').toLowerCase();
      const usage = org.usage?.[usageKey];

      // -1 means unlimited
      if (limit === -1) return false;

      return usage >= limit;
    } catch (error) {
      this.handleError(error, 'check organization limit');
    }
  }

  /**
   * Check if organization has feature enabled
   * @param {string} organizationId - Organization ID
   * @param {string} featureName - Feature name
   * @returns {Promise<boolean>} True if feature enabled
   */
  async hasFeature(organizationId, featureName) {
    try {
      const org = await this.findById(organizationId);
      if (!org) return false;

      return org.features?.includes(featureName) || false;
    } catch (error) {
      this.handleError(error, 'check organization feature');
    }
  }

  /**
   * Update organization settings
   * @param {string} organizationId - Organization ID
   * @param {Object} settingsData - Settings data
   * @returns {Promise<Object>} Updated organization object
   */
  async updateSettings(organizationId, settingsData) {
    try {
      const updateObj = {};

      Object.keys(settingsData).forEach(key => {
        updateObj[`settings.${key}`] = settingsData[key];
      });

      await adminDb
        .collection('organizations')
        .doc(organizationId)
        .update({
          ...updateObj,
          updatedAt: new Date()
        });

      return await this.findById(organizationId);
    } catch (error) {
      this.handleError(error, 'update organization settings');
    }
  }

  /**
   * Get organizations by status
   * @param {string} status - Organization status
   * @returns {Promise<Array>} List of organizations
   */
  async findByStatus(status) {
    try {
      const snapshot = await adminDb
        .collection('organizations')
        .where('status', '==', status)
        .get();

      return snapshot.docs.map(doc => this.docToObject(doc));
    } catch (error) {
      this.handleError(error, 'find organizations by status');
    }
  }

  /**
   * Get trial organizations that are expiring soon
   * @param {number} daysAhead - Number of days to look ahead (default: 7)
   * @returns {Promise<Array>} List of organizations with expiring trials
   */
  async findExpiringTrials(daysAhead = 7) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const snapshot = await adminDb
        .collection('organizations')
        .where('status', '==', 'trial')
        .where('trialEndsAt', '<=', futureDate)
        .get();

      return snapshot.docs.map(doc => this.docToObject(doc));
    } catch (error) {
      this.handleError(error, 'find expiring trials');
    }
  }
}

export default OrganizationRepository;
