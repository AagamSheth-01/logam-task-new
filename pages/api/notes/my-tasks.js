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

  try {
    // Fetch all notes assigned to this user across all clients
    const snapshot = await adminDb
      .collection('client_notes')
      .where('tenantId', '==', tenantId)
      .where('pocName', '==', user.username)
      .get();

    const notes = [];
    snapshot.forEach(doc => {
      notes.push({ id: doc.id, ...doc.data() });
    });

    // Sort by: overdue first, then by status (Pending > Follow-up > Done), then by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    notes.sort((a, b) => {
      // Overdue items first
      const aOverdue = a.nextFollowUp && a.status !== 'Done' && new Date(a.nextFollowUp) < today;
      const bOverdue = b.nextFollowUp && b.status !== 'Done' && new Date(b.nextFollowUp) < today;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by status priority
      const statusOrder = { 'Pending': 0, 'Follow-up': 1, 'Done': 2 };
      const aDone = (statusOrder[a.status] ?? 1);
      const bDone = (statusOrder[b.status] ?? 1);
      if (aDone !== bDone) return aDone - bDone;

      // Then by date (newest first)
      const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    // Fetch client names for each unique clientId
    const clientIds = [...new Set(notes.map(n => n.clientId))];
    const clientNames = {};
    for (const cid of clientIds) {
      if (cid.startsWith('default_')) {
        clientNames[cid] = cid.replace('default_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      } else {
        try {
          const clientDoc = await adminDb.collection('clients').doc(cid).get();
          if (clientDoc.exists) {
            clientNames[cid] = clientDoc.data().name || cid;
          } else {
            clientNames[cid] = cid;
          }
        } catch {
          clientNames[cid] = cid;
        }
      }
    }

    // Attach client name to each note
    const enrichedNotes = notes.map(n => ({
      ...n,
      clientName: clientNames[n.clientId] || n.clientId
    }));

    // Compute stats
    const pending = notes.filter(n => n.status === 'Pending').length;
    const followUp = notes.filter(n => n.status === 'Follow-up').length;
    const done = notes.filter(n => n.status === 'Done').length;
    const overdue = notes.filter(n => {
      if (n.status === 'Done' || !n.nextFollowUp) return false;
      const fd = new Date(n.nextFollowUp);
      fd.setHours(0, 0, 0, 0);
      return fd < today;
    }).length;

    res.status(200).json({
      success: true,
      notes: enrichedNotes,
      stats: { total: notes.length, pending, followUp, done, overdue },
      total: notes.length
    });
  } catch (error) {
    console.error('My tasks API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}
