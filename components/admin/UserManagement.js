/**
 * User Management Component
 * MVC Pattern implementation with consistent UI matching user dashboard
 */

import React, { useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit3,
  Shield,
  Mail,
  Calendar,
  X,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  RefreshCw
} from 'lucide-react';
import useUserManagementStore from '../../hooks/useUserManagement';

const UserManagement = () => {
  // Controller layer - handles all business logic
  const {
    // State
    users,
    loading,
    error,
    success,

    // Modal states
    showCreateModal,
    showEditModal,
    showDeleteModal,
    showResetPasswordModal,

    // Selected data
    userToEdit,
    userToDelete,
    userToResetPassword,

    // Form data
    newUser,
    editUser,
    resetPassword,

    // UI states
    showPassword,
    showEditPassword,
    showResetPassword,

    // Actions
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    refreshUsers,
    clearMessages,

    // Modal actions
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    openResetPasswordModal,
    closeResetPasswordModal,

    // Form updates
    updateNewUser,
    updateEditUser,
    updateResetPassword,

    // Password visibility toggles
    toggleShowPassword,
    toggleShowEditPassword,
    toggleShowResetPassword
  } = useUserManagementStore();

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);


  // Helper functions for role display
  const getRoleIcon = (role) => {
    return role === 'admin' ? (
      <Shield className="w-4 h-4 text-red-600" />
    ) : (
      <Users className="w-4 h-4 text-blue-600" />
    );
  };

  const getRoleBadgeColor = (role) => {
    return role === 'admin'
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex space-x-1">
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Error display component
  const ErrorDisplay = ({ error, onRetry }) => (
    <div className="bg-white border border-gray-100 rounded-lg p-8">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );

  if (loading && users.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error && users.length === 0) {
    return <ErrorDisplay error={error} onRetry={refreshUsers} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black flex items-center space-x-2">
            <Users className="w-6 h-6" />
            <span>User Management</span>
          </h2>
          <p className="text-gray-600 mt-1">Manage system users and their permissions</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-600 text-sm flex-1">{error}</p>
          <button
            onClick={clearMessages}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-600 text-sm flex-1">{success}</p>
          <button
            onClick={clearMessages}
            className="text-green-400 hover:text-green-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-black">All Users ({users.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id || user.username} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                        {user.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-gray-600">
                            {user.username?.charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-black">{user.username || 'Unknown'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span>{user.role || 'user'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-3 h-3" />
                      <span>{user.email || 'No email'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        className="text-gray-600 border border-gray-300 hover:bg-gray-50 px-2 py-1 rounded text-xs"
                        onClick={() => openEditModal(user)}
                        title="Edit user"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        className="text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded text-xs"
                        onClick={() => openResetPasswordModal(user)}
                        title="Reset password"
                      >
                        <Lock className="w-3 h-3" />
                      </button>
                      <button
                        className="text-red-600 border border-red-200 hover:bg-red-50 px-2 py-1 rounded text-xs"
                        onClick={() => openDeleteModal(user)}
                        title="Delete user"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <Users className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500">No users found</p>
                      <button
                        onClick={refreshUsers}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Reload Users
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Create New User</h3>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => updateNewUser({ username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Enter username (min 3 chars)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => updateNewUser({ email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Enter email (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => updateNewUser({ password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black pr-10"
                    placeholder="Enter password (min 6 chars)"
                  />
                  <button
                    type="button"
                    onClick={toggleShowPassword}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => updateNewUser({ role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                disabled={loading}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && userToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Edit User</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Username *</label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={(e) => updateEditUser({ username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Enter username (min 3 chars)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">Email</label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => updateEditUser({ email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Enter email (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  New Password 
                  <span className="text-xs text-gray-500 ml-1">(leave empty to keep current password)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editUser.password}
                    onChange={(e) => updateEditUser({ password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black pr-10"
                    placeholder="Enter new password (min 6 chars) or leave empty"
                  />
                  <button
                    type="button"
                    onClick={toggleShowEditPassword}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">Role</label>
                <select
                  value={editUser.role}
                  onChange={(e) => updateEditUser({ role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  disabled={userToEdit?.username === JSON.parse(localStorage.getItem('user') || '{}').username}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                {userToEdit?.username === JSON.parse(localStorage.getItem('user') || '{}').username && (
                  <p className="text-xs text-gray-500 mt-1">You cannot change your own role</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={updateUser}
                disabled={loading}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Confirm Delete</h3>
              <button
                onClick={closeDeleteModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium text-black">Delete User</h4>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-700">
                Are you sure you want to delete user <strong>{userToDelete.username}</strong>?
                {userToDelete.role === 'admin' && (
                  <span className="block mt-2 text-red-600 font-medium">
                    ⚠️ This user has administrator privileges!
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteUser}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && userToResetPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Reset Password</span>
              </h3>
              <button
                onClick={closeResetPasswordModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-4">
                Set a new password for <strong>{userToResetPassword.username}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetPassword}
                    onChange={(e) => updateResetPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Enter new password (min 6 chars)"
                  />
                  <button
                    type="button"
                    onClick={toggleShowResetPassword}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  The user will need to log in with this new password
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeResetPasswordModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={resetUserPassword}
                disabled={loading || !resetPassword}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? 'Resetting...' : 'Reset Password'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;