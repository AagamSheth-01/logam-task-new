import { verifyTokenFromRequest } from '../../../../lib/auth';
import { getClientById } from '../../../../lib/firebaseService';
import { adminDb } from '../../../../lib/firebase-admin';
import admin from 'firebase-admin';

export default async function handler(req, res) {
  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: authResult.message || 'Unauthorized' });
  }

  const { user } = authResult;
  const tenantId = user.tenantId;
  const { id: clientId } = req.query;

  if (!clientId) {
    return res.status(400).json({ success: false, message: 'Client ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetPOCs(req, res, clientId, user, tenantId);
        break;
      case 'POST':
        await handleCreatePOC(req, res, clientId, user, tenantId);
        break;
      case 'PUT':
        await handleUpdatePOC(req, res, clientId, user, tenantId);
        break;
      case 'DELETE':
        await handleDeletePOC(req, res, clientId, user, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client POCs API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

async function handleGetPOCs(req, res, clientId, user, tenantId) {
  // Handle default clients (they don't exist in database yet)
  if (clientId.startsWith('default_')) {
    // Return empty POCs for default clients
    return res.status(200).json({
      success: true,
      pocs: [],
      total: 0
    });
  }

  const client = await getClientById(clientId, tenantId);
  if (!client) {
    return res.status(404).json({ success: false, message: 'Client not found' });
  }

  const snapshot = await adminDb
    .collection('client_pocs')
    .where('tenantId', '==', tenantId)
    .where('clientId', '==', clientId)
    .get();

  const pocs = [];
  snapshot.forEach(doc => {
    pocs.push({ id: doc.id, ...doc.data() });
  });

  pocs.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return aTime - bTime;
  });

  res.status(200).json({ success: true, pocs, total: pocs.length });
}

async function handleCreatePOC(req, res, clientId, user, tenantId) {
  // Handle default clients - they're allowed to have POCs
  if (!clientId.startsWith('default_')) {
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
  }

  const { name, phone, email, designation } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'POC name is required' });
  }

  const pocData = {
    tenantId,
    clientId,
    name: name.trim(),
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    designation: designation?.trim() || '',
    createdBy: user.username,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await adminDb.collection('client_pocs').add(pocData);

  res.status(201).json({
    success: true,
    message: 'POC created successfully',
    poc: { id: docRef.id, ...pocData, createdAt: new Date(), updatedAt: new Date() }
  });
}

async function handleUpdatePOC(req, res, clientId, user, tenantId) {
  const { pocId } = req.query;

  if (!pocId) {
    return res.status(400).json({ success: false, message: 'POC ID is required' });
  }

  const docRef = adminDb.collection('client_pocs').doc(pocId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return res.status(404).json({ success: false, message: 'POC not found' });
  }

  const existing = snapshot.data();
  if (existing.tenantId !== tenantId || existing.clientId !== clientId) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const { name, phone, email, designation } = req.body;

  await docRef.update({
    ...(name !== undefined && { name: name.trim() }),
    ...(phone !== undefined && { phone: phone.trim() }),
    ...(email !== undefined && { email: email.trim() }),
    ...(designation !== undefined && { designation: designation.trim() }),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.status(200).json({ success: true, message: 'POC updated successfully' });
}

async function handleDeletePOC(req, res, clientId, user, tenantId) {
  const { pocId } = req.query;

  if (!pocId) {
    return res.status(400).json({ success: false, message: 'POC ID is required' });
  }

  const docRef = adminDb.collection('client_pocs').doc(pocId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return res.status(404).json({ success: false, message: 'POC not found' });
  }

  const existing = snapshot.data();
  if (existing.tenantId !== tenantId || existing.clientId !== clientId) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  if (existing.createdBy !== user.username && user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this POC' });
  }

  await docRef.delete();

  res.status(200).json({ success: true, message: 'POC deleted successfully' });
}
