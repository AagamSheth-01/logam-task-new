import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock, 
  BarChart3, 
  PieChart, 
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit3,
  Trash2,
  Filter,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react';
import Button from './ui/Button';
import UserSelector from './users/UserSelector';

const DailyTaskAnalytics = ({ currentUser }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('analytics'); // 'analytics' or 'entries'
  const [dailyEntries, setDailyEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General Work' },
    { value: 'development', label: 'Development' },
    { value: 'design', label: 'Design' },
    { value: 'meeting', label: 'Meetings' },
    { value: 'research', label: 'Research' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'testing', label: 'Testing & QA' },
    { value: 'support', label: 'Support' },
    { value: 'client-work', label: 'Client Work' },
    { value: 'admin', label: 'Administrative' }
  ];

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    } else {
      loadPersonalAnalytics();
    }
  }, [dateRange, selectedUsers, isAdmin]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const params = new URLSearchParams({
        analytics: 'true',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      if (selectedUsers.length > 0) {
        params.append('users', selectedUsers.map(u => u.username).join(','));
      }

      const response = await fetch(`/api/daily-tasks?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.analytics);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Network error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await fetch(`/api/daily-tasks?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Convert personal data to analytics format
        const personalAnalytics = {
          totalHours: data.stats?.totalHours || 0,
          totalTasks: data.stats?.totalTasks || 0,
          uniqueUsers: 1,
          averageHoursPerDay: data.stats?.averageHoursPerDay || 0,
          categoryBreakdown: data.stats?.categoryBreakdown || {},
          userStats: {
            [currentUser.username]: {
              totalHours: data.stats?.totalHours || 0,
              totalTasks: data.stats?.totalTasks || 0,
              averageHoursPerDay: data.stats?.averageHoursPerDay || 0,
              tasksByCategory: data.stats?.categoryBreakdown || {},
              daysCounted: data.dailyTasks?.length || 0
            }
          },
          dateRange: {
            start: dateRange.startDate,
            end: dateRange.endDate
          }
        };

        setAnalyticsData(personalAnalytics);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load personal analytics');
      }
    } catch (error) {
      console.error('Error loading personal analytics:', error);
      setError('Network error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyEntries = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const params = new URLSearchParams({
        allUsers: isAdmin ? 'true' : 'false',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      if (selectedUsers.length > 0 && isAdmin) {
        params.append('users', selectedUsers.map(u => u.username).join(','));
      }

      const response = await fetch(`/api/daily-tasks?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDailyEntries(data.dailyTasks || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load daily entries');
      }
    } catch (error) {
      console.error('Error loading daily entries:', error);
      setError('Network error loading daily entries');
    } finally {
      setLoading(false);
    }
  };

  const deleteDailyEntry = async (entry) => {
    if (!window.confirm(`Are you sure you want to delete the daily entry for ${entry.username} on ${entry.date}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/daily-tasks?date=${entry.date}&user=${entry.username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setDailyEntries(prev => prev.filter(e => !(e.date === entry.date && e.username === entry.username)));
        alert('Daily entry deleted successfully');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Network error deleting entry');
    }
  };

  const formatTime = (hours) => {
    if (hours === 0) return '0h';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  const exportData = () => {
    if (!analyticsData) return;

    const exportData = {
      dateRange: `${dateRange.startDate} to ${dateRange.endDate}`,
      summary: {
        totalHours: analyticsData.totalHours,
        totalTasks: analyticsData.totalTasks,
        uniqueUsers: analyticsData.uniqueUsers,
        averageHoursPerDay: analyticsData.averageHoursPerDay
      },
      userStats: analyticsData.userStats,
      categoryBreakdown: analyticsData.categoryBreakdown
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-task-analytics-${dateRange.startDate}-${dateRange.endDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleUserExpansion = (username) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  const filteredEntries = dailyEntries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tasks?.some(task => 
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesCategory = categoryFilter === 'all' || 
      entry.tasks?.some(task => task.category === categoryFilter);
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case 'user':
        aValue = a.username;
        bValue = b.username;
        break;
      case 'hours':
        aValue = a.totalHours || 0;
        bValue = b.totalHours || 0;
        break;
      case 'tasks':
        aValue = a.tasks?.length || 0;
        bValue = b.tasks?.length || 0;
        break;
      default:
        aValue = a.date;
        bValue = b.date;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isAdmin ? 'Team Analytics' : 'Personal Analytics'}
                </h2>
                <p className="text-gray-600">
                  {isAdmin ? 'Daily task analytics and insights' : 'Your productivity insights'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>
              
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setViewMode('analytics')}
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'analytics' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => {
                    setViewMode('entries');
                    if (dailyEntries.length === 0) {
                      loadDailyEntries();
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'entries' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Entries
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Users
                  </label>
                  <UserSelector
                    selectedUsers={selectedUsers}
                    onSelectionChange={setSelectedUsers}
                    allowMultiple={true}
                    placeholder="All users"
                    showAddUser={false}
                  />
                </div>
              )}
              
              <div className="flex items-end space-x-2">
                <Button
                  onClick={viewMode === 'analytics' ? (isAdmin ? loadAnalytics : loadPersonalAnalytics) : loadDailyEntries}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </Button>
                
                {analyticsData && (
                  <Button
                    onClick={exportData}
                    variant="outline"
                    className="flex items-center space-x-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analytics View */}
      {viewMode === 'analytics' && analyticsData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(analyticsData.totalHours)}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.totalTasks}</p>
                </div>
                <FileText className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {isAdmin ? 'Active Users' : 'Avg Hours/Day'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isAdmin ? analyticsData.uniqueUsers : formatTime(analyticsData.averageHoursPerDay)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Productivity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.totalHours > 0 ? (analyticsData.totalTasks / analyticsData.totalHours).toFixed(1) : '0'}/hr
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {analyticsData.categoryBreakdown && Object.keys(analyticsData.categoryBreakdown).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(analyticsData.categoryBreakdown).map(([category, hours]) => {
                    const categoryInfo = categories.find(c => c.value === category);
                    return (
                      <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">
                          {categoryInfo?.label || category}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {formatTime(hours)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* User Stats */}
          {analyticsData.userStats && isAdmin && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">User Performance</h3>
                <div className="space-y-4">
                  {Object.entries(analyticsData.userStats).map(([username, stats]) => (
                    <div key={username} className="border border-gray-200 rounded-lg">
                      <div className="p-4">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleUserExpansion(username)}>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{username}</p>
                              <p className="text-sm text-gray-600">
                                {formatTime(stats.totalHours)} • {stats.totalTasks} tasks
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {formatTime(stats.averageHoursPerDay)}/day
                            </span>
                            {expandedUsers.has(username) ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        {expandedUsers.has(username) && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-gray-500">Total Hours</p>
                                <p className="font-medium">{formatTime(stats.totalHours)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Total Tasks</p>
                                <p className="font-medium">{stats.totalTasks}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Avg Hours/Day</p>
                                <p className="font-medium">{formatTime(stats.averageHoursPerDay)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Days Active</p>
                                <p className="font-medium">{stats.daysCounted}</p>
                              </div>
                            </div>
                            
                            {stats.tasksByCategory && (
                              <div className="mt-4">
                                <p className="text-xs text-gray-500 mb-2">Categories</p>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(stats.tasksByCategory).map(([category, hours]) => (
                                    <span key={category} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                      {category}: {formatTime(hours)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entries View */}
      {viewMode === 'entries' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Daily Entries</h3>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="date-desc">Date (Newest)</option>
                  <option value="date-asc">Date (Oldest)</option>
                  <option value="user-asc">User (A-Z)</option>
                  <option value="user-desc">User (Z-A)</option>
                  <option value="hours-desc">Hours (Most)</option>
                  <option value="hours-asc">Hours (Least)</option>
                  <option value="tasks-desc">Tasks (Most)</option>
                  <option value="tasks-asc">Tasks (Least)</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <div key={`${entry.username}-${entry.date}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{entry.username}</p>
                        <p className="text-sm text-gray-600">{entry.date}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatTime(entry.totalHours || 0)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {entry.tasks?.length || 0} tasks
                        </p>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 text-gray-400 hover:text-red-600"
                            onClick={() => deleteDailyEntry(entry)}
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      
                    </div>
                  </div>
                  
                  {entry.tasks && entry.tasks.length > 0 && (
                    <div className="space-y-2">
                      {entry.tasks.map((task, index) => (
                        <div key={index} className="bg-gray-50 rounded-md p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-900">{task.description}</p>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {task.category}
                              </span>
                              <span className="text-xs text-gray-600">
                                {formatTime(task.timeSpent)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {entry.notes && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                      <p className="text-sm text-gray-700">{entry.notes}</p>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredEntries.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No entries found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTaskAnalytics;