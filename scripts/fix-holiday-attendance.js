/**
 * Script to check and fix attendance records for past holidays
 * Ensures all users are marked as present (not absent) on holidays
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

// List of known holidays and Sundays that should be marked as present
const KNOWN_HOLIDAYS = [
  // Add known holidays here
  { date: '2024-08-15', name: 'Independence Day' },
  { date: '2024-10-02', name: 'Gandhi Jayanti' },
  { date: '2024-12-25', name: 'Christmas' },
  { date: '2025-01-26', name: 'Republic Day' },
  // Add more holidays as needed
];

async function getAllTenants() {
  console.log('🔍 Finding all tenants...\n');
  const usersSnapshot = await db.collection('users').get();
  const tenants = new Set();

  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    if (userData.tenantId) {
      tenants.add(userData.tenantId);
    }
  });

  return Array.from(tenants);
}

async function getAllUsers() {
  console.log('👥 Getting all users...\n');
  const usersSnapshot = await db.collection('users').get();
  const users = [];

  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    users.push({
      username: userData.username,
      tenantId: userData.tenantId,
      displayName: userData.displayName || userData.username,
      role: userData.role || 'user'
    });
  });

  return users;
}

async function getSundaysInDateRange(startDate, endDate) {
  const sundays = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    if (current.getDay() === 0) { // 0 = Sunday
      sundays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return sundays;
}

async function checkHolidayAttendance() {
  console.log('🏖️  CHECKING HOLIDAY ATTENDANCE RECORDS');
  console.log('═'.repeat(80));

  try {
    // Get all users and tenants
    const users = await getAllUsers();
    console.log(`Found ${users.length} users across all tenants\n`);

    // Get date range for checking (last 6 months to present)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const today = new Date();

    console.log(`Checking holiday records from ${sixMonthsAgo.toDateString()} to ${today.toDateString()}\n`);

    // Get all Sundays in the date range
    const sundays = await getSundaysInDateRange(sixMonthsAgo, today);
    console.log(`Found ${sundays.length} Sundays in date range\n`);

    // Combine holidays and Sundays
    const allHolidayDates = [
      ...KNOWN_HOLIDAYS.map(h => ({ date: new Date(h.date), name: h.name, type: 'holiday' })),
      ...sundays.map(s => ({ date: s, name: 'Sunday', type: 'sunday' }))
    ].filter(h => h.date >= sixMonthsAgo && h.date <= today);

    console.log(`Total holiday/Sunday dates to check: ${allHolidayDates.length}\n`);

    let totalIssuesFound = 0;
    let totalIssuesFixed = 0;
    const batch = db.batch();
    let batchOperations = 0;

    // Check each holiday date
    for (const holidayInfo of allHolidayDates) {
      const { date: holidayDate, name: holidayName, type } = holidayInfo;
      const dateStr = holidayDate.toISOString().split('T')[0];

      console.log(`\n📅 Checking ${holidayName} (${dateStr}):`);
      console.log('─'.repeat(50));

      // Get attendance records for this date
      const startOfDay = new Date(holidayDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(holidayDate);
      endOfDay.setHours(23, 59, 59, 999);

      const attendanceSnapshot = await db.collection('attendance')
        .where('date', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('date', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .get();

      // Create a map of existing attendance records
      const existingRecords = new Map();
      attendanceSnapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.username}-${data.tenantId}`;
        existingRecords.set(key, { id: doc.id, data, ref: doc.ref });
      });

      // Check each user for this holiday
      let dateIssuesFound = 0;
      let dateIssuesFixed = 0;

      for (const user of users) {
        const userKey = `${user.username}-${user.tenantId}`;
        const existingRecord = existingRecords.get(userKey);

        if (!existingRecord) {
          // No record exists - create present record for holiday
          const newRecord = {
            username: user.username,
            tenantId: user.tenantId,
            date: admin.firestore.Timestamp.fromDate(holidayDate),
            status: 'present',
            clockIn: '09:00',
            clockOut: '17:00',
            workMode: 'office',
            location: 'office',
            totalHours: '8:00',
            notes: `${type === 'sunday' ? 'Sunday' : 'Holiday'} - Auto marked present`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          const docRef = db.collection('attendance').doc();
          batch.set(docRef, newRecord);
          batchOperations++;

          console.log(`  ➕ ${user.displayName}: Created present record`);
          dateIssuesFound++;
          dateIssuesFixed++;

        } else if (existingRecord.data.status === 'absent') {
          // Record exists but marked as absent - fix it
          batch.update(existingRecord.ref, {
            status: 'present',
            clockIn: existingRecord.data.clockIn || '09:00',
            clockOut: existingRecord.data.clockOut || '17:00',
            workMode: existingRecord.data.workMode || 'office',
            location: existingRecord.data.location || 'office',
            totalHours: existingRecord.data.totalHours || '8:00',
            notes: existingRecord.data.notes || `${type === 'sunday' ? 'Sunday' : 'Holiday'} - Fixed from absent to present`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          batchOperations++;

          console.log(`  🔧 ${user.displayName}: Fixed absent → present`);
          dateIssuesFound++;
          dateIssuesFixed++;

        } else if (existingRecord.data.status === 'present') {
          // Already marked present - no action needed
          console.log(`  ✅ ${user.displayName}: Already present`);
        } else {
          // Some other status - log it
          console.log(`  ⚠️  ${user.displayName}: Status "${existingRecord.data.status}" (left as-is)`);
        }

        // Commit batch if it gets too large
        if (batchOperations >= 450) { // Keep well under Firestore's 500 limit
          console.log(`\n💾 Committing batch (${batchOperations} operations)...`);
          await batch.commit();
          batchOperations = 0;
        }
      }

      totalIssuesFound += dateIssuesFound;
      totalIssuesFixed += dateIssuesFixed;

      if (dateIssuesFound === 0) {
        console.log('  ✅ No issues found for this date');
      } else {
        console.log(`  📊 Issues found: ${dateIssuesFound}, Fixed: ${dateIssuesFixed}`);
      }
    }

    // Commit any remaining operations
    if (batchOperations > 0) {
      console.log(`\n💾 Committing final batch (${batchOperations} operations)...`);
      await batch.commit();
    }

    // Final summary
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total users checked: ${users.length}`);
    console.log(`Total holiday/Sunday dates checked: ${allHolidayDates.length}`);
    console.log(`Total attendance issues found: ${totalIssuesFound}`);
    console.log(`Total issues fixed: ${totalIssuesFixed}`);
    console.log('═'.repeat(80));

    if (totalIssuesFixed > 0) {
      console.log('✅ Holiday attendance records have been fixed!');
      console.log('All users are now properly marked as present on holidays and Sundays.');
    } else {
      console.log('✅ No issues found! All holiday attendance records are correct.');
    }

  } catch (error) {
    console.error('❌ Error checking holiday attendance:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Additional function to check specific date range
async function checkSpecificDateRange(startDate, endDate) {
  console.log(`\n🔍 CHECKING SPECIFIC DATE RANGE: ${startDate} to ${endDate}`);
  console.log('═'.repeat(80));

  const start = new Date(startDate);
  const end = new Date(endDate);
  const sundays = await getSundaysInDateRange(start, end);

  console.log(`Found ${sundays.length} Sundays in specified range:`);
  sundays.forEach(sunday => {
    console.log(`  📅 ${sunday.toDateString()}`);
  });

  // Add logic here if you want to check specific date ranges
}

// Run the main check
console.log('🚀 Starting Holiday Attendance Check & Fix Script\n');
checkHolidayAttendance();