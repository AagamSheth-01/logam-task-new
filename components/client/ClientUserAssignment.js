import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  X, 
  Check, 
  AlertCircle, 
  UserPlus,
  Crown,
  Eye,
  Edit3,
  Trash2,
  Mail,
  Shield
} from 'lucide-react';
import Button from '../ui/Button';

const ClientUserAssignment = ({ clientId, clientName, onUpdate = null }) => {
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('secondary');
  const [selectedPermissions, setSelectedPermissions] = useState(['view']);
  const [searchTerm, setSearchTerm] = useState('');

  const roles = [
    { value: 'primary', label: 'Primary', icon: Crown, color: 'text-yellow-600' },
    { value: 'secondary', label: 'Secondary', icon: Users, color: 'text-blue-600' },
    { value: 'viewer', label: 'Viewer', icon: Eye, color: 'text-gray-600' }
  ];

  const permissions = [
    { value: 'view', label: 'View', description: 'Can view client information' },
    { value: 'edit', label: 'Edit', description: 'Can edit client details' },
    { value: 'files', label: 'Files', description: 'Can manage client files' },
    { value: 'calendar', label: 'Calendar', description: 'Can manage calendar events' },
    { value: 'meetings', label: 'Meetings', description: 'Can schedule meetings' }
  ];

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      
      // Load assigned users and available users in parallel
      const [assignedResponse, usersResponse] = await Promise.all([
        fetch(`/api/clients/${clientId}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const assignedData = await assignedResponse.json();
      const usersData = await usersResponse.json();

      if (assignedData.success) {
        setAssignedUsers(assignedData.assignedUsers || []);
      } else {
        setError(assignedData.message || 'Failed to load assigned users');
      }

      if (usersData.success) {
        setAvailableUsers(usersData.users || []);
      } else {
        console.warn('Failed to load available users');
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to assign');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usernames: selectedUsers,
          role: selectedRole,
          permissions: selectedPermissions
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Successfully assigned ${data.assignedUsers.length} user(s) to ${clientName}`);
        setShowAssignModal(false);
        setSelectedUsers([]);
        setSelectedRole('secondary');
        setSelectedPermissions(['view']);
        await loadData();
        
        if (onUpdate) {
          onUpdate();
        }

        // Show warnings if any
        if (data.warnings && data.warnings.length > 0) {
          setError(`Assignment completed with warnings: ${data.warnings.join(', ')}`);
        }

        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.message || 'Failed to assign users');
      }
    } catch (error) {
      console.error('Error assigning users:', error);
      setError('Failed to assign users');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (username) => {
    if (!confirm(`Are you sure you want to remove ${username} from this client?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/users?username=${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Successfully removed ${username} from ${clientName}`);
        await loadData();
        
        if (onUpdate) {
          onUpdate();
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      setError('Failed to remove user');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const roleConfig = roles.find(r => r.value === role);
    if (!roleConfig) return Users;
    return roleConfig.icon;
  };

  const getRoleColor = (role) => {
    const roleConfig = roles.find(r => r.value === role);
    if (!roleConfig) return 'text-gray-600';
    return roleConfig.color;
  };

  const getPermissionBadgeColor = (permission) => {
    const colors = {
      view: 'bg-blue-100 text-blue-800',
      edit: 'bg-green-100 text-green-800',
      files: 'bg-purple-100 text-purple-800',
      calendar: 'bg-orange-100 text-orange-800',
      meetings: 'bg-red-100 text-red-800'
    };
    return colors[permission] || 'bg-gray-100 text-gray-800';
  };

  const filteredAvailableUsers = availableUsers.filter(user => {
    const isAlreadyAssigned = assignedUsers.some(assigned => assigned.username === user.username);
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return !isAlreadyAssigned && matchesSearch;
  });

  if (loading && assignedUsers.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Assigned Users</span>
          <span className="text-sm font-normal text-gray-500">({assignedUsers.length})</span>
        </h3>
        <Button
          onClick={() => setShowAssignModal(true)}
          className="bg-black hover:bg-gray-800 flex items-center space-x-2"
          size="sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Assign Users</span>
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

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-600">{success}</p>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Assigned Users List */}
      {assignedUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignedUsers.map((userAssignment) => {
            const RoleIcon = getRoleIcon(userAssignment.role);
            return (
              <div key={userAssignment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full bg-gray-100 ${getRoleColor(userAssignment.role)}`}>
                      <RoleIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-black">{userAssignment.username}</h4>
                      <p className="text-sm text-gray-500">{userAssignment.userDetails?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveUser(userAssignment.username)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    title="Remove user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Role:</span>
                    <span className={`text-sm font-medium ${getRoleColor(userAssignment.role)}`}>
                      {userAssignment.role}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-600">Permissions:</span>
                    <div className="flex flex-wrap gap-1">
                      {(userAssignment.permissions || []).map((permission) => (
                        <span
                          key={permission}
                          className={`px-2 py-1 text-xs font-medium rounded ${getPermissionBadgeColor(permission)}`}
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Assigned by: {userAssignment.assignedBy}</span>
                      <span>
                        {new Date(userAssignment.assignedAt?.seconds * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No users assigned to this client yet</p>
          <p className="text-sm text-gray-400">Click "Assign Users" to get started</p>
        </div>
      )}

      {/* Assign Users Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-black">Assign Users to {clientName}</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-3">Select Role</label>
                <div className="grid grid-cols-3 gap-3">
                  {roles.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <button
                        key={role.value}
                        onClick={() => setSelectedRole(role.value)}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          selectedRole === role.value
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <RoleIcon className="w-4 h-4" />
                          <span className="font-medium">{role.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permissions Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-3">Select Permissions</label>
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <label key={permission.value} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, permission.value]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(p => p !== permission.value));
                          }
                        }}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium text-black">{permission.label}</span>
                        <p className="text-sm text-gray-500">{permission.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* User Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-2">Search Users</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black w-full"
                  />
                </div>
              </div>

              {/* User Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-3">
                  Select Users ({selectedUsers.length} selected)
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredAvailableUsers.length > 0 ? (
                    filteredAvailableUsers.map((user) => (
                      <label key={user.username} className="flex items-center space-x-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.username)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.username]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(u => u !== user.username));
                            }
                          }}
                        />
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-full bg-gray-100">
                            <Users className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <span className="font-medium text-black">{user.username}</span>
                            <p className="text-sm text-gray-500 flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{user.email}</span>
                            </p>
                            <p className="text-xs text-gray-400 flex items-center space-x-1">
                              <Shield className="w-3 h-3" />
                              <span>Role: {user.role}</span>
                            </p>
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {searchTerm ? 'No users found matching your search' : 'No available users to assign'}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowAssignModal(false)}
                  variant="outline"
                  className="text-gray-600 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignUsers}
                  disabled={selectedUsers.length === 0 || loading}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  {loading ? 'Assigning...' : `Assign ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientUserAssignment;