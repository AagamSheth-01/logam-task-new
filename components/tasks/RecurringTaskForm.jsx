import React, { useState } from 'react';
import { Repeat, Calendar, Clock, X } from 'lucide-react';
import Button from '../ui/Button';

const RecurringTaskForm = ({ isOpen, onClose, onSubmit, users = [] }) => {
  const [taskData, setTaskData] = useState({
    task: '',
    assigned_to: '',
    priority: 'Medium',
    time: '09:00',
    recurring: {
      type: 'daily', // daily, weekly, monthly
      interval: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      daysOfWeek: [], // For weekly: [1,2,3,4,5] = Mon-Fri
      dayOfMonth: 1, // For monthly
    }
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!taskData.task.trim()) {
      newErrors.task = 'Task description is required';
    }
    
    if (!taskData.assigned_to) {
      newErrors.assigned_to = 'Please select a user';
    }
    
    if (!taskData.recurring.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (taskData.recurring.type === 'weekly' && taskData.recurring.daysOfWeek.length === 0) {
      newErrors.daysOfWeek = 'Please select at least one day';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Create the recurring task schedule
      const recurringTask = {
        ...taskData,
        deadline: `${taskData.recurring.startDate} ${taskData.time}`,
        isRecurring: true
      };
      
      onSubmit(recurringTask);
      onClose();
      
      // Reset form
      setTaskData({
        task: '',
        assigned_to: '',
        priority: 'Medium',
        time: '09:00',
        recurring: {
          type: 'daily',
          interval: 1,
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          daysOfWeek: [],
          dayOfMonth: 1,
        }
      });
    }
  };

  const handleDayOfWeekToggle = (day) => {
    const days = taskData.recurring.daysOfWeek;
    const newDays = days.includes(day) 
      ? days.filter(d => d !== day)
      : [...days, day].sort();
    
    setTaskData({
      ...taskData,
      recurring: { ...taskData.recurring, daysOfWeek: newDays }
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black flex items-center space-x-2">
            <Repeat className="w-6 h-6" />
            <span>Create Recurring Task</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Task Description *
            </label>
            <textarea
              value={taskData.task}
              onChange={(e) => setTaskData({ ...taskData, task: e.target.value })}
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black ${
                errors.task ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Enter task description..."
            />
            {errors.task && <p className="text-red-500 text-sm mt-1">{errors.task}</p>}
          </div>

          {/* Assign To & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Assign To *
              </label>
              <select
                value={taskData.assigned_to}
                onChange={(e) => setTaskData({ ...taskData, assigned_to: e.target.value })}
                className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black ${
                  errors.assigned_to ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select user...</option>
                {users.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
              {errors.assigned_to && <p className="text-red-500 text-sm mt-1">{errors.assigned_to}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Priority
              </label>
              <select
                value={taskData.priority}
                onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Recurring Schedule */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
              <Repeat className="w-5 h-5" />
              <span>Recurring Schedule</span>
            </h3>

            {/* Recurrence Type */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {['daily', 'weekly', 'monthly'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTaskData({
                    ...taskData,
                    recurring: { ...taskData.recurring, type, daysOfWeek: [] }
                  })}
                  className={`p-3 border rounded-lg text-sm font-medium transition-colors capitalize ${
                    taskData.recurring.type === type
                      ? 'bg-black text-white border-black'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Interval */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Every
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={taskData.recurring.interval}
                    onChange={(e) => setTaskData({
                      ...taskData,
                      recurring: { ...taskData.recurring, interval: parseInt(e.target.value) || 1 }
                    })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                  <span className="text-sm text-gray-600">
                    {taskData.recurring.type === 'daily' ? 'day(s)' : 
                     taskData.recurring.type === 'weekly' ? 'week(s)' : 'month(s)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Date *
                </label>
                <input
                  type="date"
                  value={taskData.recurring.startDate}
                  onChange={(e) => setTaskData({
                    ...taskData,
                    recurring: { ...taskData.recurring, startDate: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-black ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={taskData.time}
                  onChange={(e) => setTaskData({ ...taskData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            </div>

            {/* Days of Week (for weekly) */}
            {taskData.recurring.type === 'weekly' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-2">
                  Days of Week *
                </label>
                <div className="flex space-x-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayOfWeekToggle(index)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        taskData.recurring.daysOfWeek.includes(index)
                          ? 'bg-black text-white border-black'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {errors.daysOfWeek && <p className="text-red-500 text-sm mt-1">{errors.daysOfWeek}</p>}
              </div>
            )}

            {/* Day of Month (for monthly) */}
            {taskData.recurring.type === 'monthly' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-2">
                  Day of Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={taskData.recurring.dayOfMonth}
                  onChange={(e) => setTaskData({
                    ...taskData,
                    recurring: { ...taskData.recurring, dayOfMonth: parseInt(e.target.value) || 1 }
                  })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            )}

            {/* End Date (Optional) */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={taskData.recurring.endDate}
                onChange={(e) => setTaskData({
                  ...taskData,
                  recurring: { ...taskData.recurring, endDate: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for indefinite recurrence
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-black mb-2">Preview</h4>
            <p className="text-sm text-gray-600">
              This task will be created {taskData.recurring.type} 
              {taskData.recurring.interval > 1 ? ` every ${taskData.recurring.interval} ${taskData.recurring.type.slice(0, -2)}s` : ''}
              {taskData.recurring.type === 'weekly' && taskData.recurring.daysOfWeek.length > 0 && 
                ` on ${taskData.recurring.daysOfWeek.map(d => dayNames[d]).join(', ')}`}
              {taskData.recurring.type === 'monthly' && 
                ` on the ${taskData.recurring.dayOfMonth}${getOrdinalSuffix(taskData.recurring.dayOfMonth)} of each month`}
              {' '}starting {taskData.recurring.startDate} at {taskData.time}
              {taskData.recurring.endDate && ` until ${taskData.recurring.endDate}`}.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-black hover:bg-gray-800"
            >
              Create Recurring Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function for ordinal numbers
const getOrdinalSuffix = (num) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};

export default RecurringTaskForm;