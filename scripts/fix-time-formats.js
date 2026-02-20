import { adminDb } from '../lib/firebase-admin.js';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = adminDb;

// Function to convert time with seconds to HH:MM format
function normalizeTime(timeStr) {
  if (!timeStr || timeStr === 'N/A') return timeStr;

  // If it already has seconds (HH:MM:SS), extract just HH:MM
  if (timeStr.includes(':') && timeStr.split(':').length === 3) {
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  }

  // If it's already HH:MM format, return as-is
  return timeStr;
}

async function fixTimeFormats() {
  try {
    const username = 'Ayaz Memon';
    const tenantId = 'logam-digital-001';

    console.log('🕒 FIXING TIME FORMAT INCONSISTENCIES\n');

    // Get all November records
    const snapshot = await adminDb.collection('attendance')
      .where('username', '==', username)
      .where('tenantId', '==', tenantId)
      .get();

    const recordsToUpdate = [];

    snapshot.forEach(doc => {
      const data = doc.data();

      // Only process November records
      if (data.date && data.date >= '2025-11-01' && data.date <= '2025-11-22') {
        let needsUpdate = false;
        const updates = {};

        // Normalize clockIn
        if (data.clockIn) {
          const normalizedClockIn = normalizeTime(data.clockIn);
          if (normalizedClockIn !== data.clockIn) {
            updates.clockIn = normalizedClockIn;
            needsUpdate = true;
            console.log(`📝 ${data.date}: clockIn "${data.clockIn}" → "${normalizedClockIn}"`);
          }
        }

        // Normalize clockOut
        if (data.clockOut) {
          const normalizedClockOut = normalizeTime(data.clockOut);
          if (normalizedClockOut !== data.clockOut) {
            updates.clockOut = normalizedClockOut;
            needsUpdate = true;
            console.log(`📝 ${data.date}: clockOut "${data.clockOut}" → "${normalizedClockOut}"`);
          }
        }

        // Also ensure checkIn/checkOut fields match clockIn/clockOut
        if (data.clockIn && (!data.checkIn || data.checkIn !== data.clockIn)) {
          updates.checkIn = normalizeTime(data.clockIn);
          needsUpdate = true;
          console.log(`📝 ${data.date}: checkIn updated to match clockIn "${updates.checkIn}"`);
        }

        if (data.clockOut && (!data.checkOut || data.checkOut !== data.clockOut)) {
          updates.checkOut = normalizeTime(data.clockOut);
          needsUpdate = true;
          console.log(`📝 ${data.date}: checkOut updated to match clockOut "${updates.checkOut}"`);
        }

        // Ensure workMode matches workType
        if (data.workType && data.workMode !== data.workType.toLowerCase()) {
          updates.workMode = data.workType.toLowerCase();
          needsUpdate = true;
          console.log(`📝 ${data.date}: workMode "${data.workMode}" → "${updates.workMode}"`);
        }

        if (needsUpdate) {
          recordsToUpdate.push({
            id: doc.id,
            date: data.date,
            updates: updates
          });
        }
      }
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`- Records needing time format updates: ${recordsToUpdate.length}`);

    if (recordsToUpdate.length > 0) {
      console.log('\n🔄 Updating time formats...');

      const batch = db.batch();

      recordsToUpdate.forEach(record => {
        const docRef = db.collection('attendance').doc(record.id);
        batch.update(docRef, {
          ...record.updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`✅ Successfully updated ${recordsToUpdate.length} records`);
    } else {
      console.log('✅ All time formats are already consistent');
    }

    return {
      updatedRecords: recordsToUpdate.length
    };

  } catch (error) {
    console.error('❌ Error fixing time formats:', error);
    throw error;
  }
}

// Run the script
fixTimeFormats()
  .then((result) => {
    console.log('\n🎉 Time format fix completed!');
    console.log(`📊 ${result.updatedRecords} records updated`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });