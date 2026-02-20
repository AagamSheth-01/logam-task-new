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
        await handleGetNotes(req, res, clientId, user, tenantId);
        break;
      case 'POST':
        await handleCreateNote(req, res, clientId, user, tenantId);
        break;
      case 'PUT':
        await handleUpdateNote(req, res, clientId, user, tenantId);
        break;
      case 'DELETE':
        await handleDeleteNote(req, res, clientId, user, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client notes API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

async function handleGetNotes(req, res, clientId, user, tenantId) {
  // Handle default clients (they don't exist in database yet)
  if (clientId.startsWith('default_')) {
    // Return empty notes for default clients
    return res.status(200).json({
      success: true,
      notes: [],
      clientName: clientId.replace('default_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      total: 0
    });
  }

  const client = await getClientById(clientId, tenantId);
  if (!client) {
    return res.status(404).json({ success: false, message: 'Client not found' });
  }

  const { status, interactionType, startDate, endDate, noteId: historyNoteId } = req.query;

  // If requesting history for a specific note
  if (historyNoteId) {
    const historySnapshot = await adminDb
      .collection('client_notes')
      .doc(historyNoteId)
      .collection('history')
      .orderBy('changedAt', 'desc')
      .get();
    const history = [];
    historySnapshot.forEach(doc => history.push({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ success: true, history });
  }

  let query = adminDb
    .collection('client_notes')
    .where('clientId', '==', clientId);

  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }

  if (interactionType && interactionType !== 'all') {
    query = query.where('interactionType', '==', interactionType);
  }

  const snapshot = await query.get();

  const notes = [];
  snapshot.forEach(doc => {
    const data = doc.data();

    // Date range filter in memory
    if (startDate || endDate) {
      const noteDate = data.createdAt?.toDate?.() || new Date(data.createdAt);
      if (startDate && noteDate < new Date(startDate)) return;
      if (endDate && noteDate > new Date(endDate + 'T23:59:59')) return;
    }

    notes.push({ id: doc.id, ...data });
  });

  // Sort by createdAt descending (most recent first)
  notes.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return bTime - aTime;
  });

  res.status(200).json({
    success: true,
    notes,
    clientName: client.name,
    total: notes.length
  });
}

