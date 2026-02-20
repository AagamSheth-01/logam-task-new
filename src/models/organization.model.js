/**
 * Organization Model
 * Defines organization data structure and validation rules
 */

import { ORGANIZATION_STATUS, SUBSCRIPTION_PLANS } from '../utils/constants.js';

export class OrganizationModel {
  constructor(data) {
    this.id = data.id || null;
    this.tenantId = data.tenantId || data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.plan = data.plan || SUBSCRIPTION_PLANS.STARTER;
    this.status = data.status || ORGANIZATION_STATUS.TRIAL;
    this.billingEmail = data.billingEmail || null;
    this.companyWebsite = data.companyWebsite || null;
    this.trialEndsAt = data.trialEndsAt || null;
    this.subscriptionStartedAt = data.subscriptionStartedAt || null;
    this.limits = data.limits || {};
    this.features = data.features || {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Convert to plain object for database storage
   */
  toObject() {
    return {
      ...(this.id && { id: this.id }),
      tenantId: this.tenantId,
      name: this.name,
      slug: this.slug,
      plan: this.plan,
      status: this.status,
      billingEmail: this.billingEmail,
      companyWebsite: this.companyWebsite,
      trialEndsAt: this.trialEndsAt,
      subscriptionStartedAt: this.subscriptionStartedAt,
      limits: this.limits,
      features: this.features,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Check if organization is on trial
   */
  isOnTrial() {
    return this.status === ORGANIZATION_STATUS.TRIAL;
  }

  /**
   * Check if trial has expired
   */
  isTrialExpired() {
    if (!this.trialEndsAt) return false;
    return new Date(this.trialEndsAt) < new Date();
  }

  /**
   * Validation rules
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      // Required fields for creation
      if (!data.name || !data.name.trim()) {
        errors.push({ field: 'name', message: 'Organization name is required' });
      }
      if (!data.slug || !data.slug.trim()) {
        errors.push({ field: 'slug', message: 'Organization slug is required' });
      }
    }

    // Slug validation (lowercase alphanumeric with hyphens)
    if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
      errors.push({
        field: 'slug',
        message: 'Slug must be lowercase alphanumeric with hyphens only'
      });
    }

    // Plan validation
    if (data.plan && !Object.values(SUBSCRIPTION_PLANS).includes(data.plan)) {
      errors.push({ field: 'plan', message: 'Invalid subscription plan' });
    }

    // Status validation
    if (data.status && !Object.values(ORGANIZATION_STATUS).includes(data.status)) {
      errors.push({ field: 'status', message: 'Invalid organization status' });
    }

    // Email validation (if provided)
    if (data.billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.billingEmail)) {
      errors.push({ field: 'billingEmail', message: 'Invalid billing email format' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default OrganizationModel;
