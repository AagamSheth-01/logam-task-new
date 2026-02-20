/**
 * Task Assignment Dashboard Component - View Layer
 * MVC Pattern implementation with consistent UI/UX design
 */

import React, { useRef, useEffect } from 'react';
import {
  UserPlus,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Flag,
  Calendar,
  FileText,
  RefreshCw,
  Search
} from 'lucide-react';
import Button from '../ui/Button';
import useTaskAssignment from '../../hooks/useTaskAssignment';

const TaskAssignmentDashboard = ({ user }) => {
  const customClientInputRef = useRef(null);

  // Early return if no user to prevent hook issues
  if (!user?.username) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Please log in to assign tasks</p>
        </div>
      </div>
    );
  }

  // Controller layer - handles all business logic
  const {
    formData,
    users,
    clientList,
    loading,
    submitting,
    error,
    success,
    updateFormField,
    handleClientChange,
    submitTask,
    resetForm,
    getCharacterCount,
    isCharacterLimitExceeded,
    getClientSuggestions,
    applySuggestion,
    formatClientName,
    validateClientName,
    clientSearchQuery,
    getFilteredClients,
    updateClientSearchQuery,
    clearClientSearch,
    migrateDefaultClients
  } = useTaskAssignment(user);

  // Auto-focus custom client input when enabled
  useEffect(() => {
    if (formData.isCustomClient && customClientInputRef.current) {
      const timer = setTimeout(() => {
        customClientInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [formData.isCustomClient]);

  // UI Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitTask();
  };

  const handleClientSelectChange = (e) => {
    handleClientChange(e.target.value);
  };

  // Handle migration
  const handleMigration = async () => {
    const result = await migrateDefaultClients();
    if (result.success) {
      console.log('✅ Migration successful:', result.message);
    } else {
      console.error('❌ Migration failed:', result.message);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header - Consistent with other dashboards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-black">Assign Task</h2>
          <p className="text-sm text-gray-600 mt-1">Create and assign tasks to team members</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleMigration}
            disabled={submitting}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Migrate Clients</span>
          </Button>
          <Button
            variant="outline"
            onClick={resetForm}
            disabled={submitting}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Form</span>
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <div className="space-y-4 lg:space-y-6">
          {/* Task Description */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-black mb-2">
              <FileText className="w-4 h-4" />
              <span>Task Description</span>
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.task}
              onChange={(e) => updateFormField('task', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500"
              rows={3}
              placeholder="Enter task description..."
              required
              disabled={submitting}
            />
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Assign To */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-black mb-2">
                <User className="w-4 h-4" />
                <span>Assign To</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => updateFormField('assigned_to', e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
                required
                disabled={submitting}
              >
                <option value="" className="text-gray-500">Select user...</option>
                {user && (
                  <option key={user.username} value={user.username} className="text-black">
                    {user.username} ({user.role}) - Myself
                  </option>
                )}
                {users.filter(u => u.username !== user?.username).map((u) => (
                  <option key={u.username} value={u.username} className="text-black">
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Client Name */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-black mb-2">
                <Building className="w-4 h-4" />
                <span>Client Name</span>
                <span className="text-xs text-gray-500">(Optional)</span>
              </label>

              {/* Client Search */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearchQuery}
                  onChange={(e) => updateClientSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                  disabled={submitting || loading}
                />
                {clientSearchQuery && (
                  <button
                    type="button"
                    onClick={clearClientSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                value={formData.isCustomClient ? 'custom' : formData.client_name}
                onChange={handleClientSelectChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
                disabled={submitting || loading}
              >
                <option value="">
                  {loading ? 'Loading clients...' : (() => {
                    const filteredClients = getFilteredClients();
                    if (clientSearchQuery && filteredClients.length === 0) {
                      return 'No clients match your search';
                    }
                    return filteredClients.length > 0 ? 'Select client...' : 'No clients found - use custom client below';
                  })()}
                </option>
                {getFilteredClients().map((client) => (
                  <option key={client} value={client} className="text-black">
                    {client}
                  </option>
                ))}
                <option value="custom">+ Custom Client</option>
              </select>

              {/* Search results info */}
              {clientSearchQuery && (
                <div className="mt-2 text-xs text-gray-600">
                  {getFilteredClients().length > 0 ? (
                    <span>Showing {getFilteredClients().length} of {clientList.length} clients</span>
                  ) : (
                    <span>No clients match "{clientSearchQuery}". <button
                      type="button"
                      onClick={clearClientSearch}
                      className="text-blue-600 hover:underline"
                    >
                      Clear search
                    </button> or use custom client below.</span>
                  )}
                </div>
              )}

              {/* Client list status info */}
              {!loading && clientList.length === 0 && !clientSearchQuery && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
                  <strong>Note:</strong> No clients loaded from database. You can still use the "Custom Client" option to add a new client name.
                </div>
              )}

              {formData.isCustomClient && (
                <div className="mt-2">
                  <input
                    ref={customClientInputRef}
                    type="text"
                    value={formData.custom_client}
                    onChange={(e) => updateFormField('custom_client', e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500"
                    placeholder="Enter custom client name..."
                    autoComplete="off"
                    spellCheck="false"
                    disabled={submitting}
                  />

                  {/* Client validation feedback */}
                  {formData.custom_client && (() => {
                    const allMessages = validateClientName(formData.custom_client);
                    const formattedName = formatClientName(formData.custom_client);

                    // Separate errors from suggestions
                    const errors = allMessages.filter(msg => !msg.startsWith('Suggestion:'));
                    const suggestions = allMessages.filter(msg => msg.startsWith('Suggestion:'));

                    return (
                      <div className="mt-2 space-y-2">
                        {/* Validation Errors */}
                        {errors.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <div className="flex items-center space-x-2 mb-1">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              <span className="text-xs font-medium text-red-800">Issues to fix:</span>
                            </div>
                            <ul className="text-xs text-red-700 space-y-1">
                              {errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="w-3 h-3 text-yellow-600">💡</span>
                              <span className="text-xs font-medium text-yellow-800">Suggestions:</span>
                            </div>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {suggestions.map((suggestion, index) => (
                                <li key={index}>• {suggestion.replace('Suggestion: ', '')}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Formatting Preview */}
                        {errors.length === 0 && formattedName !== formData.custom_client && (
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-700">
                                Will be formatted as: <strong>"{formattedName}"</strong>
                              </span>
                            </div>
                          </div>
                        )}

                        {/* All good message */}
                        {errors.length === 0 && suggestions.length === 0 && formattedName === formData.custom_client && (
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-700">
                                Client name looks good!
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Client Suggestions */}
                  {(() => {
                    const suggestions = getClientSuggestions();
                    if (suggestions.length === 0) return null;

                    return (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            Similar clients found
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 mb-3">
                          To avoid duplicates, consider using one of these:
                        </p>

                        <div className="space-y-2">
                          {suggestions.map((client, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => applySuggestion(client)}
                              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-blue-300 rounded-lg text-left hover:bg-blue-100 transition-colors"
                              disabled={submitting}
                            >
                              <div className="flex items-center space-x-2">
                                <Building className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-900 text-sm">{client}</span>
                              </div>
                              <span className="text-xs text-blue-600">Click to use</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 pt-2 border-t border-blue-200">
                          <span className="text-xs text-blue-600">
                            Or continue typing to create a new client: "<strong>{formData.custom_client}</strong>"
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-black mb-2">
                <Flag className="w-4 h-4" />
                <span>Priority</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => updateFormField('priority', e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
                disabled={submitting}
              >
                <option value="High" className="text-black">High Priority</option>
                <option value="Medium" className="text-black">Medium Priority</option>
                <option value="Low" className="text-black">Low Priority</option>
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-black mb-2">
                <Calendar className="w-4 h-4" />
                <span>Deadline</span>
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => updateFormField('deadline', e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
                placeholder="Select deadline date"
                disabled={submitting}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Assignment Notes */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Assignment Notes
              <span className="text-xs text-gray-500 ml-2">(Visible to both you and the assignee)</span>
            </label>
            <textarea
              value={formData.assignerNotes}
              onChange={(e) => updateFormField('assignerNotes', e.target.value)}
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500 ${
                isCharacterLimitExceeded('assignerNotes') ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Add notes that will be visible to the assigned person..."
              maxLength={2000}
              disabled={submitting}
            />
            <div className={`text-xs mt-1 text-right ${
              isCharacterLimitExceeded('assignerNotes') ? 'text-red-600' : 'text-gray-500'
            }`}>
              {getCharacterCount('assignerNotes')}/2000 characters
            </div>
          </div>

          {/* Private Notes */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Private Notes
              <span className="text-xs text-gray-500 ml-2">(Only visible to you)</span>
            </label>
            <textarea
              value={formData.assignerPrivateNotes}
              onChange={(e) => updateFormField('assignerPrivateNotes', e.target.value)}
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500 ${
                isCharacterLimitExceeded('assignerPrivateNotes') ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Add private notes only visible to you..."
              maxLength={2000}
              disabled={submitting}
            />
            <div className={`text-xs mt-1 text-right ${
              isCharacterLimitExceeded('assignerPrivateNotes') ? 'text-red-600' : 'text-gray-500'
            }`}>
              {getCharacterCount('assignerPrivateNotes')}/2000 characters
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || !formData.task.trim() || !formData.assigned_to}
              className="bg-black hover:bg-gray-800 flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Creating...' : 'Create Task'}</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
    {/* Header Skeleton */}
    <div className="flex justify-between items-center">
      <div>
        <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded w-24"></div>
    </div>

    {/* Form Skeleton */}
    <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
      <div className="space-y-4 lg:space-y-6">
        {/* Text area skeleton */}
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>

        {/* More form fields skeleton */}
        {[...Array(2)].map((_, i) => (
          <div key={i}>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default TaskAssignmentDashboard;