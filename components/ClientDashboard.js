import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building, Mail, Phone, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import Button from './ui/Button';

const SimpleClientDashboard = ({ client, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  // Safety check for client prop
  if (!client) {
    console.error('SimpleClientDashboard: No client prop provided');
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">No Client Selected</h1>
        </div>
        
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-red-600">Error: No client data provided</p>
          <Button onClick={onBack} className="mt-4">Return to Client List</Button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    console.log('SimpleClientDashboard mounted for:', client?.name);
    
    // Simple initialization
    setTimeout(() => {
      setTasks([
        {
          id: 1,
          task: `Sample task for ${client?.name || 'client'}`,
          status: 'pending',
          deadline: '2024-01-15',
          priority: 'Medium'
        }
      ]);
      setLoading(false);
      console.log('Dashboard loaded successfully');
    }, 1000);
  }, [client]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{client?.name || 'Client'}</h1>
        </div>
        
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button onClick={onBack} variant="outline" size="sm" className="flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clients</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-black">{client?.name}</h1>
          <p className="text-gray-600">{client?.industry} • {client?.status}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Simple Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Client Information</h3>
            <div className="space-y-3">
              {client?.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{client.email}</span>
                </div>
              )}
              {client?.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{client.phone}</span>
                </div>
              )}
              <div className="pt-4">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Industry</span>
                <p className="text-sm font-medium text-black">{client?.industry || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-black mb-4">Recent Tasks</h3>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">{task.task}</p>
                    <p className="text-xs text-gray-500">Due: {task.deadline}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 rounded">
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Tasks</span>
                <span className="text-lg font-bold text-black">{tasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded border ${
                  client?.status === 'Active' 
                    ? 'text-green-600 bg-green-50 border-green-200'
                    : 'text-gray-600 bg-gray-50 border-gray-200'
                }`}>
                  {client?.status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Schedule Meeting
              </Button>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                Create Task
              </Button>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                Upload File
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Information</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Client ID: {client?.id}</div>
          <div>Client Name: {client?.name}</div>
          <div>Tasks Loaded: {tasks.length}</div>
          <div>Dashboard Status: Working ✅</div>
        </div>
      </div>
    </div>
  );
};

export default SimpleClientDashboard;