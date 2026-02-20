/**
 * Duplicate Task Manager Component
 * MVC Pattern implementation with consistent UI matching user dashboard
 */

import React, { useEffect } from 'react';
import Button from '../ui/Button';
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  CheckCircle,
  Search,
  AlertCircle
} from 'lucide-react';
import useDuplicateTaskManagerStore from '../../hooks/useDuplicateTaskManager';

const DuplicateTaskManager = ({ currentUser }) => {
  // Controller layer - handles all business logic
  const {
    // State
    loading,
    cleaning,
    message,

    // Actions
    loadStats,
    cleanupDuplicates,
    refreshStats,
    clearMessage,
    getSummary,
    getStatusBadgeColor
  } = useDuplicateTaskManagerStore();

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Handle cleanup with confirmation
  const handleCleanupDuplicates = async () => {
    if (!window.confirm('Are you sure you want to clean up duplicate tasks? This action cannot be undone.')) {
      return;
    }

    await cleanupDuplicates();
  };

  // Get summary data from the hook
  const summary = getSummary();

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading duplicate task statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span>Duplicate Task Management</span>
        </h3>
        <Button
          onClick={refreshStats}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            message.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {message.text}
          </span>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-black">{summary.totalTasks}</div>
          <div className="text-sm text-gray-600">Total Tasks</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-black">{summary.uniqueTasks}</div>
          <div className="text-sm text-gray-600">Unique Tasks</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">{summary.duplicateGroups}</div>
          <div className="text-sm text-amber-700">Duplicate Groups</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{summary.totalDuplicates}</div>
          <div className="text-sm text-red-700">Total Duplicates</div>
        </div>
      </div>

      {/* Duplicate Details */}
      {summary.duplicateDetails && summary.duplicateDetails.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-black mb-3">Duplicate Task Details</h4>
          <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {summary.duplicateDetails.map((detail, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded p-3 border">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-black">{detail.taskName}</div>
                    <div className="text-xs text-gray-500">
                      Assigned to: {detail.assignedTo} • {detail.count} duplicates
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {detail.statuses.map((status, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(status)}`}
                      >
                        {status}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {summary.hasDuplicates
            ? `${summary.totalDuplicates} duplicate tasks found that can be cleaned up`
            : 'No duplicate tasks found'
          }
        </div>
        
        {summary.hasDuplicates && (
          <Button
            onClick={handleCleanupDuplicates}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
            disabled={cleaning}
          >
            {cleaning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Cleaning up...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Clean Up Duplicates</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">How Duplicate Cleanup Works:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Identifies tasks with identical content, assignee, client, deadline, and assigner</li>
          <li>• For pending duplicates: keeps the most recent task, deletes others</li>
          <li>• For completed duplicates: keeps the first completed task, deletes others</li>
          <li>• All deletions are logged for audit purposes</li>
        </ul>
      </div>
    </div>
  );
};

export default DuplicateTaskManager;