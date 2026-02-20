/**
 * Script to clean up broken attendance records
 * Run with: node scripts/cleanup-broken-attendance.js
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

async function cleanupBrokenAttendance() {
  console.log('🗑️  CLEANING UP BROKEN ATTENDANCE RECORDS\n');
  console.log('═'.repeat(80));

  try {
    // Get all attendance records for Ayaz Memon
    const snapshot = await db.collection('attendance')
      .where('username', '==', 'Ayaz Memon')
      .where('tenantId', '==', 'logam-digital-001')
      .get();

    console.log(`Total records found: ${snapshot.size}\n`);

    let deleted = 0;
    let kept = 0;

    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data();

      // Delete if date or clockIn is missing/undefined
      if (!data.date || !data.clockIn) {
        console.log(`🗑️  Deleting broken record: ${doc.id}`);
        batch.delete(doc.ref);
        deleted++;
      } else {
        const recordDate = data.date?.toDate?.() || new Date(data.date);
        console.log(`✅ Keeping valid record: ${doc.id} - ${recordDate.toDateString()} - ${data.clockIn}`);
        kept++;
      }
    });

    // Commit the batch delete
    if (deleted > 0) {
      await batch.commit();
      console.log(`\n✅ Deleted ${deleted} broken records`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📊 CLEANUP SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total records processed: ${snapshot.size}`);
    console.log(`Deleted broken records: ${deleted}`);
    console.log(`Kept valid records: ${kept}`);
    console.log('═'.repeat(80));

    if (kept > 0) {
      console.log('\n✅ Attendance records are now clean!');
      console.log('   You should now be able to see attendance in the admin panel.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupBrokenAttendance();
