import React, { useState, useEffect } from 'react';
import { Bell, Clock, Volume2, VolumeX, Save, TestTube, Calendar, User } from 'lucide-react';
import Button from './ui/Button';
import reminderService from '../lib/reminderService';

const ReminderSettings = ({ user, onSave = () => {} }) => {
  const [settings, setSettings] = useState({
    enabled: true,
    time: { hours: 17, minutes: 30 },
    soundEnabled: true,
    soundVolume: 0.5
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [nextReminder, setNextReminder] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    checkNotificationPermission();
  }, [user]);

  const loadSettings = () => {
    if (user) {
      const userSettings = reminderService.getUserReminderSettings();
      setSettings(userSettings);
      
      const nextReminderTime = reminderService.getNextReminderTime();
      setNextReminder(nextReminderTime);
    }
  };

  const checkNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTimeChange = (field, value) => {
    const numValue = parseInt(value);
    if (field === 'hours' && (numValue < 0 || numValue > 23)) return;
    if (field === 'minutes' && (numValue < 0 || numValue > 59)) return;
    
    setSettings(prev => ({
      ...prev,
      time: {
        ...prev.time,
        [field]: numValue
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Update reminder service settings
      reminderService.updateReminderSettings(settings);
      
      // Update next reminder time
      const nextReminderTime = reminderService.getNextReminderTime();
      setNextReminder(nextReminderTime);
      
      onSave(settings);
      
      console.log('Reminder settings saved successfully');
    } catch (error) {
      console.error('Failed to save reminder settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setHasPermission(permission === 'granted');
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
      } else if (permission === 'denied') {
        alert('Notifications blocked. Please enable them in your browser settings to receive daily reminders.');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  };

  const testReminder = () => {
    if (!hasPermission) {
      alert('Please enable notifications first to test reminders');
      return;
    }
    
    reminderService.triggerTestReminder();
  };

  const formatTime = (hours, minutes) => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const formatNextReminder = (date) => {
    if (!date) return 'Never (disabled)';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    
    let dateStr = '';
    if (isToday) dateStr = 'Today';
    else if (isTomorrow) dateStr = 'Tomorrow';
    else dateStr = date.toLocaleDateString();
    
    const timeStr = formatTime(date.getHours(), date.getMinutes());
    
    return `${dateStr} at ${timeStr}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Bell className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Daily Task Reminders</h2>
          <p className="text-sm text-gray-600">Configure when and how you want to be reminded to log your daily tasks</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable Reminders */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Bell className={`w-5 h-5 ${settings.enabled ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <h3 className="font-medium text-gray-900">Daily Reminders</h3>
              <p className="text-sm text-gray-600">Get notified to log your tasks every day</p>
            </div>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleSettingChange('enabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        {/* Notification Permission */}
        {!hasPermission && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Bell className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800">Enable Notifications</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Grant notification permission to receive daily task reminders
                </p>
                <Button
                  onClick={requestNotificationPermission}
                  size="sm"
                  className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Enable Notifications
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reminder Time */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Reminder Time</h3>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Hour:</label>
              <select
                value={settings.time.hours}
                onChange={(e) => handleTimeChange('hours', e.target.value)}
                disabled={!settings.enabled}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Minute:</label>
              <select
                value={settings.time.minutes}
                onChange={(e) => handleTimeChange('minutes', e.target.value)}
                disabled={!settings.enabled}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="ml-4 px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
              {formatTime(settings.time.hours, settings.time.minutes)}
            </div>
          </div>
        </div>

        {/* Sound Settings */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            {settings.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-gray-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <h3 className="font-medium text-gray-900">Sound Settings</h3>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                disabled={!settings.enabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Play notification sound</span>
            </label>
            
            {settings.soundEnabled && (
              <div className="ml-6">
                <label className="block text-sm text-gray-600 mb-1">Volume:</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.soundVolume}
                  onChange={(e) => handleSettingChange('soundVolume', parseFloat(e.target.value))}
                  disabled={!settings.enabled}
                  className="w-32"
                />
                <span className="ml-2 text-sm text-gray-600">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Next Reminder Info */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">Next Reminder</h3>
              <p className="text-sm text-blue-700">
                {formatNextReminder(nextReminder)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            onClick={testReminder}
            variant="outline"
            size="sm"
            disabled={!hasPermission || !settings.enabled}
            className="flex items-center space-x-2"
          >
            <TestTube className="w-4 h-4" />
            <span>Test Reminder</span>
          </Button>
          
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReminderSettings;