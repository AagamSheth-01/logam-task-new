/**
 * Script to update attendance records with check-out times and location
 * Updates Nov 8-14 records with random check-out times and location "anand"
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

// Helper function to generate random check-out time between 18:00 and 20:30
function getRandomCheckOutTime() {
  const hour = Math.random() < 0.7 ? 18 : 19; // 70% chance of 18:xx, 30% chance of 19:xx
  const minutes = Math.floor(Math.random() * 60);
  return `${hour}:${minutes.toString().padStart(2, '0')}`;
}

// Helper function to calculate total hours
function calculateTotalHours(clockIn, clockOut) {
  const [inHour, inMin] = clockIn.split(':').map(Number);
  const [outHour, outMin] = clockOut.split(':').map(Number);

  const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

async function updateAttendanceCheckout() {
  const username = 'Ayaz Memon';
  const tenantId = 'logam-digital-001';
  const year = 2025;
  const month = 10; // November (0-indexed)

  console.log('📅 UPDATING ATTENDANCE RECORDS\n');
  console.log('═'.repeat(80));
  console.log(`User: ${username}`);
  console.log(`Organization: ${tenantId}`);
  console.log(`Period: Nov 8-14, 2025`);
  console.log(`Location: anand\n`);
  console.log('═'.repeat(80));

  try {
    // Get all attendance records for Ayaz Memon
    const snapshot = await db.collection('attendance')
      .where('username', '==', username)
      .where('tenantId', '==', tenantId)
      .get();

    console.log(`\nTotal attendance records found: ${snapshot.size}\n`);

    const batch = db.batch();
    let updatedCount = 0;

    // Process records for Nov 8-14
    for (let day = 8; day <= 14; day++) {
      const targetDate = new Date(year, month, day);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const startTimestamp = startOfDay.getTime();

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      const endTimestamp = endOfDay.getTime();

      // Find record for this day
      let recordRef = null;
      let recordData = null;

      snapshot.forEach(doc => {
        const data = doc.data();
        const recordDate = data.date?.toDate?.() || new Date(data.date);
        const recordTimestamp = recordDate.getTime();

        if (recordTimestamp >= startTimestamp && recordTimestamp <= endTimestamp) {
          recordRef = doc.ref;
          recordData = data;
        }
      });

      if (recordRef && recordData) {
        const randomCheckOut = getRandomCheckOutTime();
        const totalHours = calculateTotalHours(recordData.clockIn, randomCheckOut);

        batch.update(recordRef, {
          clockOut: randomCheckOut,
          totalHours: totalHours,
          location: 'anand',
          workMode: 'office',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`  ✅ Nov ${day}: ${recordData.clockIn} - ${randomCheckOut} (${totalHours} hrs) @ anand`);
        updatedCount++;
      } else {
        console.log(`  ⚠️  Nov ${day}: No record found`);
      }
    }

    // Commit batch
    if (updatedCount > 0) {
      console.log('\n💾 Saving to database...');
      await batch.commit();
      console.log('✅ All records updated!\n');
    }

    // Summary
    console.log('═'.repeat(80));
    console.log('📊 UPDATE SUMMARY');
    console.log('═'.repeat(80));
    console.log(`User: ${username}`);
    console.log(`Organization: ${tenantId}`);
    console.log(`Records updated: ${updatedCount}`);
    console.log(`Location added: anand`);
    console.log(`Work mode: office`);
    console.log(`Check-out times: Random between 18:00-19:59`);
    console.log('═'.repeat(80));
    console.log('\n✅ Attendance records updated successfully!');
    console.log('🔗 View at: http://localhost:3000/admin (Attendance tab)\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateAttendanceCheckout();
