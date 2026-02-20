#!/usr/bin/env node

/**
 * User Backup Script
 * Creates a JSON backup of all users before password migration
 */

import { adminDb } from '../lib/firebase-admin.js';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the already initialized Firebase Admin from firebase-admin.js
const db = adminDb;

async function backupUsers() {
  console.log('\n💾 User Backup Script');
  console.log('='.repeat(50));
  console.log('');

  try {
    // Load all users
    console.log('📥 Loading users from Firestore...');
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('⚠️  No users found in database');
      return;
    }

    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamps to ISO strings
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      });
    });

    console.log(`✅ Found ${users.length} user(s)`);

    // Create backup directory
    const backupDir = join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupFile = join(backupDir, `users-backup-${timestamp}.json`);

    // Write backup
    fs.writeFileSync(backupFile, JSON.stringify({
      backupDate: new Date().toISOString(),
      totalUsers: users.length,
      users: users
    }, null, 2));

    console.log(`\n✅ Backup created successfully!`);
    console.log(`📁 Location: ${backupFile}`);
    console.log(`📊 Users backed up: ${users.length}`);

    // Show summary
    console.log('\n📋 Backup Summary:');
    console.log('='.repeat(50));
    users.forEach(user => {
      console.log(`  • ${user.username} (${user.role})`);
    });
    console.log('='.repeat(50));

    return backupFile;

  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    throw error;
  }
}

// Run backup
(async () => {
  try {
    const backupFile = await backupUsers();
    console.log('\n✅ Backup complete! Ready for migration.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backup script failed:', error);
    process.exit(1);
  }
})();