async function handleCreateNote(req, res, clientId, user, tenantId) {
  // Only admins can create notes
  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only admins can add notes' });
  }

  // Handle default clients - they're allowed to have notes
  let client = null;
  if (clientId.startsWith('default_')) {
    // Default clients are accessible to all users
    client = {
      id: clientId,
      name: clientId.replace('default_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      assignedTo: user.username
    };
  } else {
    client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
  }

  const {
    note,
    interactionType = 'Call',
    pocId = '',
    pocName = '',
    status = 'Done',
    nextFollowUp = '',
    outcome = '',
    blockers = '',
    priority = 'Medium',
    isPinned = false,
    tags = [],
    dueDate = ''
  } = req.body;

  if (!note || !note.trim()) {
    return res.status(400).json({ success: false, message: 'Note text is required' });
  }

  const noteData = {
    tenantId,
    clientId,
    note: note.trim(),
    interactionType,
    pocId,
    pocName,
    status,
    nextFollowUp: nextFollowUp || null,
    dueDate: dueDate || null,
    outcome: outcome?.trim() || '',
    blockers: blockers?.trim() || '',
    priority,
    isPinned: !!isPinned,
    tags: Array.isArray(tags) ? tags : [],
    createdBy: user.username,
    isEdited: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await adminDb.collection('client_notes').add(noteData);

  // Log creation in history
  await docRef.collection('history').add({
    action: 'created',
    changes: [`Note created${pocName ? ` and assigned to ${pocName}` : ''}`],
    changedBy: user.username,
    changedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.status(201).json({
    success: true,
    message: 'Note created successfully',
    note: { id: docRef.id, ...noteData, createdAt: new Date(), updatedAt: new Date() }
  });
}

async function handleUpdateNote(req, res, clientId, user, tenantId) {
  const { noteId } = req.query;

  if (!noteId) {
    return res.status(400).json({ success: false, message: 'Note ID is required' });
  }

  const docRef = adminDb.collection('client_notes').doc(noteId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  const existing = snapshot.data();
  if (existing.tenantId !== tenantId || existing.clientId !== clientId) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const isAdmin = user.role === 'admin';
  const isAssignee = existing.pocName === user.username;

  // Only admin or assigned user can edit
  if (!isAdmin && !isAssignee) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this note' });
  }

  // Admin can only edit within 2 hours of note creation
  if (isAdmin && !isAssignee) {
    const createdAt = existing.createdAt?.toDate?.() || new Date(existing.createdAt);
    const now = new Date();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (now - createdAt > twoHoursMs) {
      return res.status(403).json({ success: false, message: 'Edit window expired. Admins can only edit notes within 2 hours of creation.' });
    }
  }

  const {
    note,
    interactionType,
    pocId,
    pocName,
    status,
    nextFollowUp,
    outcome,
    blockers,
    priority,
    isPinned,
    comment,
    tags,
    dueDate
  } = req.body;

  // If only a comment is being added, no other updates needed
  if (comment && comment.trim()) {
    await adminDb.collection('client_notes').doc(noteId).collection('history').add({
      action: 'comment',
      comment: comment.trim(),
      changedBy: user.username,
      changedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // If only comment, no other fields to update
    if (note === undefined && status === undefined && outcome === undefined && blockers === undefined) {
      return res.status(200).json({ success: true, message: 'Comment added successfully' });
    }
  }

  // Track status change with timestamp and user
  const statusChanged = status !== undefined && status !== existing.status;
  const statusUpdateFields = statusChanged ? {
    statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    statusUpdatedBy: user.username
  } : {};

  // Assignee can only update status, outcome, and blockers
  const updateData = isAssignee && !isAdmin ? {
    ...(status !== undefined && { status }),
    ...(outcome !== undefined && { outcome: outcome.trim() }),
    ...(blockers !== undefined && { blockers: blockers.trim() }),
    ...statusUpdateFields,
    isEdited: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedBy: user.username
  } : {
    ...(note !== undefined && { note: note.trim() }),
    ...(interactionType !== undefined && { interactionType }),
    ...(pocId !== undefined && { pocId }),
    ...(pocName !== undefined && { pocName }),
    ...(status !== undefined && { status }),
    ...(nextFollowUp !== undefined && { nextFollowUp: nextFollowUp || null }),
    ...(dueDate !== undefined && { dueDate: dueDate || null }),
    ...(outcome !== undefined && { outcome: outcome.trim() }),
    ...(blockers !== undefined && { blockers: blockers.trim() }),
    ...(priority !== undefined && { priority }),
    ...(isPinned !== undefined && { isPinned: !!isPinned }),
    ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
    ...statusUpdateFields,
    isEdited: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedBy: user.username
  };

  await docRef.update(updateData);

  // Log history entry for audit trail
  const changes = [];
  if (status !== undefined && status !== existing.status) changes.push(`Status: ${existing.status} → ${status}`);
  if (outcome !== undefined && outcome?.trim() !== (existing.outcome || '')) changes.push(`Outcome updated`);
  if (blockers !== undefined && blockers?.trim() !== (existing.blockers || '')) changes.push(`Blockers updated`);
  if (note !== undefined && note?.trim() !== existing.note) changes.push(`Note text edited`);
  if (isPinned !== undefined && isPinned !== existing.isPinned) changes.push(isPinned ? 'Pinned' : 'Unpinned');
  if (priority !== undefined && priority !== existing.priority) changes.push(`Priority: ${existing.priority || 'Medium'} → ${priority}`);
  if (pocName !== undefined && pocName !== existing.pocName) changes.push(`Assigned: ${existing.pocName || 'none'} → ${pocName || 'none'}`);

  if (changes.length > 0) {
    await adminDb.collection('client_notes').doc(noteId).collection('history').add({
      action: 'updated',
      changes,
      changedBy: user.username,
      changedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  res.status(200).json({ success: true, message: 'Note updated successfully' });
}

async function handleDeleteNote(req, res, clientId, user, tenantId) {
  const { noteId } = req.query;

  if (!noteId) {
    return res.status(400).json({ success: false, message: 'Note ID is required' });
  }

  const docRef = adminDb.collection('client_notes').doc(noteId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  const existing = snapshot.data();
  if (existing.tenantId !== tenantId || existing.clientId !== clientId) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only admins can delete notes' });
  }

  await docRef.delete();

  res.status(200).json({ success: true, message: 'Note deleted successfully' });
}
