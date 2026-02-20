import { verifyTokenFromRequest } from '../../../lib/auth';
import { adminDb } from '../../../lib/firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: authResult.message || 'Unauthorized' });
  }

  const { user } = authResult;
  const tenantId = user.tenantId;
  const { status } = req.query;

  try {
    // Query by pocName only (single-field index, no composite index needed)
    const snapshot = await adminDb
      .collection('client_notes')
      .where('pocName', '==', user.username)
      .get();

    const notes = [];
    const clientIds = new Set();

    snapshot.forEach(doc => {
      const data = doc.data();
      // Filter by tenantId in memory to avoid composite index requirement
      if (tenantId && data.tenantId && data.tenantId !== tenantId) return;
      // Filter by status in memory if requested
      if (status && status !== 'all' && data.status !== status) return;

      notes.push({ id: doc.id, ...data });
      if (data.clientId) clientIds.add(data.clientId);
    });

    // Batch-fetch client names
    const clientNameMap = {};
    const clientIdArray = Array.from(clientIds);
    // Firestore 'in' queries support max 30 items per batch
    for (let i = 0; i < clientIdArray.length; i += 30) {
      const batch = clientIdArray.slice(i, i + 30);
      const clientsSnapshot = await adminDb
        .collection('clients')
        .where('__name__', 'in', batch)
        .get();
      clientsSnapshot.forEach(doc => {
        clientNameMap[doc.id] = doc.data().name || doc.id;
      });
    }

    // Attach client names and sort by createdAt descending
    const enrichedNotes = notes.map(note => ({
      ...note,
      clientName: clientNameMap[note.clientId] || note.clientId
    }));

    enrichedNotes.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime - aTime;
    });

    res.status(200).json({
      success: true,
      notes: enrichedNotes,
      total: enrichedNotes.length
    });
  } catch (error) {
    console.error('Assigned notes API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}
