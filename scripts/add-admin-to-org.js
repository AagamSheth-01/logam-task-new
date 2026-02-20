/**
 * Script to add a new admin user to an existing organization
 * Run with: node scripts/add-admin-to-org.js
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

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

async function addAdminToOrg() {
  // Configuration - CHANGE THESE VALUES
  const config = {
    organizationId: 'logam-digital-001',  // The organization ID
    username: 'testadmin',                 // New username
    email: 'testadmin@logamdigital.com',  // New email
    password: 'Admin123!',                 // New password
    fullName: 'Test Admin',                // Full name
  };

  console.log('👤 Adding new admin user to organization...\n');
  console.log('Configuration:');
  console.log(`  Organization ID: ${config.organizationId}`);
  console.log(`  Username: ${config.username}`);
  console.log(`  Email: ${config.email}`);
  console.log(`  Password: ${config.password}`);
  console.log(`  Full Name: ${config.fullName}\n`);

  try {
    // 1. Check if organization exists
    console.log('1️⃣ Checking organization...');
    const orgDoc = await db.collection('organizations').doc(config.organizationId).get();

    if (!orgDoc.exists) {
      console.error(`❌ Organization ${config.organizationId} does not exist!`);
      process.exit(1);
    }

    const org = orgDoc.data();
    console.log(`✅ Organization found: ${org.name}\n`);

    // 2. Check if username already exists
    console.log('2️⃣ Checking for duplicate username...');
    const usernameCheck = await db.collection('users')
      .where('username', '==', config.username)
      .limit(1)
      .get();

    if (!usernameCheck.empty) {
      console.error(`❌ Username "${config.username}" already exists!`);
      console.log('   Please choose a different username.');
      process.exit(1);
    }
    console.log('✅ Username is available\n');

    // 3. Check if email already exists
    console.log('3️⃣ Checking for duplicate email...');
    const emailCheck = await db.collection('users')
      .where('email', '==', config.email.toLowerCase())
      .limit(1)
      .get();

    if (!emailCheck.empty) {
      console.error(`❌ Email "${config.email}" already exists!`);
      console.log('   Please choose a different email.');
      process.exit(1);
    }
    console.log('✅ Email is available\n');

    // 4. Hash password
    console.log('4️⃣ Hashing password...');
    const hashedPassword = await bcrypt.hash(config.password, 10);
    console.log('✅ Password hashed\n');

    // 5. Create user document
    console.log('5️⃣ Creating user...');
    const userDoc = await db.collection('users').add({
      tenantId: config.organizationId,
      username: config.username,
      email: config.email.toLowerCase(),
      fullName: config.fullName,
      password: hashedPassword,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
      isActive: true,
      profileImage: null,
      phone: null,
      department: null,
      jobTitle: 'Administrator',
    });

    console.log(`✅ User created with ID: ${userDoc.id}\n`);

    // 6. Create activity log
    console.log('6️⃣ Creating activity log...');
    await db.collection('activity_log').add({
      tenantId: config.organizationId,
      action: 'admin_user_created',
      username: config.username,
      userId: userDoc.id,
      details: `Admin user "${config.username}" created via script`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: null,
    });
    console.log('✅ Activity logged\n');

    // 7. Success summary
    console.log('═'.repeat(60));
    console.log('✅ ✅ ✅ ADMIN USER CREATED SUCCESSFULLY! ✅ ✅ ✅');
    console.log('═'.repeat(60));
    console.log('\n📝 Login Credentials:');
    console.log(`   Organization: ${org.name}`);
    console.log(`   Username: ${config.username}`);
    console.log(`   Password: ${config.password}`);
    console.log(`   Email: ${config.email}`);
    console.log(`   Role: admin`);
    console.log('\n🔗 Login at: http://localhost:3000/login');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
addAdminToOrg();
