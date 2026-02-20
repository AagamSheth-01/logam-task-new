import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Phone,
  Mail,
  Users,
  User,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lock,
  Search,
  Filter,
  Pin,
  ArrowUp,
  ArrowDown,
  Download
} from 'lucide-react';

const INTERACTION_TYPES = ['Call', 'Email', 'Meeting', 'WhatsApp', 'Site Visit'];
const STATUS_OPTIONS = ['Pending', 'Done', 'Follow-up'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const PRIORITY_COLORS = {
  'High': 'bg-red-100 text-red-700',
  'Medium': 'bg-orange-100 text-orange-700',
  'Low': 'bg-gray-100 text-gray-600'
};

const NOTE_TEMPLATES = [
  { name: 'Sales Call', interactionType: 'Call', status: 'Follow-up', priority: 'High', note: 'Sales call with client.\n\nDiscussion points:\n- \n\nNext steps:\n- ' },
  { name: 'Follow-up Meeting', interactionType: 'Meeting', status: 'Pending', priority: 'Medium', note: 'Follow-up meeting.\n\nAgenda:\n- \n\nAction items:\n- ' },
  { name: 'Site Visit Report', interactionType: 'Site Visit', status: 'Done', priority: 'Medium', note: 'Site visit completed.\n\nObservations:\n- \n\nRecommendations:\n- ' },
  { name: 'Email Follow-up', interactionType: 'Email', status: 'Pending', priority: 'Low', note: 'Email sent regarding:\n\nKey points:\n- \n\nAwaiting response on:\n- ' },
  { name: 'WhatsApp Update', interactionType: 'WhatsApp', status: 'Done', priority: 'Low', note: 'WhatsApp conversation summary:\n\n' },
];

const INTERACTION_ICONS = {
  'Call': Phone,
  'Email': Mail,
  'Meeting': Users,
  'WhatsApp': MessageSquare,
  'Site Visit': Users
};

const STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Done': 'bg-green-100 text-green-800',
  'Follow-up': 'bg-blue-100 text-blue-800'
};

// Parse any Firestore timestamp format to a JS Date
const parseAnyTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (typeof timestamp?.toDate === 'function') return timestamp.toDate();
  if (timestamp._seconds !== undefined) return new Date(timestamp._seconds * 1000);
  if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
};

// Check if a note is within the 2-hour edit window
const isWithinEditWindow = (createdAt) => {
  const created = parseAnyTimestamp(createdAt);
  if (!created) return false;
  const now = new Date();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return (now - created) < twoHoursMs;
};

