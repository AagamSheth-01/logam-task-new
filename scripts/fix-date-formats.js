import { adminDb } from '../lib/firebase-admin.js';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = adminDb;

async function fixDateFormats() {
  try {
    const username = 'Ayaz Memon';
    const tenantId = 'logam-digital-001';

    console.log('🔧 FIXING DATE FORMAT INCONSISTENCIES\n');

    // Get all records
    const snapshot = await db.collection('attendance')
      .where('username', '==', username)
      .where('tenantId', '==', tenantId)
      .get();

    console.log(`Found ${snapshot.size} records to check`);

    const recordsToUpdate = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const originalDate = data.date;
      let needsUpdate = false;
      let newDateValue = null;

      if (originalDate) {
        if (typeof originalDate === 'object' && originalDate.toDate) {
          // It's a Firestore Timestamp, convert to YYYY-MM-DD string
          const dateObj = originalDate.toDate();
          newDateValue = dateObj.toISOString().split('T')[0];
          needsUpdate = true;

          console.log(`📅 ${doc.id}: Timestamp "${originalDate.toDate().toISOString()}" → String "${newDateValue}"`);
        } else if (typeof originalDate === 'string') {
          // It's already a string, check if it's in correct format
          if (originalDate.includes(' ') || originalDate.includes('T')) {
            // Clean up datetime strings to just date
            const dateObj = new Date(originalDate);
            newDateValue = dateObj.toISOString().split('T')[0];
            needsUpdate = true;

            console.log(`📅 ${doc.id}: DateTime string "${originalDate}" → Date string "${newDateValue}"`);
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(originalDate)) {
            // Already in correct YYYY-MM-DD format
            console.log(`✅ ${doc.id}: Already correct format "${originalDate}"`);
          } else {
            console.log(`❓ ${doc.id}: Unknown string format "${originalDate}"`);
          }
        } else {
          console.log(`❓ ${doc.id}: Unknown date type: ${typeof originalDate}, value: ${originalDate}`);
        }

        if (needsUpdate && newDateValue) {
          recordsToUpdate.push({
            id: doc.id,
            oldDate: originalDate,
            newDate: newDateValue
          });
        }
      }
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`- Records checked: ${snapshot.size}`);
    console.log(`- Records needing date format update: ${recordsToUpdate.length}`);

    if (recordsToUpdate.length > 0) {
      console.log('\n🔄 Updating date formats...');

      const batch = db.batch();

      recordsToUpdate.forEach(record => {
        const docRef = db.collection('attendance').doc(record.id);
        batch.update(docRef, {
          date: record.newDate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();

      console.log(`✅ Successfully updated ${recordsToUpdate.length} records`);

      // Show updated records
      console.log('\n📋 UPDATED RECORDS:');
      recordsToUpdate.forEach(record => {
        console.log(`  ${record.id}: "${record.oldDate}" → "${record.newDate}"`);
      });
    } else {
      console.log('✅ All date formats are already consistent');
    }

    return {
      totalRecords: snapshot.size,
      updatedRecords: recordsToUpdate.length
    };

  } catch (error) {
    console.error('❌ Error fixing date formats:', error);
    throw error;
  }
}

// Run the script
fixDateFormats()
  .then((result) => {
    console.log('\n🎉 Date format fix completed!');
    console.log(`📊 ${result.totalRecords} total records, ${result.updatedRecords} records updated`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });