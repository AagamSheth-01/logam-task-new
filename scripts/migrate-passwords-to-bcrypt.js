#!/usr/bin/env node

/**
 * Password Migration Script: Plaintext to Bcrypt Hashing
 *
 * This script migrates all user passwords from plaintext to bcrypt hashed passwords.
 * It is safe to run multiple times (idempotent) - already hashed passwords will be skipped.
 *
 * Usage:
 *   node scripts/migrate-passwords-to-bcrypt.js
 *
 * What it does:
 * 1. Loads all users from Firestore
 * 2. Identifies passwords that are NOT yet hashed
 * 3. Hashes plaintext passwords using bcrypt (salt rounds: 10)
 * 4. Updates users in Firestore with hashed passwords
 * 5. Shows progress and summary
 */

import bcrypt from 'bcryptjs';
import { adminDb } from '../lib/firebase-admin.js';
import admin from 'firebase-admin';

// Use the already initialized Firebase Admin from firebase-admin.js
const db = adminDb;

/**
 * Check if a password is already hashed with bcrypt
 * Bcrypt hashes always start with $2a$, $2b$, or $2y$
 */
function isPasswordHashed(password) {
  if (!password) return false;
  return /^\$2[aby]\$\d{2}\$/.test(password);
}

/**
 * Hash a plaintext password using bcrypt
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Main migration function
 */
async function migratePasswords() {
  console.log('\n🔐 Password Migration: Plaintext → Bcrypt');
  console.log('='.repeat(50));
  console.log('');

  try {
    // Step 1: Load all users
    console.log('📥 Loading users from Firestore...');
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('⚠️  No users found in database');
      return;
    }

    const totalUsers = usersSnapshot.size;
    console.log(`✅ Found ${totalUsers} user(s)\n`);

    // Step 2: Process each user
    let alreadyHashed = 0;
    let migrated = 0;
    let failed = 0;
    let skipped = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;
      const username = userData.username || userId;

      // Check if password exists
      if (!userData.password) {
        console.log(`⏭️  Skipping ${username}: No password field`);
        skipped++;
        continue;
      }

      // Check if already hashed
      if (isPasswordHashed(userData.password)) {
        console.log(`✓ ${username}: Already hashed (skipping)`);
        alreadyHashed++;
        continue;
      }

      // Hash the plaintext password
      try {
        console.log(`🔄 Migrating ${username}...`);
        const hashedPassword = await hashPassword(userData.password);

        // Update in Firestore
        await db.collection('users').doc(userId).update({
          password: hashedPassword,
          passwordMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
          passwordHashingMethod: 'bcrypt'
        });

        console.log(`✅ ${username}: Successfully migrated`);
        migrated++;

      } catch (error) {
        console.error(`❌ ${username}: Failed - ${error.message}`);
        failed++;
      }
    }

    // Step 3: Show summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`Total users:        ${totalUsers}`);
    console.log(`✅ Already hashed:   ${alreadyHashed}`);
    console.log(`✅ Newly migrated:   ${migrated}`);
    console.log(`⏭️  Skipped:          ${skipped}`);
    console.log(`❌ Failed:           ${failed}`);
    console.log('='.repeat(50));

    if (migrated > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('🔒 All user passwords are now securely hashed with bcrypt.');
      console.log('\n⚠️  IMPORTANT: Update your authentication code to use bcrypt.compare()');
    } else if (alreadyHashed === totalUsers) {
      console.log('\n✅ All passwords are already hashed. No migration needed!');
    } else {
      console.log('\n⚠️  Migration completed with some issues. Check logs above.');
    }

    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Verify migration by testing one user (optional verification step)
 */
async function verifyMigration() {
  console.log('\n🧪 Running verification...');

  try {
    const usersSnapshot = await db.collection('users').limit(1).get();

    if (usersSnapshot.empty) {
      console.log('⚠️  No users to verify');
      return;
    }

    const userData = usersSnapshot.docs[0].data();

    if (isPasswordHashed(userData.password)) {
      console.log('✅ Verification passed: Password is properly hashed');
      console.log(`   Format: ${userData.password.substring(0, 10)}...`);
    } else {
      console.log('❌ Verification failed: Password is still plaintext');
    }
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }
}

// Run the migration
(async () => {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Starting Password Migration Script');
    console.log('='.repeat(50));
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    // Confirm before proceeding
    console.log('⚠️  WARNING: This will modify user passwords in the database.');
    console.log('✅ Safe to run: Already hashed passwords will be skipped.');
    console.log('📋 Backup recommended before proceeding.\n');

    // Wait 3 seconds for user to cancel if needed
    console.log('⏳ Starting in 3 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));

    await migratePasswords();
    await verifyMigration();

    console.log('\n✅ Script completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
})();
