#!/usr/bin/env node

/**
 * Multi-Tenancy Migration Script
 *
 * This script migrates your single-tenant database to multi-tenant architecture by:
 * 1. Creating a "Default Organization" for existing data
 * 2. Adding tenantId to all existing users
 * 3. Adding tenantId to all existing tasks
 * 4. Adding tenantId to all existing clients
 * 5. Adding tenantId to all other collections
 *
 * Safe to run multiple times (idempotent).
 */

import { adminDb } from '../lib/firebase-admin.js';
import admin from 'firebase-admin';
import { createDefaultOrganization } from '../lib/models/organization.js';

const db = adminDb;

// Default tenant ID for existing data
const DEFAULT_TENANT_ID = 'logam-digital-001';

/**
 * Step 1: Create default organization
 */
async function createOrganization() {
  console.log('\n📦 Step 1: Creating default organization...');

  try {
    // Check if organization already exists
    const orgDoc = await db.collection('organizations').doc(DEFAULT_TENANT_ID).get();

    if (orgDoc.exists) {
      console.log('✅ Default organization already exists');
      return orgDoc.data();
    }

    // Create new organization
    const defaultOrg = createDefaultOrganization();

    await db.collection('organizations').doc(DEFAULT_TENANT_ID).set(defaultOrg);

    console.log(`✅ Created organization: ${defaultOrg.name}`);
    console.log(`   ID: ${defaultOrg.id}`);
    console.log(`   Plan: ${defaultOrg.plan}`);
    console.log(`   Deployment: ${defaultOrg.deploymentType}`);

    return defaultOrg;

  } catch (error) {
    console.error('❌ Failed to create organization:', error);
    throw error;
  }
}

/**
 * Step 2: Add tenantId to users collection
 */
async function migrateUsers(tenantId) {
  console.log('\n👥 Step 2: Migrating users...');

  try {
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('⚠️  No users found');
      return { total: 0, migrated: 0, skipped: 0 };
    }

    let migrated = 0;
    let skipped = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();

      // Skip if already has tenantId
      if (userData.tenantId) {
        console.log(`✓ ${userData.username}: Already has tenantId (skipping)`);
        skipped++;
        continue;
      }

      // Add tenantId
      await doc.ref.update({
        tenantId: tenantId,
        migratedToMultiTenant: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ ${userData.username}: Added tenantId`);
      migrated++;
    }

    console.log(`\n📊 Users: ${migrated} migrated, ${skipped} skipped`);
    return { total: usersSnapshot.size, migrated, skipped };

  } catch (error) {
    console.error('❌ Failed to migrate users:', error);
    throw error;
  }
}

/**
 * Step 3: Add tenantId to tasks collection
 */
async function migrateTasks(tenantId) {
  console.log('\n📋 Step 3: Migrating tasks...');

  try {
    const tasksSnapshot = await db.collection('tasks').get();

    if (tasksSnapshot.empty) {
      console.log('⚠️  No tasks found');
      return { total: 0, migrated: 0, skipped: 0 };
    }

    let migrated = 0;
    let skipped = 0;

    for (const doc of tasksSnapshot.docs) {
      const taskData = doc.data();

      // Skip if already has tenantId
      if (taskData.tenantId) {
        console.log(`✓ Task ${doc.id}: Already has tenantId (skipping)`);
        skipped++;
        continue;
      }

      // Add tenantId
      await doc.ref.update({
        tenantId: tenantId,
        migratedToMultiTenant: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Task ${doc.id}: Added tenantId`);
      migrated++;
    }

    console.log(`\n📊 Tasks: ${migrated} migrated, ${skipped} skipped`);
    return { total: tasksSnapshot.size, migrated, skipped };

  } catch (error) {
    console.error('❌ Failed to migrate tasks:', error);
    throw error;
  }
}

/**
 * Step 4: Add tenantId to clients collection
 */
