import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Phone,
  Mail,
  User,
  Users
} from 'lucide-react';

const ClientPOCsTab = ({ clientId, user, usersList: usersListProp = [] }) => {
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

  const [pocForm, setPocForm] = useState({
    name: '',
    designation: '',
    phone: '',
    email: ''
  });
  const [editingPocId, setEditingPocId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }), []);

  useEffect(() => {
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

  const fetchPOCs = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/pocs`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch POCs');
      const data = await res.json();
      setPocs(data.pocs || []);
    } catch (err) {
      console.error('Failed to fetch POCs:', err);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const createPOC = async () => {
    if (!pocForm.name.trim()) {
      setError('POC name is required');
      return;
    }
    setSubmitting(true);
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
      setSuccess('Contact added successfully');
      resetPocForm();
      fetchPOCs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updatePOC = async (pocId) => {
    if (!pocForm.name.trim()) {
      setError('POC name is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/pocs?pocId=${pocId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(pocForm)
      });
      if (!res.ok) throw new Error('Failed to update POC');
      setSuccess('Contact updated');
      resetPocForm();
      fetchPOCs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deletePOC = async (pocId) => {
    if (!confirm('Delete this contact?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/pocs?pocId=${pocId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete POC');
      setSuccess('Contact deleted');
      fetchPOCs();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditPoc = (poc) => {
    setEditingPocId(poc.id);
    setPocForm({
      name: poc.name || '',
      phone: poc.phone || '',
      email: poc.email || '',
      designation: poc.designation || ''
    });
    setShowForm(true);
  };

  const resetPocForm = () => {
    setPocForm({
      name: '',
      designation: '',
      phone: '',
      email: ''
    });
    setEditingPocId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Point of Contacts ({pocs.length})
        </h3>
        <button
          onClick={() => {
            if (showForm && !editingPocId) {
              resetPocForm();
            } else {
              resetPocForm();
              setShowForm(true);
            }
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm && !editingPocId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm && !editingPocId ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {/* POC Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            {editingPocId ? 'Edit Contact' : 'Add Contact'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <select
                value={pocForm.name}
                onChange={(e) => setPocForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select user</option>
                {usersList.map((u) => (
                  <option key={u.id || u.username} value={u.username}>
                    {u.username}{u.role === 'admin' ? ' (Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={pocForm.designation}
                onChange={(e) => setPocForm(prev => ({ ...prev, designation: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Manager, CEO, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={pocForm.phone}
                onChange={(e) => setPocForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+91 1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={pocForm.email}
                onChange={(e) => setPocForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="john@company.com"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={resetPocForm}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => editingPocId ? updatePOC(editingPocId) : createPOC()}
              disabled={submitting || !pocForm.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : editingPocId ? 'Update Contact' : 'Add Contact'}
            </button>
          </div>
        </div>
      )}

      {/* POCs List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
          </div>
        )}

        {!loading && pocs.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-4">No contacts yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add First Contact
            </button>
          </div>
        )}

        {!loading && pocs.length > 0 && (
          <div className="divide-y divide-gray-200">
            {pocs.map(poc => (
              <div key={poc.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-gray-900">{poc.name}</h4>
                      {poc.designation && (
                        <p className="text-sm text-gray-500">{poc.designation}</p>
                      )}
                      <div className="mt-2 space-y-1">
                        {poc.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <a href={`tel:${poc.phone}`} className="hover:text-blue-600">
                              {poc.phone}
                            </a>
                          </div>
                        )}
                        {poc.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <a href={`mailto:${poc.email}`} className="hover:text-blue-600 truncate">
                              {poc.email}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => startEditPoc(poc)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletePOC(poc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPOCsTab;
