import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Search,
  Filter,
  Plus,
  Save,
  X,
  Phone,
  Mail,
  Globe,
  Building,
  User,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Calendar,
  Activity,
  StickyNote,
  Users,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import useClientNotes from '../../hooks/useClientNotes';
import ClientNotesTab from '../client/ClientNotesTab';
import ClientPOCsTab from '../client/ClientPOCsTab';

const ClientNotesDashboard = ({ user, usersList: usersListProp }) => {
  const router = useRouter();
  const [mainView, setMainView] = useState('clients'); // 'clients' or 'mytasks'
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [expandedClient, setExpandedClient] = useState(null);
  const [usersList, setUsersList] = useState(usersListProp || []);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    website: '',
    industry: '',
    assignedTo: '',
    description: ''
  });
  const {
    loading,
    error,
    success,
    clients,
    notesMap,
    searchQuery,
    setSearchQuery,
    fetchClients,
    getLatestNote,
    getFollowUpCount,
    getOverdueCount
  } = useClientNotes(user);

  // Fetch users list for POC dropdown
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('[ClientNotes] Failed to fetch users:', err);
    }
  }, []);

  // Sync from prop if provided
  useEffect(() => {
    if (usersListProp && usersListProp.length > 0) {
      setUsersList(usersListProp);
    }
  }, [usersListProp]);

  // Always fetch if we don't have users yet
  useEffect(() => {
    if (user?.username) fetchUsers();
  }, [user?.username, fetchUsers]);

  // Early return after all hooks
  if (!user?.username) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Please log in to view client notes</p>
        </div>
      </div>
    );
  }

  const handleClientClick = async (client) => {
    if (expandedClientId === client.id) {
      // Collapse if already expanded
      setExpandedClientId(null);
      setExpandedClient(null);
      setActiveTab('notes');
    } else {
      // Expand and fetch full details
      setExpandedClientId(client.id);
      setActiveTab('notes');

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/clients/${client.id}/details`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setExpandedClient(data.client);
        } else {
          setExpandedClient(client);
        }
      } catch (err) {
        console.error('Failed to fetch client details:', err);
        setExpandedClient(client);
      }
    }
  };

  const handleAddClient = async () => {
    if (!clientForm.name.trim() || !clientForm.email.trim()) {
      alert('Client name and email are required');
      return;
    }

    setAddingClient(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/clients/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...clientForm,
          assignedTo: clientForm.assignedTo || user.username,
          createdBy: user.username
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add client');
      }

      setShowAddClientModal(false);
      setClientForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        website: '',
        industry: '',
        assignedTo: '',
        description: ''
      });
      fetchClients();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingClient(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMainView('clients')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mainView === 'clients' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-1.5"><Building className="w-4 h-4" /> Clients</span>
            </button>
            <button
              onClick={() => setMainView('mytasks')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mainView === 'mytasks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> My Tasks</span>
            </button>
          </div>
          {mainView === 'clients' && (
            <p className="text-sm text-gray-500">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        {mainView === 'clients' && (
          <button
            onClick={() => setShowAddClientModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        )}
      </div>

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

      {/* My Tasks View */}
      {mainView === 'mytasks' && <MyTasksView user={user} />}

      {/* Search - only for clients view */}
      {mainView === 'clients' && (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      )}

      {/* Loading */}
      {mainView === 'clients' && loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading clients...</p>
        </div>
      )}

      {/* Empty State */}
      {mainView === 'clients' && !loading && clients.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Start by adding your first client to track interactions, notes, and contacts in one place.
          </p>
          <button
            onClick={() => setShowAddClientModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Your First Client
          </button>
        </div>
      )}

      {/* Client Cards */}
      {mainView === 'clients' && !loading && clients.length > 0 && (
        <div className="space-y-4">
          {clients.map((client) => {
            // Skip if client doesn't have an ID (shouldn't happen but safety check)
            if (!client.id) {
              console.warn('Client without ID:', client);
              return null;
            }

            const latestNote = getLatestNote(client.id);
            const followUps = getFollowUpCount(client.id);
            const overdueCount = getOverdueCount(client.id);
            const notes = notesMap[client.id] || [];
            const isExpanded = expandedClientId === client.id;

            return (
              <div key={client.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Client Card Header */}
                <button
                  onClick={() => handleClientClick(client)}
                  className="w-full p-5 hover:bg-gray-50 transition-all text-left group"
                >
                  {/* Client Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Building className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {client.name}
                        </h3>
                        {client.company && (
                          <p className="text-sm text-gray-500 truncate">{client.company}</p>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-blue-600 flex-shrink-0 transition-colors" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0 transition-colors" />
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                    {client.industry && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{client.industry}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MessageSquare className="w-4 h-4" />
                      <span>{notes.length} notes</span>
                    </div>
                    {followUps > 0 && (
                      <div className="flex items-center gap-1 text-sm text-blue-600">
                        <Clock className="w-4 h-4" />
                        <span>{followUps} follow-ups</span>
                      </div>
                    )}
                    {overdueCount > 0 && (
                      <div className="flex items-center gap-1 text-sm text-red-600 font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{overdueCount} overdue</span>
                      </div>
                    )}
                  </div>

                  {/* Latest Note Preview - Only show when collapsed */}
                  {!isExpanded && latestNote && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Latest note</p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {latestNote.note}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(latestNote.createdAt)}
                      </p>
                    </div>
                  )}

                  {/* Assigned To */}
                  {client.assignedTo && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>Assigned to {client.assignedTo}</span>
                      </div>
                    </div>
                  )}
                </button>

                {/* Expanded Client Details Section */}
                {isExpanded && expandedClient && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <ClientDetailView
                      client={expandedClient}
                      user={user}
                      usersList={usersList}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      onClose={() => {
                        setExpandedClientId(null);
                        setExpandedClient(null);
                        setActiveTab('notes');
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Add New Client</h3>
                <button
                  onClick={() => setShowAddClientModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      value={clientForm.name}
                      onChange={(e) =>
                        setClientForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ABC Company"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={clientForm.email}
                      onChange={(e) =>
                        setClientForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contact@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={clientForm.phone}
                      onChange={(e) =>
                        setClientForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+91 1234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={clientForm.company}
                      onChange={(e) =>
                        setClientForm((prev) => ({ ...prev, company: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Company Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={clientForm.website}
                      onChange={(e) =>
                        setClientForm((prev) => ({ ...prev, website: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={clientForm.industry}
                      onChange={(e) =>
                        setClientForm((prev) => ({ ...prev, industry: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Technology, Healthcare, etc."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={clientForm.assignedTo}
                    onChange={(e) =>
                      setClientForm((prev) => ({ ...prev, assignedTo: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={user.username}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to assign to yourself
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={clientForm.description}
                    onChange={(e) =>
                      setClientForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Brief description about the client..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddClient}
                  disabled={
                    addingClient || !clientForm.name.trim() || !clientForm.email.trim()
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {addingClient ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Add Client
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline Client Detail View Component
const ClientDetailView = ({ client, user, usersList = [], activeTab, setActiveTab, onClose }) => {
  console.log('[ClientDetailView] usersList received:', usersList?.length, usersList);
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'activities', label: 'Activities', icon: Calendar },
    { id: 'assigned', label: 'Assigned to Me', icon: User }
  ];

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Sidebar - Client Info */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4 sm:space-y-5">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Client Information</h3>
              <div className="space-y-3 sm:space-y-4">
                {client.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Email</p>
                      <a href={`mailto:${client.email}`} className="text-sm text-blue-600 hover:underline break-all">
                        {client.email}
                      </a>
                    </div>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Phone</p>
                      <a href={`tel:${client.phone}`} className="text-sm text-gray-900 hover:text-blue-600">
                        {client.phone}
                      </a>
                    </div>
                  </div>
                )}

                {client.website && (
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Website</p>
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all flex items-center gap-1">
                        {client.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {client.industry && (
                  <div className="flex items-start gap-2">
                    <Building className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Industry</p>
                      <p className="text-sm text-gray-900">{client.industry}</p>
                    </div>
                  </div>
                )}

                {client.assignedTo && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Assigned To</p>
                      <p className="text-sm text-gray-900">{client.assignedTo}</p>
                    </div>
                  </div>
                )}

                {client.createdAt && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm text-gray-900">{formatDate(client.createdAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {client.description && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {activeTab === 'overview' && <OverviewTab client={client} user={user} />}
          {activeTab === 'notes' && <ClientNotesTab clientId={client.id} user={user} usersList={usersList} />}
          {activeTab === 'contacts' && <ClientPOCsTab clientId={client.id} user={user} usersList={usersList} />}
          {activeTab === 'activities' && <ActivitiesTab client={client} user={user} />}
          {activeTab === 'assigned' && <AssignedToMeTab client={client} user={user} />}
        </div>
      </div>
    </div>
  );
};

// Assigned to Me Tab Component (per-client)
const AssignedToMeTab = ({ client, user }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!client?.id || !user?.username) return;
    const token = localStorage.getItem('token');
    fetch(`/api/clients/${client.id}/notes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : { notes: [] })
      .then(data => {
        const assigned = (data.notes || []).filter(n => n.pocName === user.username);
        setNotes(assigned);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [client?.id, user?.username]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filtered = filter === 'all' ? notes : notes.filter(n => n.status === filter);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Assigned to Me ({notes.length})
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          {['all', 'Pending', 'Follow-up', 'Done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No {filter !== 'all' ? filter.toLowerCase() : ''} notes assigned to you for this client</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(note => (
              <div key={note.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                      {note.interactionType}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      note.status === 'Done' ? 'bg-green-100 text-green-800' :
                      note.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>{note.status}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</p>
                  {note.outcome && (
                    <div className="flex items-center gap-1 text-xs text-green-700 mt-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Outcome: {note.outcome}</span>
                    </div>
                  )}
                  {note.blockers && (
                    <div className="flex items-center gap-1 text-xs text-red-700 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Blockers: {note.blockers}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {note.createdBy} &middot; {formatDate(note.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ client, user }) => {
  const [stats, setStats] = useState({ notes: 0, contacts: 0, followUps: 0, overdue: 0 });
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch(`/api/clients/${client.id}/notes`, { headers }).then(r => r.ok ? r.json() : { notes: [] }),
      fetch(`/api/clients/${client.id}/pocs`, { headers }).then(r => r.ok ? r.json() : { pocs: [] })
    ]).then(([notesData, pocsData]) => {
      const notes = notesData.notes || [];
      const pocs = pocsData.pocs || [];
      const followUps = notes.filter(n => n.status === 'Follow-up' || n.nextFollowUp).length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdue = notes.filter(n => {
        if (n.status === 'Done' || !n.nextFollowUp) return false;
        const fd = new Date(n.nextFollowUp);
        fd.setHours(0, 0, 0, 0);
        return fd < today;
      }).length;

      setStats({ notes: notes.length, contacts: pocs.length, followUps, overdue });
      setRecentNotes(notes.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [client?.id]);

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500">Notes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.notes}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500">Contacts</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.contacts}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500">Activities</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.notes + stats.contacts}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-gray-500">Follow-ups</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.followUps}</p>
        </div>
        {stats.overdue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-600 font-medium">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{loading ? '-' : stats.overdue}</p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Recent Notes</h3>
        {loading && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
          </div>
        )}
        {!loading && recentNotes.length === 0 && (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No recent activity</p>
            <p className="text-xs text-gray-400 mt-1">Start by adding notes or contacts</p>
          </div>
        )}
        {!loading && recentNotes.length > 0 && (
          <div className="space-y-3">
            {recentNotes.map(note => (
              <div key={note.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{note.interactionType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      note.status === 'Done' ? 'bg-green-100 text-green-800' :
                      note.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>{note.status}</span>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">{note.note}</p>
                  <p className="text-xs text-gray-400 mt-1">{note.createdBy} &middot; {formatDateTime(note.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Activities Tab Component
const ActivitiesTab = ({ client, user }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch(`/api/clients/${client.id}/notes`, { headers }).then(r => r.ok ? r.json() : { notes: [] }),
      fetch(`/api/clients/${client.id}/pocs`, { headers }).then(r => r.ok ? r.json() : { pocs: [] })
    ]).then(([notesData, pocsData]) => {
      const notes = (notesData.notes || []).map(n => ({ ...n, activityType: 'note' }));
      const pocs = (pocsData.pocs || []).map(p => ({ ...p, activityType: 'contact', createdAt: p.createdAt || p.updatedAt }));

      // Merge and sort by date (newest first)
      const all = [...notes, ...pocs].sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime;
      });

      setActivities(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [client?.id]);

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Activity Timeline ({activities.length})</h3>

        {loading && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
          </div>
        )}

        {!loading && activities.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h4>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Add notes or contacts to see activity here.
            </p>
          </div>
        )}

        {!loading && activities.length > 0 && (
          <div className="space-y-4">
            {activities.map((item, index) => (
              <div key={item.id} className="relative flex gap-3">
                {index < activities.length - 1 && (
                  <div className="absolute left-[18px] top-10 bottom-0 w-px bg-gray-200" />
                )}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                  item.activityType === 'note' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {item.activityType === 'note' ? (
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {item.activityType === 'note' ? `${item.interactionType || 'Note'}` : 'Contact Added'}
                    </span>
                    {item.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.status === 'Done' ? 'bg-green-100 text-green-800' :
                        item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{item.status}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800">
                    {item.activityType === 'note' ? item.note : `${item.name}${item.designation ? ` - ${item.designation}` : ''}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.createdBy || 'System'} &middot; {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// My Tasks View - All notes assigned to current user across all clients
const MyTasksView = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, followUp: 0, done: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  const parseTs = (ts) => {
    if (!ts) return null;
    if (ts._seconds !== undefined) return new Date(ts._seconds * 1000);
    if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDateTime = (ts) => {
    const d = parseTs(ts);
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fetchTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notes/my-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.notes || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error('Failed to fetch my tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const quickUpdateStatus = async (note, newStatus) => {
    setUpdating(note.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/clients/${note.clientId}/notes?noteId=${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, outcome: note.outcome || '', blockers: note.blockers || '' })
      });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === 'all' ? tasks :
    filter === 'overdue' ? tasks.filter(n => {
      if (n.status === 'Done' || !n.nextFollowUp) return false;
      const fd = new Date(n.nextFollowUp); fd.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      return fd < today;
    }) :
    tasks.filter(n => n.status === filter);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'blue', filterVal: 'all' },
          { label: 'Pending', value: stats.pending, color: 'yellow', filterVal: 'Pending' },
          { label: 'Follow-up', value: stats.followUp, color: 'blue', filterVal: 'Follow-up' },
          { label: 'Done', value: stats.done, color: 'green', filterVal: 'Done' },
          { label: 'Overdue', value: stats.overdue, color: 'red', filterVal: 'overdue' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilter(s.filterVal)}
            className={`bg-white border rounded-lg p-3 text-left transition-colors ${filter === s.filterVal ? `border-${s.color}-400 ring-2 ring-${s.color}-100` : 'border-gray-200 hover:border-gray-300'}`}
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold ${s.color === 'red' && s.value > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {loading ? '-' : s.value}
            </p>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            {filter === 'all' ? 'All Tasks' : filter === 'overdue' ? 'Overdue Tasks' : `${filter} Tasks`} ({filtered.length})
          </h3>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {filter === 'all' ? 'No tasks assigned to you' : `No ${filter.toLowerCase()} tasks`}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-gray-100">
            {filtered.map(note => {
              const isOverdue = note.status !== 'Done' && note.nextFollowUp && (() => {
                const fd = new Date(note.nextFollowUp); fd.setHours(0,0,0,0);
                const today = new Date(); today.setHours(0,0,0,0);
                return fd < today;
              })();

              return (
                <div key={note.id} className={`p-4 hover:bg-gray-50 ${isOverdue ? 'bg-red-50/50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {note.clientName}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          note.status === 'Done' ? 'bg-green-100 text-green-800' :
                          note.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>{note.status}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {note.interactionType}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded uppercase">Overdue</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</p>
                      {note.outcome && (
                        <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Outcome: {note.outcome}
                        </p>
                      )}
                      {note.blockers && (
                        <p className="text-xs text-red-700 mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Blockers: {note.blockers}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>Created by {note.createdBy} &middot; {formatDateTime(note.createdAt)}</span>
                        {note.nextFollowUp && (
                          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-blue-600'}>
                            Follow-up: {formatDate(note.nextFollowUp)}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Quick status buttons */}
                    {note.status !== 'Done' && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          onClick={() => quickUpdateStatus(note, 'Done')}
                          disabled={updating === note.id}
                          className="px-2 py-1 text-[10px] font-medium bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                        >
                          {updating === note.id ? '...' : 'Done'}
                        </button>
                        {note.status === 'Pending' && (
                          <button
                            onClick={() => quickUpdateStatus(note, 'Follow-up')}
                            disabled={updating === note.id}
                            className="px-2 py-1 text-[10px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            Follow-up
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientNotesDashboard;