async function migrateClients(tenantId) {
  console.log('\n🏢 Step 4: Migrating clients...');

  try {
    const clientsSnapshot = await db.collection('clients').get();

    if (clientsSnapshot.empty) {
      console.log('⚠️  No clients found');
      return { total: 0, migrated: 0, skipped: 0 };
    }

    let migrated = 0;
    let skipped = 0;

    for (const doc of clientsSnapshot.docs) {
      const clientData = doc.data();

      // Skip if already has tenantId
      if (clientData.tenantId) {
        console.log(`✓ Client ${clientData.name}: Already has tenantId (skipping)`);
        skipped++;
        continue;
      }

      // Add tenantId
      await doc.ref.update({
        tenantId: tenantId,
        migratedToMultiTenant: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Client ${clientData.name || doc.id}: Added tenantId`);
      migrated++;
    }

    console.log(`\n📊 Clients: ${migrated} migrated, ${skipped} skipped`);
    return { total: clientsSnapshot.size, migrated, skipped };

  } catch (error) {
    console.error('❌ Failed to migrate clients:', error);
    throw error;
  }
}

/**
 * Step 5: Add tenantId to other collections
 */
async function migrateCollection(collectionName, tenantId) {
  console.log(`\n📁 Migrating ${collectionName}...`);

  try {
    const snapshot = await db.collection(collectionName).get();

    if (snapshot.empty) {
      console.log(`⚠️  No documents found in ${collectionName}`);
      return { total: 0, migrated: 0, skipped: 0 };
    }

    let migrated = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Skip if already has tenantId
      if (data.tenantId) {
        skipped++;
        continue;
      }

      // Add tenantId
      await doc.ref.update({
        tenantId: tenantId,
        migratedToMultiTenant: admin.firestore.FieldValue.serverTimestamp()
      });

      migrated++;
    }

    console.log(`📊 ${collectionName}: ${migrated} migrated, ${skipped} skipped`);
    return { total: snapshot.size, migrated, skipped };

  } catch (error) {
    console.error(`❌ Failed to migrate ${collectionName}:`, error);
    return { total: 0, migrated: 0, skipped: 0, error: error.message };
  }
}

/**
 * Step 6: Update organization usage stats
 */
async function updateOrganizationUsage(tenantId, stats) {
  console.log('\n📊 Updating organization usage statistics...');

  try {
    await db.collection('organizations').doc(tenantId).update({
      'usage.users': stats.users || 0,
      'usage.tasks': stats.tasks || 0,
      'usage.clients': stats.clients || 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Organization usage updated');
  } catch (error) {
    console.error('❌ Failed to update organization usage:', error);
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('\n🚀 Starting Multi-Tenancy Migration');
  console.log('='.repeat(60));
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log(`🎯 Target Tenant ID: ${DEFAULT_TENANT_ID}`);
  console.log('');

  const startTime = Date.now();
  const results = {
    organization: null,
    users: null,
    tasks: null,
    clients: null,
    clientUsers: null,
    clientFiles: null,
    clientMeetings: null,
    clientCalendarEvents: null,
    clientActivities: null,
    attendance: null,
  };

  try {
    // Step 1: Create organization
    results.organization = await createOrganization();

    // Step 2: Migrate users
    results.users = await migrateUsers(DEFAULT_TENANT_ID);

    // Step 3: Migrate tasks
    results.tasks = await migrateTasks(DEFAULT_TENANT_ID);

    // Step 4: Migrate clients
    results.clients = await migrateClients(DEFAULT_TENANT_ID);

    // Step 5: Migrate other collections
    const otherCollections = [
      'client_users',
      'client_files',
      'client_meetings',
      'client_calendar_events',
      'client_activities',
      'attendance',
    ];

    for (const collectionName of otherCollections) {
      results[collectionName.replace(/-/g, '')] = await migrateCollection(
        collectionName,
        DEFAULT_TENANT_ID
      );
    }

    // Step 6: Update organization usage
    await updateOrganizationUsage(DEFAULT_TENANT_ID, {
      users: results.users?.total || 0,
      tasks: results.tasks?.total || 0,
      clients: results.clients?.total || 0,
    });

    // Show final summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Organization: ${results.organization.name} (${results.organization.id})`);
    console.log(`✅ Users:        ${results.users.migrated} migrated`);
    console.log(`✅ Tasks:        ${results.tasks.migrated} migrated`);
    console.log(`✅ Clients:      ${results.clients.migrated} migrated`);
    console.log(`✅ Duration:     ${duration}s`);
    console.log('='.repeat(60));
    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Update authentication to include tenantId in JWT');
    console.log('   2. Update all database queries to filter by tenantId');
    console.log('   3. Test with existing users (should work normally)');
    console.log('   4. Create new organization for testing');
    console.log('');

    return results;

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('');
    console.error('⚠️  IMPORTANT: Some data may have been migrated.');
    console.error('   Check the logs above to see what succeeded.');
    console.error('   The script is idempotent - you can run it again.');
    console.error('');
    throw error;
  }
}

// Run the migration
(async () => {
  try {
    console.log('\n⚠️  WARNING: This will modify your database!');
    console.log('✅ Safe to run: Already migrated data will be skipped.');
    console.log('📋 Backup recommended before proceeding.\n');
    console.log('⏳ Starting in 3 seconds... (Ctrl+C to cancel)');

    await new Promise(resolve => setTimeout(resolve, 3000));

    await runMigration();

    console.log('✅ Script completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
})();
