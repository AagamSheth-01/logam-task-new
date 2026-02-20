/**
 * Organization Service
 * Contains business logic for organization management
 * Uses OrganizationRepository for data access
 */

import { OrganizationRepository } from '../repositories/organization.repository.js';
import { OrganizationModel } from '../models/organization.model.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { ORGANIZATION_STATUS, PLAN_CONFIGS } from '../utils/constants.js';

export class OrganizationService {
  constructor() {
    this.organizationRepository = new OrganizationRepository();
  }

  /**
   * Get organization by ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Organization object or null
   */
  async getOrganizationById(organizationId) {
    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    const org = await this.organizationRepository.findById(organizationId);

    if (!org) return null;

    return new OrganizationModel(org).toObject();
  }

  /**
   * Get organization by slug
   * @param {string} slug - Organization slug
   * @returns {Promise<Object|null>} Organization object or null
   */
  async getOrganizationBySlug(slug) {
    if (!slug) {
      throw new ValidationError('Organization slug is required');
    }

    const org = await this.organizationRepository.findBySlug(slug);

    if (!org) return null;

    return new OrganizationModel(org).toObject();
  }

  /**
   * Get all organizations (for super admin)
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of organizations
   */
  async getAllOrganizations(filters = {}) {
    const orgs = await this.organizationRepository.findAll(filters);
    return orgs.map(org => new OrganizationModel(org).toObject());
  }

  /**
   * Create a new organization
   * @param {Object} organizationData - Organization data
   * @param {string} organizationId - Optional custom organization ID
   * @returns {Promise<Object>} Created organization object
   */
  async createOrganization(organizationData, organizationId = null) {
    // Validate input data
    const validation = OrganizationModel.validate(organizationData);
    if (!validation.isValid) {
      throw new ValidationError('Invalid organization data', validation.errors);
    }

    // Check if slug is available
    const slugExists = await this.organizationRepository.findBySlug(organizationData.slug);
    if (slugExists) {
      throw new ConflictError(`Organization slug "${organizationData.slug}" already exists`);
    }

    // Create organization model
    const orgModel = new OrganizationModel(organizationData);

    // Save to database
    const newOrg = await this.organizationRepository.create(
      orgModel.toObject(),
      organizationId
    );

    return new OrganizationModel(newOrg).toObject();
  }

  /**
   * Update organization
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated organization object
   */
  async updateOrganization(organizationId, updateData) {
    // Validate update data
    const validation = OrganizationModel.validate(updateData, true);
    if (!validation.isValid) {
      throw new ValidationError('Invalid update data', validation.errors);
    }

    // Check if organization exists
    const existingOrg = await this.organizationRepository.findById(organizationId);
    if (!existingOrg) {
      throw new NotFoundError('Organization not found');
    }

    // If updating slug, check for conflicts
    if (updateData.slug && updateData.slug !== existingOrg.slug) {
      const slugExists = await this.organizationRepository.findBySlug(updateData.slug);
      if (slugExists) {
        throw new ConflictError(`Organization slug "${updateData.slug}" already exists`);
      }
    }

    // Update in database
    const updatedOrg = await this.organizationRepository.update(organizationId, updateData);

    return new OrganizationModel(updatedOrg).toObject();
  }

  /**
   * Delete organization (soft delete)
   * @param {string} organizationId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteOrganization(organizationId) {
    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    // Check if organization exists
    const existingOrg = await this.organizationRepository.findById(organizationId);
    if (!existingOrg) {
      throw new NotFoundError('Organization not found');
    }

    await this.organizationRepository.delete(organizationId);
  }

  /**
   * Check if slug is available
   * @param {string} slug - Organization slug
   * @returns {Promise<boolean>} True if available
   */
  async isSlugAvailable(slug) {
    if (!slug) {
      throw new ValidationError('Slug is required');
    }

    return await this.organizationRepository.isSlugAvailable(slug);
  }

  /**
   * Update organization usage
   * @param {string} organizationId - Organization ID
   * @param {Object} usageData - Usage data
   * @returns {Promise<void>}
   */
  async updateUsage(organizationId, usageData) {
    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    await this.organizationRepository.updateUsage(organizationId, usageData);
  }

