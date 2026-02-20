/**
 * Script to bulk create attendance records for Ayaz Memon
 * Nov 1-9: 10:00 to 18:00
 * Nov 10-15: Random between 11:15 to 11:30
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
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
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// Helper function to generate random time between 11:15 and 11:30
function getRandomTime() {
  const minutes = Math.floor(Math.random() * 16) + 15; // 15-30
  return `11:${minutes.toString().padStart(2, '0')}`;
}

async function bulkMarkAttendance() {
  const username = 'Ayaz Memon';
  const tenantId = 'logam-digital-001';
  const year = 2025;
  const month = 10; // November (0-indexed, so 10 = November)

  console.log('📅 BULK MARKING ATTENDANCE FOR AYAZ MEMON\n');
  console.log('═'.repeat(80));

  try {
    const batch = db.batch();
    const recordsToCreate = [];

    // November 1-9: 10:00 to 18:00
    console.log('\n📊 Creating records for Nov 1-9 (10:00 to 18:00)...\n');
    for (let day = 1; day <= 9; day++) {
      const date = new Date(year, month, day);

      const record = {
        username: username,
        tenantId: tenantId,
        date: admin.firestore.Timestamp.fromDate(date),
        clockIn: '10:00',
        clockOut: '18:00',
        workMode: 'office',
        status: 'present',
        totalHours: '8:00',
        notes: 'Bulk created',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = db.collection('attendance').doc();
      batch.set(docRef, record);
      recordsToCreate.push({ day, clockIn: '10:00', clockOut: '18:00' });

      console.log(`  ✅ Nov ${day}: 10:00 - 18:00`);
    }

    // November 10-15: Random between 11:15 and 11:30
    console.log('\n📊 Creating records for Nov 10-15 (Random 11:15-11:30)...\n');
    for (let day = 10; day <= 15; day++) {
      const date = new Date(year, month, day);
      const randomClockIn = getRandomTime();

      const record = {
        username: username,
        tenantId: tenantId,
        date: admin.firestore.Timestamp.fromDate(date),
        clockIn: randomClockIn,
        clockOut: null,
        workMode: 'office',
        status: 'present',
        totalHours: null,
        notes: 'Bulk created',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = db.collection('attendance').doc();
      batch.set(docRef, record);
      recordsToCreate.push({ day, clockIn: randomClockIn, clockOut: 'Not clocked out' });

      console.log(`  ✅ Nov ${day}: ${randomClockIn} - Not clocked out`);
    }

    // Commit batch
    console.log('\n💾 Saving to database...');
    await batch.commit();
    console.log('✅ All records saved!\n');

    // Summary
    console.log('═'.repeat(80));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`User: ${username}`);
    console.log(`Organization: ${tenantId}`);
    console.log(`Total records created: ${recordsToCreate.length}`);
    console.log(`  - Nov 1-9: 9 records (10:00 - 18:00)`);
    console.log(`  - Nov 10-15: 6 records (Random 11:15-11:30)`);
    console.log('═'.repeat(80));
    console.log('\n✅ Attendance records created successfully!');
    console.log('🔗 View at: http://localhost:3000/admin (Attendance tab)\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

bulkMarkAttendance();
