/**
 * Script to manually mark attendance for a user
 * Run with: node scripts/mark-attendance.js
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

async function markAttendance() {
  // Configuration
  const config = {
    username: 'Ayaz Memon',           // Username
    tenantId: 'logam-digital-001',    // Organization ID
    clockInTime: '11:35',             // Clock-in time (HH:MM)
    workMode: 'office',               // 'office' or 'wfh'
    date: new Date(),                 // Today's date
  };

  console.log('📅 Marking Attendance...\n');
  console.log('Configuration:');
  console.log(`  User: ${config.username}`);
  console.log(`  Organization: ${config.tenantId}`);
  console.log(`  Date: ${config.date.toDateString()}`);
  console.log(`  Clock In: ${config.clockInTime}`);
  console.log(`  Work Mode: ${config.workMode}\n`);

  try {
    // 1. Check if user exists
    console.log('1️⃣ Checking user...');
    const userSnapshot = await db.collection('users')
      .where('username', '==', config.username)
      .where('tenantId', '==', config.tenantId)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      console.error(`❌ User "${config.username}" not found in organization ${config.tenantId}`);
      process.exit(1);
    }

    const userDoc = userSnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };
    console.log(`✅ User found: ${user.username} (${user.email})\n`);

    // 2. Check if attendance already exists for today
    console.log('2️⃣ Checking for existing attendance...');

    // Get all attendance for this user in this tenant
    const attendanceSnapshot = await db.collection('attendance')
      .where('username', '==', config.username)
      .where('tenantId', '==', config.tenantId)
      .get();

    // Get start and end of today
    const startOfDay = new Date(config.date);
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.getTime();

    const endOfDay = new Date(config.date);
    endOfDay.setHours(23, 59, 59, 999);
    const endTimestamp = endOfDay.getTime();

    // Filter in code for today's attendance
    let todayAttendance = null;
    let todayAttendanceId = null;

    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      const recordDate = data.date?.toDate?.() || new Date(data.date);
      const recordTimestamp = recordDate.getTime();

      if (recordTimestamp >= startTimestamp && recordTimestamp <= endTimestamp) {
        todayAttendance = data;
        todayAttendanceId = doc.id;
      }
    });

    if (todayAttendance) {
      console.log('⚠️  Attendance already exists for today');
      console.log(`   Clock In: ${todayAttendance.clockIn}`);
      console.log(`   Clock Out: ${todayAttendance.clockOut || 'Not clocked out'}`);
      console.log(`   Work Mode: ${todayAttendance.workMode}`);

      const updateExisting = true; // Change to false if you don't want to update

      if (updateExisting) {
        console.log('\n3️⃣ Updating existing attendance...');
        await db.collection('attendance').doc(todayAttendanceId).update({
          clockIn: config.clockInTime,
          workMode: config.workMode,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Attendance updated\n');
      } else {
        console.log('\nSkipping update. Set updateExisting = true to update.\n');
        process.exit(0);
      }
    } else {
      console.log('✅ No existing attendance for today\n');

      // 3. Create attendance record
      console.log('3️⃣ Creating attendance record...');

      const attendanceData = {
        username: config.username,
        tenantId: config.tenantId,
        date: admin.firestore.Timestamp.fromDate(config.date),
        clockIn: config.clockInTime,
        clockOut: null,
        workMode: config.workMode,
        status: 'present',
        totalHours: null,
        notes: 'Marked via script',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const attendanceDoc = await db.collection('attendance').add(attendanceData);
      console.log(`✅ Attendance record created with ID: ${attendanceDoc.id}\n`);
    }

    // 4. Success summary
    console.log('═'.repeat(60));
    console.log('✅ ✅ ✅ ATTENDANCE MARKED SUCCESSFULLY! ✅ ✅ ✅');
    console.log('═'.repeat(60));
    console.log('\n📝 Attendance Details:');
    console.log(`   User: ${config.username}`);
    console.log(`   Organization: ${config.tenantId}`);
    console.log(`   Date: ${config.date.toDateString()}`);
    console.log(`   Clock In: ${config.clockInTime}`);
    console.log(`   Work Mode: ${config.workMode}`);
    console.log(`   Status: Present`);
    console.log('\n🔗 View at: http://localhost:3000/admin (Attendance tab)');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error marking attendance:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
markAttendance();
