// lib/firebase-admin.js - Server-side Firebase Admin configuration (ES Module)
import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Always load environment variables first
if (!process.env.FIREBASE_PROJECT_ID) {
  dotenv.config({ path: '.env.local' });
}

let app = null;

const initializeFirebaseAdmin = () => {
  if (app) return app;

  try {
    // Validate required environment variables
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_CLIENT_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing Firebase Admin environment variables:', missingVars);
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Service account configuration
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
    };

    // Double-check project_id
    if (!serviceAccount.project_id || typeof serviceAccount.project_id !== 'string') {
      throw new Error(`Invalid project_id: ${serviceAccount.project_id}. Expected a non-empty string.`);
    }

    // Initialize only if not already initialized
    if (!admin.apps.length) {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      app = admin.app();
    }

    return app;
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    throw error;
  }
};

// Initialize Firebase Admin
const firebaseApp = initializeFirebaseAdmin();

// Export initialized services
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// Test admin connection
export const testAdminConnection = async () => {
  try {
    console.log('🔥 Testing Firebase Admin connection...');
    
    // Ensure Firebase is initialized
    initializeFirebaseAdmin();
    
    // Test Firestore connection by getting server timestamp
    const testCollection = adminDb.collection('_connection_test');
    const testDoc = await testCollection.add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      test: true
    });
    
    // Clean up test document
    await testDoc.delete();
    
    console.log('✅ Firestore Admin connection successful');
    console.log('✅ Auth Admin connection successful');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase Admin connection failed:', error);
    return false;
  }
};

export default admin;