import { adminDb } from '../../../lib/firebase-admin';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../../lib/auth';
import {
  ORGANIZATION_PLANS,
  ORGANIZATION_STATUS,
  DEPLOYMENT_TYPE,
  PLAN_CONFIGS,
  getPlanConfig
} from '../../../lib/models/organization';

/**
 * Organization Registration API
 * POST /api/organizations/register
 *
 * Creates a new organization (tenant) and its first admin user
 * No authentication required (public endpoint)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const {
      // Organization details
      organizationName,
      slug,
      plan = 'starter',  // Default to starter plan

      // Primary admin user details
      adminUsername,
      adminEmail,
      adminPassword,
      adminFullName,

      // Optional billing details
      billingEmail,
      companyWebsite,
    } = req.body;

    // Validation
    if (!organizationName || !adminUsername || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Organization name, admin username, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Validate plan
    if (!PLAN_CONFIGS[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    // Generate unique organization slug
    let organizationSlug = slug || organizationName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug is already taken
    const slugCheck = await adminDb
      .collection('organizations')
      .where('slug', '==', organizationSlug)
      .limit(1)
      .get();

    if (!slugCheck.empty) {
      // Append random suffix to make it unique
      organizationSlug = `${organizationSlug}-${Math.floor(Math.random() * 10000)}`;
    }

    // Generate unique organization ID
    const organizationId = `org-${organizationSlug}-${Date.now()}`;

    // Check if admin username already exists globally
    const usernameCheck = await adminDb
      .collection('users')
      .where('username', '==', adminUsername.trim())
      .limit(1)
      .get();

    if (!usernameCheck.empty) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists. Please choose a different username.'
      });
    }

    // Check if admin email already exists globally
    const emailCheck = await adminDb
      .collection('users')
      .where('email', '==', adminEmail.trim().toLowerCase())
      .limit(1)
      .get();

    if (!emailCheck.empty) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists. Please use a different email or login.'
      });
    }

    // Get plan configuration
    const planConfig = getPlanConfig(plan);

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create organization document
    const organizationData = {
      // Core Identity
      id: organizationId,
      name: organizationName.trim(),
      slug: organizationSlug,
      domain: null,

      // Deployment Configuration
      deploymentType: planConfig.deploymentType,
      databaseConfig: {
        type: 'firestore',
        connectionString: null,
        projectId: process.env.FIREBASE_PROJECT_ID,
        region: 'us-central1',
      },

      // Subscription & Billing
      plan: plan,
      status: ORGANIZATION_STATUS.TRIAL,
      trialEndsAt: admin.firestore.Timestamp.fromDate(trialEndsAt),
      subscriptionStarted: admin.firestore.FieldValue.serverTimestamp(),

      billing: {
        email: billingEmail?.trim() || adminEmail.trim(),
        company: organizationName.trim(),
        address: {
          line1: null,
          line2: null,
          city: null,
          state: null,
          postal: null,
          country: null,
        },
        taxId: null,
        stripeCustomerId: null,
        subscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },

      // Resource Limits (from plan)
      limits: planConfig.limits,

      // Usage Tracking (start at zero)
      usage: {
        users: 1,  // Starting with 1 admin user
        storage: 0,
        apiCalls: 0,
        tasks: 0,
        clients: 0,
      },

      // Feature Flags (from plan)
      features: planConfig.features,

      // Organization Settings
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        currency: 'USD',
        language: 'en',

        // Branding
        logo: null,
        favicon: null,
        primaryColor: '#000000',
        secondaryColor: '#10b981',
        companyWebsite: companyWebsite?.trim() || null,

        // Security
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

        // Integrations
        integrations: {
          googleWorkspace: false,
          microsoft365: false,
          slack: false,
          zoom: false,
        },
      },

      // Primary Contact (will be updated with admin user ID after creation)
      primaryContact: {
        userId: null,  // Will be set after user creation
        name: adminFullName?.trim() || adminUsername.trim(),
        email: adminEmail.trim(),
        phone: null,
      },

      // Metadata
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'registration',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      onboardingCompleted: false,
      onboardingStep: 0,

      // Compliance & Audit
      compliance: {
        dataResidency: 'US',
        certifications: [],
        retentionPolicy: 2555,  // 7 years in days
      },

      // Notes
      notes: `Organization created via self-registration on ${new Date().toISOString()}`,
      tags: ['self-registered', plan],
    };

    // Save organization to Firestore
    await adminDb.collection('organizations').doc(organizationId).set(organizationData);

    // Hash the admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create the admin user
    const adminUserData = {
      tenantId: organizationId,  // ← Critical: Link user to organization!
      username: adminUsername.trim(),
      email: adminEmail.trim().toLowerCase(),
      fullName: adminFullName?.trim() || adminUsername.trim(),
      password: hashedPassword,
      role: 'admin',  // First user is always admin

      // User metadata
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
      isActive: true,

      // Profile
      profileImage: null,
      phone: null,
      department: null,
      jobTitle: 'Administrator',
    };

    const adminUserDoc = await adminDb.collection('users').add(adminUserData);

    // Update organization with admin user ID
    await adminDb.collection('organizations').doc(organizationId).update({
      'primaryContact.userId': adminUserDoc.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Generate JWT token for immediate login
    const token = generateToken({
      id: adminUserDoc.id,
      username: adminUsername.trim(),
      role: 'admin',
      email: adminEmail.trim(),
      tenantId: organizationId,
    });

    // Create activity log entry
    await adminDb.collection('activity_log').add({
      tenantId: organizationId,
      action: 'organization_registered',
      username: adminUsername.trim(),
      userId: adminUserDoc.id,
      details: `Organization "${organizationName}" registered with ${plan} plan`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
    });

    // Return success with token for immediate login
    return res.status(201).json({
      success: true,
      message: 'Organization created successfully! Welcome to Logam Task Manager.',
      token: token,
      user: {
        id: adminUserDoc.id,
        username: adminUsername.trim(),
        email: adminEmail.trim(),
        role: 'admin',
        tenantId: organizationId,
      },
      organization: {
        id: organizationId,
        name: organizationName.trim(),
        slug: organizationSlug,
        plan: plan,
        status: ORGANIZATION_STATUS.TRIAL,
        trialEndsAt: trialEndsAt.toISOString(),
      },
      redirectTo: '/onboarding',  // Redirect to onboarding page
    });

  } catch (error) {
    console.error('Organization registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create organization. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
