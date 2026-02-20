import { useState, useCallback, useEffect, useMemo } from 'react';

const useClientNotes = (user) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Client list
  const [clients, setClients] = useState([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);

  // Per-client data (keyed by clientId)
  const [notesMap, setNotesMap] = useState({});
  const [pocsMap, setPocsMap] = useState({});
  const [loadingNotes, setLoadingNotes] = useState({});
  const [loadingPocs, setLoadingPocs] = useState({});

  // Expanded client
  const [expandedClientId, setExpandedClientId] = useState(null);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [interactionFilter, setInteractionFilter] = useState('all');

  // Note form state
  const [noteForm, setNoteForm] = useState({
    note: '',
    interactionType: 'Call',
    pocId: '',
    pocName: '',
    status: 'Done',
    nextFollowUp: '',
    outcome: '',
    blockers: ''
  });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [submittingNote, setSubmittingNote] = useState(false);

  // POC form state
  const [pocForm, setPocForm] = useState({ name: '', phone: '', email: '', designation: '' });
  const [editingPocId, setEditingPocId] = useState(null);
  const [submittingPoc, setSubmittingPoc] = useState(false);
  const [showPocForm, setShowPocForm] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }), []);

  // Clear messages after timeout
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    if (!user?.username) return;
    setLoading(true);
    try {
      const res = await fetch('/api/clients?format=full', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      setClients(data.clients || []);
      setClientsLoaded(true);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [user?.username, authHeaders]);

  // Fetch notes for a client
  const fetchNotes = useCallback(async (clientId) => {
    if (!clientId) return;
    setLoadingNotes(prev => ({ ...prev, [clientId]: true }));
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (interactionFilter !== 'all') params.append('interactionType', interactionFilter);

      const res = await fetch(`/api/clients/${clientId}/notes?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notes');
      const data = await res.json();
      setNotesMap(prev => ({ ...prev, [clientId]: data.notes || [] }));
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setError('Failed to load notes');
    } finally {
      setLoadingNotes(prev => ({ ...prev, [clientId]: false }));
    }
  }, [authHeaders, statusFilter, interactionFilter]);

  // Fetch POCs for a client
  const fetchPOCs = useCallback(async (clientId) => {
    if (!clientId) return;
    setLoadingPocs(prev => ({ ...prev, [clientId]: true }));
    try {
      const res = await fetch(`/api/clients/${clientId}/pocs`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch POCs');
      const data = await res.json();
      setPocsMap(prev => ({ ...prev, [clientId]: data.pocs || [] }));
    } catch (err) {
      console.error('Failed to fetch POCs:', err);
    } finally {
      setLoadingPocs(prev => ({ ...prev, [clientId]: false }));
    }
  }, [authHeaders]);

  // Load data when expanding a client
  const expandClient = useCallback((clientId) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      return;
    }
    setExpandedClientId(clientId);
    setEditingNoteId(null);
    setEditingPocId(null);
    setShowPocForm(false);
    resetNoteForm();
    // Lazy load notes and POCs
    fetchNotes(clientId);
    fetchPOCs(clientId);
  }, [expandedClientId, fetchNotes, fetchPOCs]);

  // Re-fetch notes when filters change
  useEffect(() => {
    if (expandedClientId) {
      fetchNotes(expandedClientId);
    }
  }, [statusFilter, interactionFilter, expandedClientId, fetchNotes]);

  // Load clients on mount
  useEffect(() => {
    if (user?.username && !clientsLoaded) {
      fetchClients();
    }
  }, [user?.username, clientsLoaded, fetchClients]);

  // Note CRUD
  const resetNoteForm = useCallback(() => {
    setNoteForm({
      note: '',
      interactionType: 'Call',
      pocId: '',
      pocName: '',
      status: 'Done',
      nextFollowUp: '',
      outcome: '',
      blockers: ''
    });
    setEditingNoteId(null);
  }, []);

  const createNote = useCallback(async (clientId) => {
    if (!noteForm.note.trim()) {
      setError('Note text is required');
      return;
    }
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/notes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(noteForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create note');
      }
      setSuccess('Note added successfully');
      resetNoteForm();
      fetchNotes(clientId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingNote(false);
    }
  }, [noteForm, authHeaders, resetNoteForm, fetchNotes]);

  const updateNote = useCallback(async (clientId, noteId) => {
    if (!noteForm.note.trim()) {
      setError('Note text is required');
      return;
    }
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/notes?noteId=${noteId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(noteForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update note');
      }
      setSuccess('Note updated successfully');
      resetNoteForm();
      fetchNotes(clientId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingNote(false);
    }
  }, [noteForm, authHeaders, resetNoteForm, fetchNotes]);

  const deleteNote = useCallback(async (clientId, noteId) => {
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/notes?noteId=${noteId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete note');
      setSuccess('Note deleted');
      fetchNotes(clientId);
    } catch (err) {
      setError(err.message);
    }
  }, [authHeaders, fetchNotes]);

  const startEditNote = useCallback((note) => {
    setEditingNoteId(note.id);
    setNoteForm({
      note: note.note || '',
      interactionType: note.interactionType || 'Call',
      pocId: note.pocId || '',
      pocName: note.pocName || '',
      status: note.status || 'Done',
      nextFollowUp: note.nextFollowUp || '',
      outcome: note.outcome || '',
      blockers: note.blockers || ''
    });
  }, []);

  // POC CRUD
  const resetPocForm = useCallback(() => {
    setPocForm({ name: '', phone: '', email: '', designation: '' });
    setEditingPocId(null);
    setShowPocForm(false);
  }, []);

  const createPOC = useCallback(async (clientId) => {
    if (!pocForm.name.trim()) {
      setError('POC name is required');
      return;
    }
    setSubmittingPoc(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/pocs`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(pocForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create POC');
      }
      setSuccess('POC added successfully');
      resetPocForm();
      fetchPOCs(clientId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingPoc(false);
    }
  }, [pocForm, authHeaders, resetPocForm, fetchPOCs]);

  const updatePOC = useCallback(async (clientId, pocId) => {
    if (!pocForm.name.trim()) {
      setError('POC name is required');
      return;
    }
    setSubmittingPoc(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/pocs?pocId=${pocId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(pocForm)
      });
      if (!res.ok) throw new Error('Failed to update POC');
      setSuccess('POC updated');
      resetPocForm();
      fetchPOCs(clientId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingPoc(false);
    }
  }, [pocForm, authHeaders, resetPocForm, fetchPOCs]);

  const deletePOC = useCallback(async (clientId, pocId) => {
    if (!confirm('Delete this POC?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/pocs?pocId=${pocId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete POC');
      setSuccess('POC deleted');
      fetchPOCs(clientId);
    } catch (err) {
      setError(err.message);
    }
  }, [authHeaders, fetchPOCs]);

  const startEditPoc = useCallback((poc) => {
    setEditingPocId(poc.id);
    setPocForm({
      name: poc.name || '',
      phone: poc.phone || '',
      email: poc.email || '',
      designation: poc.designation || ''
    });
    setShowPocForm(true);
  }, []);

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.assignedTo?.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  // Get latest note for a client (for card preview)
  const getLatestNote = useCallback((clientId) => {
    const notes = notesMap[clientId];
    if (!notes || notes.length === 0) return null;
    return notes[0]; // Already sorted descending
  }, [notesMap]);

  // Get follow-up count for a client
  const getFollowUpCount = useCallback((clientId) => {
    const notes = notesMap[clientId];
    if (!notes) return 0;
    return notes.filter(n => n.status === 'Follow-up').length;
  }, [notesMap]);

  // Get overdue count for a client (notes with past follow-up date and status not Done)
  const getOverdueCount = useCallback((clientId) => {
    const notes = notesMap[clientId];
    if (!notes) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return notes.filter(n => {
      if (n.status === 'Done' || !n.nextFollowUp) return false;
      const followUp = new Date(n.nextFollowUp);
      followUp.setHours(0, 0, 0, 0);
      return followUp < today;
    }).length;
  }, [notesMap]);

  return {
    // State
    loading,
    error,
    success,
    clients: filteredClients,
    allClients: clients,
    notesMap,
    pocsMap,
    loadingNotes,
    loadingPocs,
    expandedClientId,
    searchQuery,
    statusFilter,
    interactionFilter,
    noteForm,
    editingNoteId,
    submittingNote,
    pocForm,
    editingPocId,
    submittingPoc,
    showPocForm,

    // Actions
    setSearchQuery,
    setStatusFilter,
    setInteractionFilter,
    setNoteForm,
    setPocForm,
    setShowPocForm,
    expandClient,
    fetchClients,
    fetchNotes,
    fetchPOCs,
    createNote,
    updateNote,
    deleteNote,
    startEditNote,
    resetNoteForm,
    createPOC,
    updatePOC,
    deletePOC,
    startEditPoc,
    resetPocForm,
    getLatestNote,
    getFollowUpCount,
    getOverdueCount
  };
};

export default useClientNotes;
