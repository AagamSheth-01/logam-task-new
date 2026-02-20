// components/users/UserSelector.js - Updated to work with existing API structure
import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  User,
  Crown,
  Code,
  Palette,
  Settings,
  Check,
  X,
  Mail,
  Phone,
  UserPlus,
  Eye,
  EyeOff
} from 'lucide-react';
import Button from '../ui/Button';

const UserSelector = ({ 
  selectedUsers = [], 
  onSelectionChange, 
  allowMultiple = false, 
  showAddUser = true,
  placeholder = "Select users...",
  className = ""
}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [addingUser, setAddingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users loaded:', data);
        setUsers(data.users || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load users:', errorData);
        setError(errorData.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Network error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (user) => {
    if (allowMultiple) {
      const isSelected = selectedUsers.some(u => u.username === user.username);
      let newSelection;
      
      if (isSelected) {
        newSelection = selectedUsers.filter(u => u.username !== user.username);
      } else {
        newSelection = [...selectedUsers, user];
      }
      
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([user]);
      setShowDropdown(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setAddingUser(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: newUser.username.trim(),
          email: newUser.email.trim(),
          password: newUser.password,
          role: newUser.role
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const createdUser = data.user;
        
        // Add to users list
        setUsers(prev => [createdUser, ...prev]);
        
        // Auto-select the new user
        if (allowMultiple) {
          onSelectionChange([...selectedUsers, createdUser]);
        } else {
          onSelectionChange([createdUser]);
        }
        
        // Reset form and close modal
        setNewUser({ username: '', email: '', password: '', role: 'user' });
        setShowAddUserModal(false);
        setShowDropdown(false);
        
        alert('User created successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Network error. Please try again.');
    } finally {
      setAddingUser(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return <Crown className="w-4 h-4 text-red-600" />;
      case 'developer': return <Code className="w-4 h-4 text-blue-600" />;
      case 'designer': return <Palette className="w-4 h-4 text-purple-600" />;
      case 'manager': return <Settings className="w-4 h-4 text-green-600" />;
      default: return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'developer': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'designer': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDisplayText = () => {
    if (selectedUsers.length === 0) return placeholder;
    if (selectedUsers.length === 1) return selectedUsers[0].username;
    return `${selectedUsers.length} users selected`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selection Display */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white text-left flex items-center justify-between"
      >
        <span className={selectedUsers.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
          {getDisplayText()}
        </span>
        <Users className="w-4 h-4 text-gray-400" />
      </button>

      {/* Selected Users Display */}
      {selectedUsers.length > 0 && allowMultiple && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedUsers.map((user, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800 space-x-2"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 border border-blue-300 flex items-center justify-center flex-shrink-0">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-700">
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span>{user.username}</span>
              <button
                type="button"
                onClick={() => handleUserToggle(user)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Add New User Button - Only show for admins */}
          {showAddUser && (
            <div className="p-2 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setShowAddUserModal(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50 rounded transition-colors text-blue-600"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium">Add New User</span>
              </button>
            </div>
          )}

          {/* Users List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading users...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <div className="text-red-600 text-sm">{error}</div>
                <button
                  onClick={loadUsers}
                  className="mt-2 text-blue-600 text-sm hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="py-2">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.some(u => u.username === user.username);
                  
                  return (
                    <button
                      key={user.id || user.username}
                      type="button"
                      onClick={() => handleUserToggle(user)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">
                              {user.username?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{user.username}</p>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${getRoleColor(user.role)}`}>
                              {getRoleIcon(user.role)}
                              <span className="ml-1">{user.role || 'user'}</span>
                            </span>
                            {user.email && (
                              <span className="text-xs text-gray-500 truncate">{user.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No users found</p>
                {searchTerm && (
                  <p className="text-xs">Try a different search term</p>
                )}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="p-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDropdown(false)}
              className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
                  <UserPlus className="w-5 h-5" />
                  <span>Add New User</span>
                </h3>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="user@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  onClick={() => setShowAddUserModal(false)}
                  variant="outline"
                  className="text-gray-600 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={addingUser}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
                >
                  {addingUser ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>{addingUser ? 'Creating...' : 'Create User'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};




export default UserSelector;