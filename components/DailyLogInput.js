// Daily Log Input Component
// Required before clock-out, auto clock-out if submitted after 5:30 PM
import React, { useState, useEffect } from 'react';
import { FileText, Send, AlertCircle, CheckCircle, Clock, Loader } from 'lucide-react';
import { getIndiaTime } from '../lib/timezoneClient';

const DailyLogInput = ({ todayRecord, onSubmitDailyLog, currentUser }) => {
  const [dailyLog, setDailyLog] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    // Pre-fill if daily log already exists
    if (todayRecord?.notes) {
      setDailyLog(todayRecord.notes);
      setCharCount(todayRecord.notes.length);
    }
  }, [todayRecord]);

  const handleDailyLogChange = (e) => {
    const value = e.target.value;
    setDailyLog(value);
    setCharCount(value.length);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async () => {
    if (dailyLog.trim().length < 10) {
      setError('Daily log must be at least 10 characters long');
      return;
    }

    if (dailyLog.trim().length > 2000) {
      setError('Daily log must not exceed 2000 characters');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/attendance/daily-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: dailyLog.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.autoClockOut
          ? '✅ Daily log submitted and automatically clocked out!'
          : '✅ Daily log submitted successfully!'
        );

        // Call parent callback to refresh attendance data
        if (onSubmitDailyLog) {
          onSubmitDailyLog(data.record, data.autoClockOut);
        }
      } else {
        setError(data.message || 'Failed to submit daily log');
      }
    } catch (err) {
      setError('An error occurred while submitting daily log');
      console.error('Daily log submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const hasExistingLog = todayRecord?.notes && todayRecord.notes.trim().length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Daily Work Log</h3>
          <span className="text-red-500 text-sm">*Required before clock-out</span>
        </div>
        {hasExistingLog && (
          <div className="flex items-center space-x-1 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Submitted</span>
          </div>
        )}
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-2">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Important:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Daily log is compulsory before clocking out</li>
            <li>Minimum 10 characters required</li>
            <li>Submitting after 5:30 PM will automatically clock you out</li>
          </ul>
        </div>
      </div>

      {/* Time Warning */}
      {(() => {
        // Use India timezone for consistent time checking
        const currentTime = getIndiaTime();
        const timeParts = currentTime.split(':');
        const currentHour = parseInt(timeParts[0]);
        const currentMinute = parseInt(timeParts[1]);
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const clockOutThreshold = 17 * 60 + 30; // 5:30 PM in India timezone
        const isAfterClockOutTime = currentTimeInMinutes >= clockOutThreshold;

        if (isAfterClockOutTime && !todayRecord?.checkOut) {
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Auto Clock-Out Active</p>
                <p className="mt-1">It's after 5:30 PM (IST). Submitting your daily log will automatically clock you out.</p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Textarea */}
      <div>
        <textarea
          value={dailyLog}
          onChange={handleDailyLogChange}
          placeholder="Describe what you worked on today... (e.g., 'Completed task X, attended meeting Y, worked on feature Z')"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          rows={5}
          disabled={submitting || todayRecord?.checkOut}
        />
        <div className="flex justify-between items-center mt-2">
          <span className={`text-xs ${
            charCount < 10 ? 'text-red-500' :
            charCount > 2000 ? 'text-red-500' :
            'text-gray-500'
          }`}>
            {charCount} / 2000 characters
            {charCount < 10 && ' (minimum 10)'}
            {charCount > 2000 && ' (exceeded limit!)'}
          </span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Submit Button */}
      {!todayRecord?.checkOut && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || charCount < 10 || charCount > 2000}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              submitting || charCount < 10 || charCount > 2000
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {submitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{hasExistingLog ? 'Update Daily Log' : 'Submit Daily Log'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {todayRecord?.checkOut && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-sm text-gray-600">
          You have been clocked out. Daily log cannot be modified.
        </div>
      )}
    </div>
  );
};

export default DailyLogInput;