  /**
   * Increment usage counter
   * @param {string} organizationId - Organization ID
   * @param {string} counter - Counter name (users, tasks, clients, etc.)
   * @param {number} increment - Amount to increment
   * @returns {Promise<void>}
   */
  async incrementUsage(organizationId, counter, increment = 1) {
    if (!organizationId || !counter) {
      throw new ValidationError('Organization ID and counter name are required');
    }

    await this.organizationRepository.incrementUsage(organizationId, counter, increment);
  }

  /**
   * Check if organization has exceeded limit
   * @param {string} organizationId - Organization ID
   * @param {string} limitType - Limit type (maxUsers, maxStorage, etc.)
   * @returns {Promise<boolean>} True if limit exceeded
   */
  async hasExceededLimit(organizationId, limitType) {
    if (!organizationId || !limitType) {
      throw new ValidationError('Organization ID and limit type are required');
    }

    return await this.organizationRepository.hasExceededLimit(organizationId, limitType);
  }

  /**
   * Check if organization has feature enabled
   * @param {string} organizationId - Organization ID
   * @param {string} featureName - Feature name
   * @returns {Promise<boolean>} True if feature enabled
   */
  async hasFeature(organizationId, featureName) {
    if (!organizationId || !featureName) {
      throw new ValidationError('Organization ID and feature name are required');
    }

    return await this.organizationRepository.hasFeature(organizationId, featureName);
  }

  /**
   * Update organization settings
   * @param {string} organizationId - Organization ID
   * @param {Object} settingsData - Settings data
   * @returns {Promise<Object>} Updated organization object
   */
  async updateSettings(organizationId, settingsData) {
    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    const updatedOrg = await this.organizationRepository.updateSettings(
      organizationId,
      settingsData
    );

    return new OrganizationModel(updatedOrg).toObject();
  }

  /**
   * Get organizations by status
   * @param {string} status - Organization status
   * @returns {Promise<Array>} List of organizations
   */
  async getOrganizationsByStatus(status) {
    if (!status) {
      throw new ValidationError('Status is required');
    }

    const orgs = await this.organizationRepository.findByStatus(status);
    return orgs.map(org => new OrganizationModel(org).toObject());
  }

  /**
   * Get trial organizations expiring soon
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array>} List of organizations with expiring trials
   */
  async getExpiringTrials(daysAhead = 7) {
    const orgs = await this.organizationRepository.findExpiringTrials(daysAhead);
    return orgs.map(org => new OrganizationModel(org).toObject());
  }

  /**
   * Check if organization trial is expired
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>} True if trial expired
   */
  async isTrialExpired(organizationId) {
    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    const orgModel = new OrganizationModel(org);
    return orgModel.isTrialExpired();
  }

  /**
   * Upgrade organization plan
   * @param {string} organizationId - Organization ID
   * @param {string} newPlan - New plan name
   * @returns {Promise<Object>} Updated organization object
   */
  async upgradePlan(organizationId, newPlan) {
    if (!organizationId || !newPlan) {
      throw new ValidationError('Organization ID and new plan are required');
    }

    // Validate plan
    if (!PLAN_CONFIGS[newPlan]) {
      throw new ValidationError('Invalid plan selected');
    }

    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Get new plan configuration
    const planConfig = PLAN_CONFIGS[newPlan];

    // Update organization with new plan details
    const updateData = {
      plan: newPlan,
      limits: planConfig.limits,
      features: planConfig.features,
      status: ORGANIZATION_STATUS.ACTIVE
    };

    const updatedOrg = await this.organizationRepository.update(organizationId, updateData);

    return new OrganizationModel(updatedOrg).toObject();
  }

  /**
   * Activate organization (from trial to active)
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Updated organization object
   */
  async activateOrganization(organizationId) {
    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    const updateData = {
      status: ORGANIZATION_STATUS.ACTIVE,
      subscriptionStartedAt: new Date().toISOString()
    };

    const updatedOrg = await this.organizationRepository.update(organizationId, updateData);

    return new OrganizationModel(updatedOrg).toObject();
  }

  /**
   * Suspend organization
   * @param {string} organizationId - Organization ID
   * @param {string} reason - Reason for suspension
   * @returns {Promise<Object>} Updated organization object
   */
  async suspendOrganization(organizationId, reason = '') {
    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    const updateData = {
      status: ORGANIZATION_STATUS.SUSPENDED,
      notes: `${org.notes || ''}\nSuspended: ${reason} (${new Date().toISOString()})`
    };

    const updatedOrg = await this.organizationRepository.update(organizationId, updateData);

    return new OrganizationModel(updatedOrg).toObject();
  }
}

export default OrganizationService;