// Get remaining edit time as a human-readable string
const getRemainingEditTime = (createdAt) => {
  const created = parseAnyTimestamp(createdAt);
  if (!created) return '';
  const now = new Date();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const remaining = twoHoursMs - (now - created);
  if (remaining <= 0) return '';
  const mins = Math.floor(remaining / 60000);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m left to edit`;
  }
  return `${mins}m left to edit`;
};

const ClientNotesTab = ({ clientId, user, usersList: usersListProp = [] }) => {
  const [notes, setNotes] = useState([]);
  const [pocs, setPocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [usersList, setUsersList] = useState(usersListProp);

  // Fetch users if not provided via prop
  useEffect(() => {
    if (usersListProp && usersListProp.length > 0) {
      setUsersList(usersListProp);
    } else {
      const token = localStorage.getItem('token');
      fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { users: [] })
        .then(data => {
          if (data.users?.length) setUsersList(data.users);
        })
        .catch(() => {});
    }
  }, [usersListProp]);

  const [noteForm, setNoteForm] = useState({
    note: '',
    interactionType: 'Call',
    pocId: '',
    pocName: '',
    status: 'Done',
    nextFollowUp: '',
    outcome: '',
    blockers: '',
    priority: 'Medium',
    isPinned: false,
    tags: [],
    dueDate: ''
  });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingAsAssignee, setEditingAsAssignee] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [historyNoteId, setHistoryNoteId] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagFilter, setTagFilter] = useState('all');

  // Filters & Search
  const [noteSearch, setNoteSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [interactionFilter, setInteractionFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const isAdmin = user?.role === 'admin';

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }), []);

  useEffect(() => {
    fetchNotes();
    fetchPOCs();
  }, [clientId]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/notes`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notes');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPOCs = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/pocs`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch POCs');
      const data = await res.json();
      setPocs(data.pocs || []);
    } catch (err) {
      console.error('Failed to fetch POCs:', err);
    }
  };

  const createNote = async () => {
    if (!noteForm.note.trim()) {
      setError('Note text is required');
      return;
    }
    setSubmitting(true);
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
      fetchNotes();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateNote = async (noteId) => {
    setSubmitting(true);
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
      fetchNotes();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/notes?noteId=${noteId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete note');
      }
      setSuccess('Note deleted');
      fetchNotes();
    } catch (err) {
      setError(err.message);
    }
  };

  const exportNotesCSV = () => {
    const data = filteredNotes.map(n => ({
      Status: n.status,
      Priority: n.priority || 'Medium',
      Type: n.interactionType,
      Note: `"${(n.note || '').replace(/"/g, '""')}"`,
      AssignedTo: n.pocName || '',
      Outcome: `"${(n.outcome || '').replace(/"/g, '""')}"`,
      Blockers: `"${(n.blockers || '').replace(/"/g, '""')}"`,
      FollowUp: n.nextFollowUp || '',
      DueDate: n.dueDate || '',
      Tags: (n.tags || []).join('; '),
      CreatedBy: n.createdBy,
      CreatedAt: formatDateTime(n.createdAt),
      Pinned: n.isPinned ? 'Yes' : 'No'
    }));
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => row[h]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleNoteSelection = (noteId) => {
    setSelectedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredNotes.map(n => n.id)));
    }
  };

  const bulkUpdateStatus = async (newStatus) => {
    if (selectedNotes.size === 0) return;
    setBulkUpdating(true);
    try {
      const promises = [...selectedNotes].map(noteId =>
        fetch(`/api/clients/${clientId}/notes?noteId=${noteId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ status: newStatus })
        })
      );
      await Promise.all(promises);
      setSuccess(`${selectedNotes.size} notes updated to ${newStatus}`);
      setSelectedNotes(new Set());
      fetchNotes();
    } catch (err) {
      setError('Failed to bulk update');
    } finally {
      setBulkUpdating(false);
    }
  };

  const addComment = async (noteId) => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/notes?noteId=${noteId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ comment: commentText.trim() })
      });
      if (res.ok) {
        setCommentText('');
        fetchHistory(noteId);
      }
    } catch (err) {
      setError('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const fetchHistory = async (noteId) => {
    if (historyNoteId === noteId) {
      setHistoryNoteId(null);
      setHistoryData([]);
      return;
    }
    setHistoryNoteId(noteId);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/notes?noteId=${noteId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const togglePin = async (note) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/notes?noteId=${note.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isPinned: !note.isPinned })
      });
      if (res.ok) fetchNotes();
    } catch (err) {
      setError('Failed to toggle pin');
    }
  };

  const startEditNote = (note, asAssignee = false) => {
    setEditingNoteId(note.id);
    setEditingAsAssignee(asAssignee);
    setNoteForm({
      note: note.note || '',
      interactionType: note.interactionType || 'Call',
      pocId: note.pocId || '',
      pocName: note.pocName || '',
      status: note.status || 'Done',
      nextFollowUp: note.nextFollowUp || '',
      outcome: note.outcome || '',
      blockers: note.blockers || '',
      priority: note.priority || 'Medium',
      isPinned: note.isPinned || false,
      tags: note.tags || [],
      dueDate: note.dueDate || ''
    });
  };

  const resetNoteForm = () => {
    setNoteForm({
      note: '',
      interactionType: 'Call',
      pocId: '',
      pocName: '',
      status: 'Done',
      nextFollowUp: '',
      outcome: '',
      blockers: '',
      priority: 'Medium',
      isPinned: false,
      tags: [],
      dueDate: ''
    });
    setEditingNoteId(null);
    setEditingAsAssignee(false);
  };

  const parseTimestamp = (timestamp) => {
    if (!timestamp) return null;
    // Firestore client SDK timestamp
    if (typeof timestamp?.toDate === 'function') return timestamp.toDate();
    // Firestore admin SDK serialized: {_seconds, _nanoseconds}
    if (timestamp._seconds !== undefined) return new Date(timestamp._seconds * 1000);
    // Firestore serialized: {seconds, nanoseconds}
    if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
    // ISO string or regular date
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (timestamp) => {
    const date = parseTimestamp(timestamp);
    if (!date) return '';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatDateTime = (timestamp) => {
    const date = parseTimestamp(timestamp);
    if (!date) return '';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Determine if the current form is for assignee-only editing
  const showAssigneeForm = editingNoteId && editingAsAssignee;
  // Show the full add/edit form only for admin
  const showFullForm = isAdmin && (!editingNoteId || !editingAsAssignee);

  // Sort: pinned first, then by createdAt (already sorted from API but we re-sort for pin)
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0; // preserve API sort order otherwise
  });

  // Filtered notes
  const filteredNotes = sortedNotes.filter(note => {
    if (statusFilter !== 'all' && note.status !== statusFilter) return false;
    if (interactionFilter !== 'all' && note.interactionType !== interactionFilter) return false;
    if (assigneeFilter !== 'all' && note.pocName !== assigneeFilter) return false;
    if (tagFilter !== 'all' && !(note.tags || []).includes(tagFilter)) return false;
    if (dateFrom || dateTo) {
      const noteDate = parseTimestamp(note.createdAt);
      if (noteDate) {
        if (dateFrom && noteDate < new Date(dateFrom)) return false;
        if (dateTo) {
          const endOfDay = new Date(dateTo + 'T23:59:59');
          if (noteDate > endOfDay) return false;
        }
      } else {
        return false;
      }
    }
    if (noteSearch.trim()) {
      const q = noteSearch.toLowerCase();
      const matchesText = note.note?.toLowerCase().includes(q);
      const matchesOutcome = note.outcome?.toLowerCase().includes(q);
      const matchesBlockers = note.blockers?.toLowerCase().includes(q);
      const matchesCreator = note.createdBy?.toLowerCase().includes(q);
      if (!matchesText && !matchesOutcome && !matchesBlockers && !matchesCreator) return false;
    }
    return true;
  });

  // Get unique assignees, tags, and months from notes for filter dropdowns
  const noteAssignees = [...new Set(notes.filter(n => n.pocName).map(n => n.pocName))];
  const allTags = [...new Set(notes.flatMap(n => n.tags || []))];
  const hasActiveFilters = statusFilter !== 'all' || interactionFilter !== 'all' || assigneeFilter !== 'all' || tagFilter !== 'all' || dateFrom || dateTo || noteSearch.trim();

  return (
    <div className="space-y-3 sm:space-y-4 max-w-full">
      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Admin Full Note Form (Add / Admin Edit) */}
      {showFullForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
            {editingNoteId ? 'Edit Note' : 'Add Note'}
          </h3>

          <div className="space-y-2.5 sm:space-y-3">
            {/* Templates - only when creating new note */}
            {!editingNoteId && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                <span className="text-[10px] sm:text-xs text-gray-500 py-1">Templates:</span>
                {NOTE_TEMPLATES.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setNoteForm(prev => ({
                      ...prev,
                      note: t.note,
                      interactionType: t.interactionType,
                      status: t.status,
                      priority: t.priority
                    }))}
                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            <textarea
              placeholder="Write your note here..."
              value={noteForm.note}
              onChange={(e) => setNoteForm(prev => ({ ...prev, note: e.target.value }))}
              rows={3}
              className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <select
                value={noteForm.interactionType}
                onChange={(e) => setNoteForm(prev => ({ ...prev, interactionType: e.target.value }))}
                className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              >
                {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select
                value={noteForm.pocName}
                onChange={(e) => {
                  setNoteForm(prev => ({
                    ...prev,
                    pocId: e.target.value,
                    pocName: e.target.value
                  }));
                }}
                className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Assign to user</option>
                {usersList.map(u => (
                  <option key={u.id || u.username} value={u.username}>
                    {u.username}{u.role === 'admin' ? ' (Admin)' : ''}
                  </option>
                ))}
              </select>

              <select
                value={noteForm.status}
                onChange={(e) => setNoteForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <input
                type="date"
                value={noteForm.nextFollowUp}
                onChange={(e) => setNoteForm(prev => ({ ...prev, nextFollowUp: e.target.value }))}
                className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Follow-up date"
              />
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] sm:text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Less options' : 'More options (outcome, blockers)'}
            </button>

            {expanded && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Outcome"
                    value={noteForm.outcome}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, outcome: e.target.value }))}
                    className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Blockers"
                    value={noteForm.blockers}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, blockers: e.target.value }))}
                    className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <select
                    value={noteForm.priority}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p} Priority</option>)}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">Due Date:</label>
                    <input
                      type="date"
                      value={noteForm.dueDate}
                      onChange={(e) => setNoteForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noteForm.isPinned}
                      onChange={(e) => setNoteForm(prev => ({ ...prev, isPinned: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Pin className="w-3.5 h-3.5" />
                    Pin to top
                  </label>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1">
                    {(noteForm.tags || []).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] sm:text-xs">
                        {tag}
                        <button onClick={() => setNoteForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))} className="hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Add tag (press Enter)"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault();
                          const tag = tagInput.trim().toLowerCase();
                          if (!(noteForm.tags || []).includes(tag)) {
                            setNoteForm(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
                          }
                          setTagInput('');
                        }
                      }}
                      className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-lg text-[10px] sm:text-xs focus:ring-2 focus:ring-blue-500"
                    />
                    {['urgent', 'payment', 'proposal', 'follow-up'].filter(t => !(noteForm.tags || []).includes(t)).slice(0, 3).map(t => (
                      <button
                        key={t}
                        onClick={() => setNoteForm(prev => ({ ...prev, tags: [...(prev.tags || []), t] }))}
                        className="hidden sm:inline-block px-1.5 py-1 text-[10px] bg-gray-100 text-gray-500 rounded hover:bg-indigo-100 hover:text-indigo-700"
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              {editingNoteId && (
                <button
                  onClick={resetNoteForm}
                  className="px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-800 text-center"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => editingNoteId ? updateNote(editingNoteId) : createNote()}
                disabled={submitting || !noteForm.note.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {submitting ? 'Saving...' : editingNoteId ? 'Update Note' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignee-Only Update Form (status, outcome, blockers only) */}
      {showAssigneeForm && (
        <div className="bg-white border border-purple-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-purple-700">Update Task Status</h3>
            <span className="text-[10px] sm:text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Assigned to you</span>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <div className="p-2.5 sm:p-3 bg-gray-50 rounded-lg text-xs sm:text-sm text-gray-600 italic">
              {noteForm.note}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={noteForm.status}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-1">Outcome</label>
                <input
                  type="text"
                  placeholder="What was the outcome?"
                  value={noteForm.outcome}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, outcome: e.target.value }))}
                  className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-1">Blockers</label>
                <input
                  type="text"
                  placeholder="Any blockers?"
                  value={noteForm.blockers}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, blockers: e.target.value }))}
                  className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                onClick={resetNoteForm}
                className="px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-800 text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => updateNote(editingNoteId)}
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs sm:text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {submitting ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-admin info banner */}
      {!isAdmin && !editingNoteId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 sm:p-3 flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span>Only admins can add notes. You can update status, outcome & blockers on notes assigned to you.</span>
        </div>
      )}

      {/* Filters & Search */}
      {notes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-2.5 sm:p-3 space-y-2">
          {/* Row 1: Search + dropdown filters */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="relative col-span-2 sm:flex-1 sm:min-w-[150px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={interactionFilter}
              onChange={(e) => setInteractionFilter(e.target.value)}
              className="w-full sm:w-auto px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {noteAssignees.length > 0 && (
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full sm:w-auto px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                {noteAssignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
            {allTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full sm:w-auto px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {hasActiveFilters && (
              <button
                onClick={() => { setStatusFilter('all'); setInteractionFilter('all'); setAssigneeFilter('all'); setTagFilter('all'); setDateFrom(''); setDateTo(''); setNoteSearch(''); }}
                className="col-span-2 sm:col-span-1 px-2 py-1.5 text-[11px] sm:text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center sm:justify-start gap-1"
              >
                <X className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>
          {/* Row 2: Date presets + custom range */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
            {[
              { label: 'Today', fn: () => { const d = new Date().toISOString().slice(0, 10); setDateFrom(d); setDateTo(d); } },
              { label: 'Yesterday', fn: () => { const d = new Date(Date.now() - 86400000).toISOString().slice(0, 10); setDateFrom(d); setDateTo(d); } },
              { label: '7 Days', fn: () => { setDateFrom(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10)); } },
              { label: '30 Days', fn: () => { setDateFrom(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10)); } },
              { label: 'This Month', fn: () => { const now = new Date(); setDateFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`); setDateTo(now.toISOString().slice(0, 10)); } },
              { label: 'Last Month', fn: () => { const now = new Date(); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0); setDateFrom(lm.toISOString().slice(0, 10)); setDateTo(lmEnd.toISOString().slice(0, 10)); } },
            ].map(p => (
              <button
                key={p.label}
                onClick={p.fn}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
              >
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-300 rounded-lg px-1.5 sm:px-2 py-0.5 ml-auto sm:ml-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-[10px] sm:text-xs focus:outline-none w-[90px] sm:w-[110px]"
                title="From date"
              />
              <span className="text-gray-400 text-[10px] sm:text-xs">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-[10px] sm:text-xs focus:outline-none w-[90px] sm:w-[110px]"
                title="To date"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {isAdmin && selectedNotes.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-blue-700 font-medium">{selectedNotes.size} selected</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs text-gray-500">Mark as:</span>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => bulkUpdateStatus(s)}
                disabled={bulkUpdating}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded ${STATUS_COLORS[s]} hover:opacity-80 disabled:opacity-50`}
              >
                {s}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedNotes(new Set())} className="text-[10px] sm:text-xs text-gray-500 hover:text-gray-700 ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {/* Notes Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700">
            Timeline ({filteredNotes.length}{hasActiveFilters ? ` of ${notes.length}` : ''})
          </h3>
          <div className="flex items-center gap-2 sm:gap-3">
            {filteredNotes.length > 0 && (
              <button
                onClick={exportNotesCSV}
                className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 hover:text-blue-600"
                title="Export as CSV"
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Export</span>
              </button>
            )}
            {isAdmin && filteredNotes.length > 0 && (
              <label className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedNotes.size === filteredNotes.length && filteredNotes.length > 0}
                  onChange={selectAllFiltered}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="hidden sm:inline">Select all</span>
              </label>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-6 sm:py-8">
            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600 mx-auto" />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <p className="text-xs sm:text-sm text-gray-400 text-center py-6 sm:py-8">
            {isAdmin ? 'No notes yet. Add your first note above.' : 'No notes yet.'}
          </p>
        )}

        {!loading && notes.length > 0 && filteredNotes.length === 0 && (
          <p className="text-xs sm:text-sm text-gray-400 text-center py-6 sm:py-8">No notes match your filters.</p>
        )}

        <div className="space-y-3 sm:space-y-4">
          {filteredNotes.map((note, index) => {
            const Icon = INTERACTION_ICONS[note.interactionType] || MessageSquare;
            const isNoteAssignee = note.pocName === user.username;
            const withinWindow = isWithinEditWindow(note.createdAt);
            const remainingTime = getRemainingEditTime(note.createdAt);

            // Admin can edit within 2 hours, assignee can always update status
            const canAdminEdit = isAdmin && withinWindow;
            const canAssigneeUpdate = isNoteAssignee && !isAdmin;
            const canEdit = canAdminEdit || canAssigneeUpdate;
            // Only admin can delete
            const canDelete = isAdmin;

            return (
              <div key={note.id} className="relative flex gap-2 sm:gap-3">
                {index < filteredNotes.length - 1 && (
                  <div className="absolute left-[14px] sm:left-[18px] top-8 sm:top-10 bottom-0 w-px bg-gray-200" />
                )}

                {isAdmin && (
                  <div className="flex items-start pt-1.5 sm:pt-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedNotes.has(note.id)}
                      onChange={() => toggleNoteSelection(note.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 z-10">
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                </div>

                <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-2.5 sm:p-3 lg:p-4">
                  <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5">
                        {note.isPinned && (
                          <span className="text-[10px] sm:text-xs text-amber-600 flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </span>
                        )}
                        <span className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${STATUS_COLORS[note.status] || 'bg-gray-100 text-gray-700'}`}>
                          {note.status}
                        </span>
                        {note.priority && note.priority !== 'Medium' && (
                          <span className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${PRIORITY_COLORS[note.priority] || ''}`}>
                            {note.priority}
                          </span>
                        )}
                        {(note.tags || []).map(tag => (
                          <span key={tag} className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                            {tag}
                          </span>
                        ))}
                        <span className="text-[10px] sm:text-xs text-gray-500 bg-gray-200 px-1.5 sm:px-2 py-0.5 rounded-full">
                          {note.interactionType}
                        </span>
                        {note.pocName && (
                          <span className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-0.5 sm:gap-1">
                            <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {note.pocName}
                          </span>
                        )}
                        {isAdmin && withinWindow && remainingTime && (
                          <span className="hidden sm:flex text-[10px] sm:text-xs text-orange-500 items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {remainingTime}
                          </span>
                        )}
                      </div>
                      {/* Mobile-only: tags row */}
                      {(note.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1 sm:hidden">
                          {note.tags.map(tag => (
                            <span key={tag} className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-indigo-100 text-indigo-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap break-words">{note.note}</p>

                      {note.outcome && (
                        <div className="mt-1.5 sm:mt-2 flex items-start gap-1 text-[10px] sm:text-xs text-green-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>Outcome: {note.outcome}</span>
                        </div>
                      )}
                      {note.blockers && (
                        <div className="mt-1 flex items-start gap-1 text-[10px] sm:text-xs text-red-700">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>Blockers: {note.blockers}</span>
                        </div>
                      )}
                      {note.nextFollowUp && (() => {
                        const followUpDate = new Date(note.nextFollowUp);
                        followUpDate.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isOverdue = note.status !== 'Done' && followUpDate < today;
                        const isDueToday = note.status !== 'Done' && followUpDate.getTime() === today.getTime();
                        return (
                          <div className={`mt-1 flex flex-wrap items-center gap-1 text-[10px] sm:text-xs ${isOverdue ? 'text-red-700 font-medium' : isDueToday ? 'text-orange-600 font-medium' : 'text-blue-700'}`}>
                            {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                            <span>Follow-up: {formatDate(note.nextFollowUp)}</span>
                            {isOverdue && <span className="px-1 sm:px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] sm:text-[10px] uppercase font-bold">Overdue</span>}
                            {isDueToday && <span className="px-1 sm:px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[9px] sm:text-[10px] uppercase font-bold">Due Today</span>}
                          </div>
                        );
                      })()}
                      {note.dueDate && (() => {
                        const dueDateObj = new Date(note.dueDate);
                        dueDateObj.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isDuePast = note.status !== 'Done' && dueDateObj < today;
                        const isDueToday = note.status !== 'Done' && dueDateObj.getTime() === today.getTime();
                        return (
                          <div className={`mt-1 flex flex-wrap items-center gap-1 text-[10px] sm:text-xs ${isDuePast ? 'text-red-700 font-medium' : isDueToday ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                            {isDuePast ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>Due: {formatDate(note.dueDate)}</span>
                            {isDuePast && <span className="px-1 sm:px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] sm:text-[10px] uppercase font-bold">Past Due</span>}
                            {isDueToday && <span className="px-1 sm:px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[9px] sm:text-[10px] uppercase font-bold">Due Today</span>}
                          </div>
                        );
                      })()}

                      <div className="mt-1.5 sm:mt-2 space-y-0.5">
                        <div className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                          <span className="truncate">Created by {note.createdBy} &middot; {formatDateTime(note.createdAt)}</span>
                        </div>
                        {note.statusUpdatedAt && (
                          <div className="text-[10px] sm:text-xs text-purple-500 flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                            <span className="truncate">Status by {note.statusUpdatedBy || note.lastUpdatedBy || 'user'} &middot; {formatDateTime(note.statusUpdatedAt)}</span>
                          </div>
                        )}
                        {note.isEdited && !note.statusUpdatedAt && note.updatedAt && (
                          <div className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
                            <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                            <span className="truncate">Edited by {note.lastUpdatedBy || note.createdBy} &middot; {formatDateTime(note.updatedAt)}</span>
                          </div>
                        )}
                        <button
                          onClick={() => fetchHistory(note.id)}
                          className="text-[9px] sm:text-[10px] text-gray-400 hover:text-blue-600 flex items-center gap-1 mt-0.5"
                        >
                          {historyNoteId === note.id ? <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          {historyNoteId === note.id ? 'Hide history' : 'View history'}
                        </button>
                      </div>

                      {/* Expandable History */}
                      {historyNoteId === note.id && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          {loadingHistory && <p className="text-[10px] text-gray-400">Loading...</p>}
                          {!loadingHistory && historyData.length === 0 && (
                            <p className="text-[10px] text-gray-400">No history available</p>
                          )}
                          {!loadingHistory && historyData.length > 0 && (
                            <div className="space-y-1 sm:space-y-1.5">
                              {historyData.map(h => (
                                <div key={h.id} className={`text-[9px] sm:text-[10px] flex items-start gap-1 sm:gap-1.5 ${h.action === 'comment' ? 'text-gray-700 bg-blue-50 p-1 sm:p-1.5 rounded' : 'text-gray-500'}`}>
                                  <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mt-1 flex-shrink-0 ${h.action === 'comment' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                                  <div className="min-w-0">
                                    <span className="font-medium text-gray-600">{h.changedBy}</span>
                                    {h.action === 'comment' ? (
                                      <span className="ml-1">{h.comment}</span>
                                    ) : (
                                      <span>{' '}{h.changes?.join(', ')}</span>
                                    )}
                                    <span className="text-gray-400 ml-1">&middot; {formatDateTime(h.changedAt)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Comment input */}
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) addComment(note.id); }}
                              className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-[10px] sm:text-xs focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => addComment(note.id)}
                              disabled={!commentText.trim() || submittingComment}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] sm:text-xs hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                            >
                              {submittingComment ? '...' : 'Send'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 flex-shrink-0">
                      {isAdmin && (
                        <button
                          onClick={() => togglePin(note)}
                          className={`p-0.5 sm:p-1 ${note.isPinned ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
                          title={note.isPinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => startEditNote(note, canAssigneeUpdate)}
                          className="p-0.5 sm:p-1 text-gray-400 hover:text-blue-600"
                          title={canAssigneeUpdate ? 'Update status/outcome/blockers' : 'Edit note'}
                        >
                          <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => deleteNote(note.id)} className="p-0.5 sm:p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClientNotesTab;
