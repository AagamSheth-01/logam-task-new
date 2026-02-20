// Script to populate clients collection from existing tasks
const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function populateClientsFromTasks() {
  try {
    console.log('🔍 Analyzing existing tasks to extract client information...');
    
    // Get all tasks
    const tasksSnapshot = await db.collection('tasks').get();
    const tasks = [];
    
    tasksSnapshot.forEach(doc => {
      const taskData = doc.data();
      tasks.push({
        id: doc.id,
        ...taskData
      });
    });
    
    console.log(`📊 Found ${tasks.length} total tasks`);
    
    // Extract unique client names
    const clientMap = new Map();
    
    tasks.forEach(task => {
      if (task.client_name && task.client_name.trim()) {
        const clientName = task.client_name.trim();
        if (!clientMap.has(clientName)) {
          clientMap.set(clientName, {
            name: clientName,
            tasks: []
          });
        }
        clientMap.get(clientName).tasks.push(task);
      }
    });
    
    console.log(`🏢 Found ${clientMap.size} unique clients`);
    
    // Check existing clients
    const existingClientsSnapshot = await db.collection('clients').get();
    const existingClientNames = new Set();
    
    existingClientsSnapshot.forEach(doc => {
      const clientData = doc.data();
      if (clientData.name) {
        existingClientNames.add(clientData.name);
      }
    });
    
    console.log(`📋 Found ${existingClientNames.size} existing clients in database`);
    
    // Create new clients
    const batch = db.batch();
    let newClientsCount = 0;
    
    for (const [clientName, clientInfo] of clientMap) {
      if (!existingClientNames.has(clientName)) {
        console.log(`➕ Creating client: ${clientName}`);
        
        // Calculate task statistics
        const totalTasks = clientInfo.tasks.length;
        const completedTasks = clientInfo.tasks.filter(t => t.status === 'done').length;
        const pendingTasks = clientInfo.tasks.filter(t => t.status === 'pending').length;
        const overdueTasks = clientInfo.tasks.filter(t => {
          if (t.status === 'pending' && t.deadline) {
            return new Date(t.deadline) < new Date();
          }
          return false;
        }).length;
        
        // Determine priority based on task urgency
        let priority = 'Medium';
        if (overdueTasks > 0) {
          priority = 'High';
        } else if (pendingTasks > 5) {
          priority = 'High';
        } else if (pendingTasks === 0) {
          priority = 'Low';
        }
        
        // Determine status based on recent activity
        const recentTasks = clientInfo.tasks.filter(t => {
          if (t.createdAt && t.createdAt.seconds) {
            const taskDate = new Date(t.createdAt.seconds * 1000);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return taskDate > thirtyDaysAgo;
          }
          return false;
        });
        
        const status = recentTasks.length > 0 ? 'Active' : 'Inactive';
        
        // Create client document
        const clientDoc = db.collection('clients').doc();
        const clientData = {
          name: clientName,
          email: '', // Will be updated manually
          phone: '',
          website: '',
          address: '',
          industry: '',
          status: status,
          priority: priority,
          description: `Auto-generated client from existing tasks. Has ${totalTasks} tasks assigned.`,
          contractValue: '',
          contractStart: '',
          contractEnd: '',
          timezone: '',
          preferredContact: 'email',
          tags: [],
          notes: `Generated from ${totalTasks} existing tasks. Please update contact information.`,
          assignedUsers: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'system_migration',
          // Add task statistics
          totalTasks: totalTasks,
          completedTasks: completedTasks,
          pendingTasks: pendingTasks,
          overdueTasks: overdueTasks,
          lastTaskDate: Math.max(...clientInfo.tasks.map(t => 
            t.createdAt && t.createdAt.seconds ? t.createdAt.seconds * 1000 : 0
          ))
        };
        
        batch.set(clientDoc, clientData);
        newClientsCount++;
        
        console.log(`  📈 Stats: ${totalTasks} total, ${completedTasks} completed, ${pendingTasks} pending, ${overdueTasks} overdue`);
        console.log(`  🎯 Priority: ${priority}, Status: ${status}`);
      } else {
        console.log(`⏭️  Skipping existing client: ${clientName}`);
      }
    }
    
    if (newClientsCount > 0) {
      console.log(`\n💾 Saving ${newClientsCount} new clients to database...`);
      await batch.commit();
      console.log('✅ Successfully populated clients from tasks!');
    } else {
      console.log('✅ No new clients to create - all clients already exist');
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`  • Total tasks analyzed: ${tasks.length}`);
    console.log(`  • Unique clients found: ${clientMap.size}`);
    console.log(`  • Existing clients: ${existingClientNames.size}`);
    console.log(`  • New clients created: ${newClientsCount}`);
    
  } catch (error) {
    console.error('❌ Error populating clients:', error);
    throw error;
  }
}

// Run the migration
populateClientsFromTasks()
  .then(() => {
    console.log('\n🎉 Client population completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Client population failed:', error);
    process.exit(1);
  });