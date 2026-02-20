/**
 * Admin Users Dashboard Component
 * MVC Pattern implementation with consistent UI matching user dashboard
 */

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Trash2,
  Shield,
  Mail,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  Activity,
  TrendingUp,
  Clock,
  X
} from 'lucide-react';
import useAdminDashboardStore from '../../hooks/useAdminDashboard';
import Button from '../ui/Button';

const AdminUsersDashboard = ({ user, onUserSelect }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Controller layer - handles all business logic
  const {
    dashboardData,
    loading,
    error,
    refreshData
  } = useAdminDashboardStore();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refreshData} />;
  }

  const users = dashboardData?.users?.all || [];
  const userStats = dashboardData?.users || {};

  // Filter and search users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || getActivityStatus(user) === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const todayDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header - Consistent with user dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-black">User Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage users and monitor their activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {/* TODO: Add new user functionality */}}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </Button>
          <button
            onClick={refreshData}
            disabled={loading}
            className={`p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 ${
              loading ? 'animate-spin' : ''
            }`}
            title="Refresh user data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">{todayDate}</span>
        </div>
      </div>

      {/* User Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={userStats.total || 0}
          icon={Users}
          color="blue"
          subtitle="Registered accounts"
        />
        <StatCard
          title="Active Today"
          value={getActiveUsersToday(users)}
          icon={UserCheck}
          color="green"
          subtitle="Currently active"
        />
        <StatCard
          title="New This Month"
          value={userStats.newThisMonth || 0}
          icon={TrendingUp}
          color="purple"
          subtitle="New registrations"
        />
        <StatCard
          title="Admins"
          value={users.filter(u => u.role === 'admin').length}
          icon={Shield}
          color="orange"
          subtitle="Admin accounts"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Activity className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Users Display */}
      <div className="bg-white border border-gray-100 rounded-lg">
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-black">
              Users ({filteredUsers.length})
            </h3>
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedUsers.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers([])}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          {viewMode === 'grid' ? (
            <UserGridView users={filteredUsers} onUserSelect={onUserSelect} />
          ) : (
            <UserListView users={filteredUsers} onUserSelect={onUserSelect} />
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700 text-sm">{title}</h4>
        <Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[2]}`} />
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      {subtitle && (
        <p className="text-xs text-gray-600">{subtitle}</p>
      )}
    </div>
  );
};

// Grid View Component
const UserGridView = ({ users, onUserSelect }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {users.length > 0 ? (
      users.map((user) => (
        <UserCard key={user.id || user.username} user={user} onSelect={onUserSelect} />
      ))
    ) : (
      <div className="col-span-full text-center py-12">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No users found matching your criteria</p>
      </div>
    )}
  </div>
);

// List View Component
const UserListView = ({ users, onUserSelect }) => (
  <div className="space-y-2">
    {users.length > 0 ? (
      users.map((user) => (
        <UserRow key={user.id || user.username} user={user} onSelect={onUserSelect} />
      ))
    ) : (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No users found matching your criteria</p>
      </div>
    )}
  </div>
);

// User Card Component
const UserCard = ({ user, onSelect }) => {
  const activityStatus = getActivityStatus(user);
  const statusColor = activityStatus === 'active' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
         onClick={() => onSelect && onSelect(user)}>
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-gray-600 font-medium text-lg">
              {user.username?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{user.username}</h4>
          <p className="text-sm text-gray-600 truncate">{user.email || 'No email'}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Role</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            user.role === 'admin'
              ? 'bg-purple-100 text-purple-600'
              : 'bg-blue-100 text-blue-600'
          }`}>
            {user.role || 'user'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Status</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
            {activityStatus}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Joined</span>
          <span className="text-xs text-gray-900">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
};

// User Row Component
const UserRow = ({ user, onSelect }) => {
  const activityStatus = getActivityStatus(user);
  const statusColor = activityStatus === 'active' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
         onClick={() => onSelect && onSelect(user)}>
      <div className="flex items-center space-x-4 flex-1">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-gray-600 font-medium">
              {user.username?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-gray-900">{user.username}</h4>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              user.role === 'admin'
                ? 'bg-purple-100 text-purple-600'
                : 'bg-blue-100 text-blue-600'
            }`}>
              {user.role || 'user'}
            </span>
          </div>
          <p className="text-sm text-gray-600">{user.email || 'No email provided'}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
            {activityStatus}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown date'}
          </div>
        </div>

        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Helper Functions
const getActivityStatus = (user) => {
  // TODO: Implement real activity logic based on last login, task activity, etc.
  const now = new Date();
  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
  const daysSinceCreated = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

  // Simple heuristic: consider users created recently as more likely to be active
  return daysSinceCreated < 30 ? 'active' : 'inactive';
};

const getActiveUsersToday = (users) => {
  // TODO: Implement real logic to check user activity today
  // For now, return a reasonable estimation
  return Math.floor(users.length * 0.3); // Assume 30% are active today
};

// Helper Components
const LoadingSkeleton = () => (
  <div className="space-y-6 p-4">
    <div className="flex items-center justify-between">
      <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
      <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div className="h-5 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-lg bg-white border border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ErrorDisplay = ({ error, onRetry }) => (
  <div className="bg-white border border-red-200 rounded-lg p-6">
    <div className="flex items-center space-x-2 text-red-600 mb-4">
      <AlertCircle className="w-5 h-5" />
      <span className="font-medium">Failed to load user data</span>
    </div>
    <p className="text-gray-600 mb-4">{error}</p>
    <button
      onClick={onRetry}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
    >
      Try Again
    </button>
  </div>
);

export default AdminUsersDashboard;