/**
 * Script to find attendance records with wrong tenantId
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized\n');
}

const db = admin.firestore();

async function findWrongTenants() {
  console.log('🔍 FINDING ATTENDANCE RECORDS WITH WRONG TENANTID\n');
  console.log('═'.repeat(80));

  try {
    // Get all users from both organizations
    const allUsers = await db.collection('users').get();

    // Create a map of username -> correct tenantId
    const userTenantMap = {};
    allUsers.forEach(doc => {
      const user = doc.data();
      userTenantMap[user.username] = user.tenantId;
    });

    console.log('\n📋 User to TenantId Mapping:');
    console.log('-'.repeat(80));
    Object.entries(userTenantMap).forEach(([username, tenantId]) => {
      const org = tenantId === 'logam-digital-001' ? 'Logam Digital' : 'Logam Academy';
      console.log(`  ${username.padEnd(20)} → ${org}`);
    });

    // Get all attendance records
    const allAttendance = await db.collection('attendance').get();

    console.log('\n\n🔍 Checking for mismatched tenantIds...\n');
    console.log('═'.repeat(80));

    const wrongRecords = [];

    allAttendance.forEach(doc => {
      const att = doc.data();
      const username = att.username;
      const attendanceTenantId = att.tenantId;
      const correctTenantId = userTenantMap[username];

      if (correctTenantId && correctTenantId !== attendanceTenantId) {
        wrongRecords.push({
          id: doc.id,
          username,
          attendanceTenantId,
          correctTenantId,
          date: att.date?.toDate?.() || new Date(att.date)
        });
      }
    });

    if (wrongRecords.length === 0) {
      console.log('✅ No mismatched records found!\n');
    } else {
      console.log(`❌ Found ${wrongRecords.length} records with wrong tenantId:\n`);

      wrongRecords.forEach(record => {
        const wrongOrg = record.attendanceTenantId === 'logam-digital-001' ? 'Logam Digital' : 'Logam Academy';
        const correctOrg = record.correctTenantId === 'logam-digital-001' ? 'Logam Digital' : 'Logam Academy';

        console.log(`  ❌ ${record.username}`);
        console.log(`     Record ID: ${record.id}`);
        console.log(`     Date: ${record.date.toDateString()}`);
        console.log(`     Current TenantId: ${wrongOrg}`);
        console.log(`     Should be: ${correctOrg}`);
        console.log('');
      });

      console.log('═'.repeat(80));
      console.log('\n⚠️  These records need to be fixed!\n');
    }

    // Also check for users in attendance who don't exist in users table
    console.log('\n📊 Checking for orphaned attendance records...\n');
    console.log('═'.repeat(80));

    const attendanceUsernames = new Set();
    allAttendance.forEach(doc => {
      attendanceUsernames.add(doc.data().username);
    });

    const orphanedUsers = [];
    attendanceUsernames.forEach(username => {
      if (!userTenantMap[username]) {
        orphanedUsers.push(username);
      }
    });

    if (orphanedUsers.length > 0) {
      console.log(`⚠️  Found ${orphanedUsers.length} users with attendance but no user account:\n`);
      orphanedUsers.forEach(username => {
        console.log(`  - ${username}`);
      });
    } else {
      console.log('✅ No orphaned attendance records\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

findWrongTenants();
