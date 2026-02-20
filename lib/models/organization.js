// Multi-Tenant Organization Model
// Supports both shared and dedicated database deployments

/**
 * Organization/Tenant Data Model
 *
 * This defines the structure for organizations (tenants) in your multi-tenant system.
 * Each organization represents a company/client using your SaaS platform.
 */

export const ORGANIZATION_PLANS = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
  CUSTOM: 'custom'
};

export const ORGANIZATION_STATUS = {
  ACTIVE: 'active',
  TRIAL: 'trial',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  PENDING: 'pending'
};

export const DEPLOYMENT_TYPE = {
  SHARED: 'shared',        // Standard - shares database with other tenants
  DEDICATED: 'dedicated',  // Enterprise - has own dedicated database
  HYBRID: 'hybrid'         // Custom - some data shared, some dedicated
};

/**
 * Organization Schema
 */
export const organizationSchema = {
  // Core Identity
  id: String,              // Auto-generated unique ID
  name: String,            // Company name
  slug: String,            // URL-friendly identifier (e.g., "abc-corp")
  domain: String,          // Optional custom domain

  // Deployment Configuration
  deploymentType: String,  // 'shared', 'dedicated', or 'hybrid'
  databaseConfig: {
    type: String,          // 'firestore', 'mongodb', 'postgresql'
    connectionString: String,  // For dedicated deployments
    projectId: String,     // Firebase project ID (for dedicated)
    region: String,        // Data residency region
  },

  // Subscription & Billing
  plan: String,            // starter, professional, enterprise, custom
  status: String,          // active, trial, suspended, cancelled
  trialEndsAt: Date,
  subscriptionStarted: Date,

  billing: {
    email: String,
    company: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postal: String,
      country: String,
    },
    taxId: String,
    stripeCustomerId: String,
    subscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: Boolean,
  },

  // Resource Limits
  limits: {
    maxUsers: Number,           // Max active users
    maxStorage: Number,         // In bytes
    maxFileSize: Number,        // In bytes
    maxApiCalls: Number,        // Per month
    maxTasksPerUser: Number,
    maxClients: Number,
  },

  // Usage Tracking
  usage: {
    users: Number,              // Current user count
    storage: Number,            // Bytes used
    apiCalls: Number,           // This billing period
    tasks: Number,              // Current task count
    clients: Number,            // Current client count
  },

  // Feature Flags
  features: Array,  // List of enabled features
  /*
  Example:
  [
    'basic-tasks',
    'client-management',
    'file-uploads',
    'calendar',
    'meetings',
    'analytics',
    'advanced-analytics',
    'api-access',
    'sso',
    'audit-logs',
    'custom-branding',
    'white-label',
  ]
  */

  // Organization Settings
  settings: {
    timezone: String,           // e.g., "America/New_York"
    dateFormat: String,         // e.g., "MM/DD/YYYY"
    timeFormat: String,         // "12h" or "24h"
    currency: String,           // e.g., "USD"
    language: String,           // e.g., "en"

    // Branding
    logo: String,               // URL to logo
    favicon: String,            // URL to favicon
    primaryColor: String,       // Hex color
    secondaryColor: String,     // Hex color
    companyWebsite: String,

    // Security
    allowedDomains: Array,      // Email domains for auto-join
    requireMfa: Boolean,
    sessionTimeout: Number,     // Minutes
    passwordPolicy: {
      minLength: Number,
      requireUppercase: Boolean,
      requireLowercase: Boolean,
      requireNumbers: Boolean,
      requireSpecialChars: Boolean,
      expiryDays: Number,
    },

    // Integrations
    integrations: {
      googleWorkspace: Boolean,
      microsoft365: Boolean,
      slack: Boolean,
      zoom: Boolean,
    },
  },

  // Admin Contact
  primaryContact: {
    userId: String,
    name: String,
    email: String,
    phone: String,
  },

  // Metadata
  createdAt: Date,
  createdBy: String,           // User ID who created org
  updatedAt: Date,
  onboardingCompleted: Boolean,
  onboardingStep: Number,      // Current step in onboarding

  // Compliance & Audit
  compliance: {
    dataResidency: String,     // e.g., "US", "EU", "APAC"
    certifications: Array,     // e.g., ["SOC2", "GDPR", "HIPAA"]
    retentionPolicy: Number,   // Days to keep data
  },

  // Notes
  notes: String,               // Internal notes (admin only)
  tags: Array,                 // For organization
};

/**
 * Plan Configurations
 */
