// components/modals/EditTaskModal.js
import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { X, Building, Calendar, Flag, AlertTriangle } from 'lucide-react';

const EditTaskModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  task, 
  clientList = [],
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    task: '',
    client_name: '',
    custom_client: '',
    deadline: '',
    priority: 'Medium'
  });
  const [errors, setErrors] = useState({});

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        task: task.task || '',
        client_name: task.client_name || '',
        custom_client: '',
        deadline: task.deadline || '',
        priority: task.priority || 'Medium'
      });
      setErrors({});
    }
  }, [task]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.task.trim()) {
      newErrors.task = 'Task description is required';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else {
      const selectedDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.deadline = 'Deadline cannot be in the past';
      }
    }

    if (formData.client_name === 'custom' && !formData.custom_client.trim()) {
      newErrors.custom_client = 'Custom client name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      task: formData.task.trim(),
      deadline: formData.deadline,
      priority: formData.priority,
      client_name: formData.client_name === 'custom' 
        ? formData.custom_client.trim() 
        : formData.client_name
    };

    onSave(submitData);
  };

  const handleClose = () => {
    setFormData({
      task: '',
      client_name: '',
      custom_client: '',
      deadline: '',
      priority: 'Medium'
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-black">Edit Task</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Task Description *
            </label>
            <textarea
              value={formData.task}
              onChange={(e) => setFormData({ ...formData, task: e.target.value })}
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500 ${
                errors.task ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Enter task description..."
            />
            {errors.task && (
              <div className="flex items-center space-x-1 mt-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-xs text-red-600">{errors.task}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium text-black mb-2 flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>Client Name</span>
                <span className="text-xs text-gray-500">(Optional)</span>
              </label>
              <select
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
              >
                <option value="">Select client...</option>
                {clientList.map((client) => (
                  <option key={client} value={client} className="text-black">
                    {client}
                  </option>
                ))}
                <option value="custom">+ Custom Client</option>
              </select>
              
              {formData.client_name === 'custom' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={formData.custom_client}
                    onChange={(e) => setFormData({ ...formData, custom_client: e.target.value })}
                    className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500 ${
                      errors.custom_client ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter custom client name..."
                  />
                  {errors.custom_client && (
                    <div className="flex items-center space-x-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">{errors.custom_client}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-black mb-2 flex items-center space-x-2">
                <Flag className="w-4 h-4" />
                <span>Priority</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
              >
                <option value="High" className="text-black">High Priority</option>
                <option value="Medium" className="text-black">Medium Priority</option>
                <option value="Low" className="text-black">Low Priority</option>
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-black mb-2 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Deadline *</span>
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black ${
                  errors.deadline ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.deadline && (
                <div className="flex items-center space-x-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-600">{errors.deadline}</span>
                </div>
              )}
            </div>
          </div>

          {/* Task Info */}
          {task && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Task Information</h4>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Assigned to:</span> {task.assigned_to}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {task.status}
                </div>
                <div>
                  <span className="font-medium">Assigned by:</span> {task.given_by}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {task.assigned_date}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="bg-black hover:bg-gray-800"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;