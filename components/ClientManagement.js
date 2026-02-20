import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Calendar,
  FileText,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Save
} from 'lucide-react';
import Button from './ui/Button';

const ClientManagement = ({ onClientSelect = null }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    industry: '',
    status: 'Active',
    priority: 'Medium',
    description: '',
    contractValue: '',
    contractStart: '',
    contractEnd: '',
    timezone: '',
    preferredContact: 'email',
    tags: [],
    notes: ''
  });

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Retail',
    'Manufacturing', 'Real Estate', 'Consulting', 'Marketing', 'Other'
  ];

  const statuses = ['Active', 'Inactive', 'Prospect', 'On Hold'];
  const priorities = ['High', 'Medium', 'Low'];
  const contactMethods = ['email', 'phone', 'video', 'in-person'];

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setClients(data.clients);
      } else {
        setError(data.message || 'Failed to load clients');
      }
    } catch (error) {
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    try {
      if (!newClient.name || !newClient.email) {
        setError('Client name and email are required');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newClient)
      });

      const data = await response.json();
      if (data.success) {
        setClients(prev => [data.client, ...prev]);
        setNewClient({
          name: '', email: '', phone: '', website: '', address: '', industry: '',
          status: 'Active', priority: 'Medium', description: '', contractValue: '',
          contractStart: '', contractEnd: '', timezone: '', preferredContact: 'email',
          tags: [], notes: ''
        });
        setShowAddModal(false);
        setSuccessMessage('Client added successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to add client');
      }
    } catch (error) {
      setError('Failed to add client');
    }
  };

  const handleUpdateClient = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingClient)
      });

      const data = await response.json();
      if (data.success) {
        setClients(prev => prev.map(c => c.id === editingClient.id ? editingClient : c));
        setEditingClient(null);
        setSuccessMessage('Client updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to update client');
      }
    } catch (error) {
      setError('Failed to update client');
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setClients(prev => prev.filter(c => c.id !== clientId));
        setSuccessMessage('Client deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to delete client');
      }
    } catch (error) {
      setError('Failed to delete client');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Active: 'text-green-600 bg-green-50 border-green-200',
      Inactive: 'text-gray-600 bg-gray-50 border-gray-200',
      Prospect: 'text-blue-600 bg-blue-50 border-blue-200',
      'On Hold': 'text-orange-600 bg-orange-50 border-orange-200'
    };
    return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      High: 'text-red-600 bg-red-50 border-red-200',
      Medium: 'text-amber-600 bg-amber-50 border-amber-200',
      Low: 'text-green-600 bg-green-50 border-green-200'
    };
    return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-black flex items-center space-x-2">
          <Building className="w-6 h-6" />
          <span>Client Management</span>
        </h2>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-black hover:bg-gray-800 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-600">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-600">{successMessage}</p>
          <button onClick={() => setSuccessMessage('')} className="ml-auto text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black w-full"
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black appearance-none bg-white"
            >
              <option value="all">All Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <Button
            onClick={loadClients}
            variant="outline"
            size="sm"
            className="text-gray-600 border-gray-300"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black truncate">{client.name}</h3>
                <p className="text-sm text-gray-500">{client.industry}</p>
              </div>
              <div className="flex items-center space-x-1">
                <span className={`px-2 py-1 text-xs font-medium border rounded ${getStatusColor(client.status)}`}>
                  {client.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="truncate">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.website && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4" />
                  <span className="truncate">{client.website}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-lg font-bold text-black">{client.totalTasks || 0}</div>
                <div className="text-xs text-gray-500">Tasks</div>
              </div>
              <div className="bg-green-50 rounded p-2">
                <div className="text-lg font-bold text-green-600">{client.completedTasks || 0}</div>
                <div className="text-xs text-gray-500">Done</div>
              </div>
              <div className="bg-amber-50 rounded p-2">
                <div className="text-lg font-bold text-amber-600">{client.pendingTasks || 0}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {onClientSelect ? (
                <Button
                  onClick={() => {
                    console.log('Dashboard button clicked for client:', client);
                    console.log('Client data being passed:', JSON.stringify(client, null, 2));
                    onClientSelect(client);
                  }}
                  size="sm"
                  className="flex-1 bg-black hover:bg-gray-800 text-white flex items-center justify-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Dashboard</span>
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    // You can add a default action here, like showing a modal or navigating
                    console.log('View client:', client.name);
                    alert(`Viewing client: ${client.name}\n\nTo access client dashboard, use the "Client Dashboards" tab.`);
                  }}
                  size="sm"
                  className="flex-1 bg-black hover:bg-gray-800 text-white flex items-center justify-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>View</span>
                </Button>
              )}
              <Button
                onClick={() => setEditingClient(client)}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => handleDeleteClient(client.id)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No clients found</p>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-black">Add New Client</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Enter client name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Website</label>
                  <input
                    type="url"
                    value={newClient.website}
                    onChange={(e) => setNewClient({...newClient, website: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Enter website URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Industry</label>
                  <select
                    value={newClient.industry}
                    onChange={(e) => setNewClient({...newClient, industry: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value="">Select industry</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Status</label>
                  <select
                    value={newClient.status}
                    onChange={(e) => setNewClient({...newClient, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  >
                    {statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-2">Address</label>
                  <textarea
                    value={newClient.address}
                    onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    rows={2}
                    placeholder="Enter address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-2">Description</label>
                  <textarea
                    value={newClient.description}
                    onChange={(e) => setNewClient({...newClient, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    rows={3}
                    placeholder="Enter client description"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  onClick={() => setShowAddModal(false)}
                  variant="outline"
                  className="text-gray-600 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddClient}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Add Client
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-black">Edit Client</h3>
                <button
                  onClick={() => setEditingClient(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={editingClient.name}
                    onChange={(e) => setEditingClient({...editingClient, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editingClient.email}
                    onChange={(e) => setEditingClient({...editingClient, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Phone</label>
                  <input
                    type="tel"
                    value={editingClient.phone}
                    onChange={(e) => setEditingClient({...editingClient, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Status</label>
                  <select
                    value={editingClient.status}
                    onChange={(e) => setEditingClient({...editingClient, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  >
                    {statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  onClick={() => setEditingClient(null)}
                  variant="outline"
                  className="text-gray-600 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateClient}
                  className="bg-black hover:bg-gray-800 text-white flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;