export const PLAN_CONFIGS = {
  starter: {
    name: 'Starter',
    price: 29,  // USD per month
    deploymentType: DEPLOYMENT_TYPE.SHARED,
    limits: {
      maxUsers: 5,
      maxStorage: 5368709120,  // 5GB
      maxFileSize: 10485760,   // 10MB
      maxApiCalls: 10000,
      maxTasksPerUser: 100,
      maxClients: 20,
    },
    features: [
      'basic-tasks',
      'client-management',
      'file-uploads',
      'calendar',
    ],
  },

  professional: {
    name: 'Professional',
    price: 79,
    deploymentType: DEPLOYMENT_TYPE.SHARED,
    limits: {
      maxUsers: 50,
      maxStorage: 53687091200,  // 50GB
      maxFileSize: 104857600,    // 100MB
      maxApiCalls: 100000,
      maxTasksPerUser: 1000,
      maxClients: 200,
    },
    features: [
      'basic-tasks',
      'client-management',
      'file-uploads',
      'calendar',
      'meetings',
      'analytics',
      'api-access',
      'custom-branding',
    ],
  },

  enterprise: {
    name: 'Enterprise',
    price: 299,
    deploymentType: DEPLOYMENT_TYPE.DEDICATED,  // ← Dedicated database!
    limits: {
      maxUsers: -1,             // Unlimited
      maxStorage: -1,           // Unlimited
      maxFileSize: 1073741824,  // 1GB
      maxApiCalls: -1,          // Unlimited
      maxTasksPerUser: -1,      // Unlimited
      maxClients: -1,           // Unlimited
    },
    features: [
      'basic-tasks',
      'client-management',
      'file-uploads',
      'calendar',
      'meetings',
      'analytics',
      'advanced-analytics',
      'api-access',
      'sso',
      'audit-logs',
      'custom-branding',
      'white-label',
      'dedicated-database',     // ← Key feature!
      'custom-domain',
      'priority-support',
      '24-7-support',
    ],
  },

  custom: {
    name: 'Custom',
    price: null,  // Contact sales
    deploymentType: DEPLOYMENT_TYPE.HYBRID,  // Can be customized
    limits: {
      // Negotiated per client
    },
    features: [
      // Fully customizable
    ],
  },
};

/**
 * Helper function to get plan configuration
 */
export const getPlanConfig = (planName) => {
  return PLAN_CONFIGS[planName] || PLAN_CONFIGS.professional;
};

/**
 * Helper function to check if feature is available for organization
 */
export const hasFeature = (organization, featureName) => {
  return organization.features?.includes(featureName) || false;
};

/**
 * Helper function to check if limit is exceeded
 */
export const isLimitExceeded = (organization, limitName) => {
  const limit = organization.limits[limitName];
  const usage = organization.usage[limitName];

  // -1 means unlimited
  if (limit === -1) return false;

  return usage >= limit;
};

/**
 * Helper function to check if organization can add more users
 */
export const canAddUser = (organization) => {
  return !isLimitExceeded(organization, 'users');
};

/**
 * Default organization for existing data migration
 */
export const createDefaultOrganization = () => {
  return {
    id: 'logam-digital-001',
    name: 'Logam Digital',
    slug: 'logam-digital',
    domain: null,

    deploymentType: DEPLOYMENT_TYPE.SHARED,
    databaseConfig: {
      type: 'firestore',
      connectionString: null,
      projectId: process.env.FIREBASE_PROJECT_ID,
      region: 'us-central1',
    },

    plan: ORGANIZATION_PLANS.PROFESSIONAL,
    status: ORGANIZATION_STATUS.ACTIVE,
    trialEndsAt: null,
    subscriptionStarted: new Date(),

    billing: {
      email: process.env.DEFAULT_BILLING_EMAIL || 'admin@logamdigital.com',
      company: 'Logam Digital',
      stripeCustomerId: null,
      subscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },

    limits: PLAN_CONFIGS.professional.limits,
    usage: {
      users: 0,
      storage: 0,
      apiCalls: 0,
      tasks: 0,
      clients: 0,
    },

    features: PLAN_CONFIGS.professional.features,

    settings: {
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      currency: 'USD',
      language: 'en',
      logo: null,
      primaryColor: '#3b82f6',
      secondaryColor: '#10b981',
      allowedDomains: [],
      requireMfa: false,
      sessionTimeout: 1440,  // 24 hours
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        expiryDays: null,
      },
    },

    primaryContact: {
      userId: null,
      name: 'Logam Digital Admin',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@logamdigital.com',
      phone: null,
    },

    createdAt: new Date(),
    createdBy: 'system',
    updatedAt: new Date(),
    onboardingCompleted: true,
    onboardingStep: 0,

    compliance: {
      dataResidency: 'US',
      certifications: [],
      retentionPolicy: 2555,  // 7 years
    },

    notes: 'Logam Digital - Primary organization. All existing users and data migrated here.',
    tags: ['primary', 'logam-digital', 'migrated'],
  };
};

export default {
  ORGANIZATION_PLANS,
  ORGANIZATION_STATUS,
  DEPLOYMENT_TYPE,
  PLAN_CONFIGS,
  organizationSchema,
  getPlanConfig,
  hasFeature,
  isLimitExceeded,
  canAddUser,
  createDefaultOrganization,
};
