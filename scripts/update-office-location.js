import { adminDb } from '../lib/firebase-admin.js';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = adminDb;

async function updateOfficeLocation() {
  try {
    const username = 'Ayaz Memon';
    const tenantId = 'logam-digital-001';

    console.log('🏢 UPDATING ALL NOVEMBER RECORDS TO OFFICE AT ANAND VIDHYANAGAR\n');

    // Get all November 2025 records
    const snapshot = await db.collection('attendance')
      .where('username', '==', username)
      .where('tenantId', '==', tenantId)
      .get();

    const novemberRecords = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const dateStr = data.date;

      if (dateStr && dateStr >= '2025-11-01' && dateStr <= '2025-11-22') {
        novemberRecords.push({
          id: doc.id,
          date: dateStr,
          currentLocation: data.location,
          currentWorkType: data.workType,
          status: data.status
        });
      }
    });

    novemberRecords.sort((a, b) => a.date.localeCompare(b.date));
    console.log(`Found ${novemberRecords.length} November records to update`);

    if (novemberRecords.length === 0) {
      console.log('❌ No November records found');
      return;
    }

    console.log('\n📋 CURRENT RECORDS:');
    novemberRecords.forEach(record => {
      console.log(`  ${record.date}: ${record.status} | Location: ${record.currentLocation || 'N/A'} | WorkType: ${record.currentWorkType || 'N/A'}`);
    });

    console.log('\n🔄 Updating all records...');

    // Update all records in batch
    const batch = db.batch();

    novemberRecords.forEach(record => {
      const docRef = db.collection('attendance').doc(record.id);
      batch.update(docRef, {
        status: 'present',
        location: 'Anand Vidhyanagar',
        workType: 'Office',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    console.log(`✅ Successfully updated ${novemberRecords.length} November records`);

    console.log('\n📋 UPDATED RECORDS:');
    novemberRecords.forEach(record => {
      console.log(`  ${record.date}: present | Location: Anand Vidhyanagar | WorkType: Office`);
    });

    console.log('\n🎯 ALL NOVEMBER RECORDS NOW SHOW:');
    console.log('  ✅ Status: Present');
    console.log('  ✅ Work Type: Office');
    console.log('  ✅ Location: Anand Vidhyanagar');

    return {
      recordsUpdated: novemberRecords.length
    };

  } catch (error) {
    console.error('❌ Error updating office location:', error);
    throw error;
  }
}

// Run the script
updateOfficeLocation()
  .then((result) => {
    console.log('\n🎉 Office location update completed!');
    console.log(`📊 ${result.recordsUpdated} records updated to Office at Anand Vidhyanagar`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });