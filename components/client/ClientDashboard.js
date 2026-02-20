import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  Calendar, 
  FileText, 
  Video, 
  BarChart3,
  Settings,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Button from '../ui/Button';
import ClientUserAssignment from './ClientUserAssignment';
import ClientFileManager from './ClientFileManager';
import ClientCalendar from './ClientCalendar';
import ClientMeetingScheduler from './ClientMeetingScheduler';

const ClientDashboard = ({ client, onBack, currentUser }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [clientData, setClientData] = useState(client);
  const [dashboardStats, setDashboardStats] = useState({});
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  useEffect(() => {
    loadDashboardStats();
  }, [client.id]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Load various stats in parallel
      const [usersResponse, filesResponse, calendarResponse] = await Promise.all([
        fetch(`/api/clients/${client.id}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ json: () => ({ success: false }) })),
        
        fetch(`/api/clients/${client.id}/files`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ json: () => ({ success: false }) })),
        
        fetch(`/api/clients/${client.id}/calendar`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ json: () => ({ success: false }) }))
      ]);

      const [usersData, filesData, calendarData] = await Promise.all([
        usersResponse.json(),
        filesResponse.json(),
        calendarResponse.json()
      ]);

      setDashboardStats({
        assignedUsers: usersData.success ? usersData.assignedUsers?.length || 0 : 0,
        totalFiles: filesData.success ? filesData.summary?.totalFiles || 0 : 0,
        totalSize: filesData.success ? filesData.summary?.totalSize || 0 : 0,
        upcomingEvents: calendarData.success ? calendarData.summary?.upcomingEvents || 0 : 0,
        todayEvents: calendarData.success ? calendarData.summary?.todayEvents || 0 : 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDataUpdate = () => {
    loadDashboardStats();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Client Info Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-black rounded-lg">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black">{clientData.name}</h2>
              <p className="text-gray-600">{clientData.industry}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`px-3 py-1 text-sm font-medium border rounded-full ${getStatusColor(clientData.status)}`}>
                  {clientData.status}
                </span>
                <span className={`px-3 py-1 text-sm font-medium border rounded-full ${getPriorityColor(clientData.priority)}`}>
                  {clientData.priority} Priority
                </span>
              </div>
            </div>
          </div>
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Clients</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assigned Users</p>
              <p className="text-2xl font-bold text-black">{dashboardStats.assignedUsers}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-black">{dashboardStats.totalFiles}</p>
              <p className="text-xs text-gray-500">{formatFileSize(dashboardStats.totalSize)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Events</p>
              <p className="text-2xl font-bold text-black">{dashboardStats.todayEvents}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming Events</p>
              <p className="text-2xl font-bold text-black">{dashboardStats.upcomingEvents}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Client Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Contact Information</h3>
          <div className="space-y-4">
            {clientData.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">{clientData.email}</span>
              </div>
            )}
            {clientData.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">{clientData.phone}</span>
              </div>
            )}
            {clientData.website && (
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <a href={clientData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                  {clientData.website}
                </a>
              </div>
            )}
            {clientData.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <span className="text-gray-600">{clientData.address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Project Details</h3>
          <div className="space-y-4">
            {clientData.contractValue && (
              <div>
                <p className="text-sm text-gray-600">Contract Value</p>
                <p className="text-lg font-medium text-black">${clientData.contractValue}</p>
              </div>
            )}
            {clientData.contractStart && (
              <div>
                <p className="text-sm text-gray-600">Contract Period</p>
                <p className="text-gray-600">
                  {new Date(clientData.contractStart).toLocaleDateString()} - 
                  {clientData.contractEnd ? new Date(clientData.contractEnd).toLocaleDateString() : 'Ongoing'}
                </p>
              </div>
            )}
            {clientData.timezone && (
              <div>
                <p className="text-sm text-gray-600">Timezone</p>
                <p className="text-gray-600">{clientData.timezone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Task Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-black">{clientData.totalTasks || 0}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{clientData.completedTasks || 0}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{clientData.pendingTasks || 0}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{clientData.overdueTasks || 0}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
        </div>
      </div>

      {/* Description */}
      {clientData.description && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Description</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{clientData.description}</p>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'users':
        return (
          <ClientUserAssignment 
            clientId={client.id} 
            clientName={client.name}
            onUpdate={handleDataUpdate}
          />
        );
      case 'calendar':
        return (
          <ClientCalendar 
            clientId={client.id} 
            clientName={client.name}
            onUpdate={handleDataUpdate}
          />
        );
      case 'meetings':
        return (
          <ClientMeetingScheduler 
            clientId={client.id} 
            clientName={client.name}
            onUpdate={handleDataUpdate}
          />
        );
      case 'files':
        return (
          <ClientFileManager 
            clientId={client.id} 
            clientName={client.name}
            onUpdate={handleDataUpdate}
            currentUser={currentUser}
          />
        );
      case 'settings':
        return (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Client Settings</h3>
            <p className="text-gray-600">Client settings and configuration options will be available here.</p>
          </div>
        );
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;