/**
 * Attendance View Component
 * MVC View layer for attendance management
 * Handles display logic and user interactions
 */

import React, { useState, useEffect } from 'react';
import { AttendanceController } from '../../controllers/attendance.controller.js';
import { useAttendanceStore } from '../../features/attendance/store/attendanceStore.js';

export const AttendanceView = ({
  username,
  tenantId,
  mode = 'user', // 'user' | 'admin' | 'readonly'
  dateRange = null,
  onAttendanceUpdate = null
}) => {
  const [controller] = useState(() => new AttendanceController());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState({
    todayRecord: null,
    monthlyData: [],
    summary: null
  });

  // Store integration
  const {
    todayAttendance,
    monthlyAttendance,
    isLoading,
    error: storeError,
    markAttendance: storeMarkAttendance,
    clockOut: storeClockOut,
    fetchTodayAttendance,
    fetchMonthlyAttendance
  } = useAttendanceStore();

  useEffect(() => {
    loadAttendanceData();
  }, [username, tenantId, dateRange]);

  const loadAttendanceData = async () => {
    if (!username || !tenantId) return;

    setLoading(true);
    setError(null);

    try {
      // Load today's attendance
      await fetchTodayAttendance(username, tenantId);

      // Load monthly data if in detailed mode
      if (mode !== 'readonly') {
        const now = new Date();
        await fetchMonthlyAttendance(username, tenantId, now.getFullYear(), now.getMonth() + 1);
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (attendanceData) => {
    try {
      setLoading(true);
      setError(null);

      await storeMarkAttendance(attendanceData, tenantId);

      if (onAttendanceUpdate) {
        onAttendanceUpdate('mark', attendanceData);
      }

      // Refresh data
      await loadAttendanceData();
    } catch (err) {
      setError(err.message);
      console.error('Failed to mark attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      setError(null);

      await storeClockOut(username, tenantId);

      if (onAttendanceUpdate) {
        onAttendanceUpdate('clockout', { username, tenantId });
      }

      // Refresh data
      await loadAttendanceData();
    } catch (err) {
      setError(err.message);
      console.error('Failed to clock out:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTodayStatus = () => {
    if (!todayAttendance) {
      return { status: 'not_marked', message: 'No attendance marked today', color: 'gray' };
    }

    if (todayAttendance.clockOut) {
      return { status: 'completed', message: 'Work day completed', color: 'green' };
    }

    if (todayAttendance.clockIn) {
      return { status: 'clocked_in', message: 'Currently at work', color: 'blue' };
    }

    return { status: 'marked', message: 'Attendance marked', color: 'yellow' };
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    return timeString;
  };

  const formatDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return '--:--';

    const [inHour, inMin] = clockIn.split(':').map(Number);
    const [outHour, outMin] = clockOut.split(':').map(Number);

    const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const getWorkModeDisplay = (workMode) => {
    const modes = {
      'office': { label: 'Office', icon: '🏢', color: 'blue' },
      'wfh': { label: 'Work From Home', icon: '🏠', color: 'green' },
      'remote': { label: 'Remote', icon: '💻', color: 'purple' }
    };
    return modes[workMode] || { label: workMode, icon: '📍', color: 'gray' };
  };

  const todayStatus = getTodayStatus();

  if (loading && !todayAttendance) {
    return (
      <div className="attendance-view loading">
        <div className="loading-spinner">Loading attendance data...</div>
      </div>
    );
  }

  return (
    <div className="attendance-view">
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Today's Status Card */}
      <div className={`today-status-card ${todayStatus.status}`}>
        <div className="status-header">
          <h3>Today's Attendance</h3>
          <span className={`status-badge ${todayStatus.color}`}>
            {todayStatus.message}
          </span>
        </div>

        {todayAttendance ? (
          <div className="attendance-details">
            <div className="time-info">
              <div className="time-item">
                <label>Clock In:</label>
                <span>{formatTime(todayAttendance.clockIn)}</span>
              </div>
              <div className="time-item">
                <label>Clock Out:</label>
                <span>{formatTime(todayAttendance.clockOut)}</span>
              </div>
              <div className="time-item">
                <label>Duration:</label>
                <span>{formatDuration(todayAttendance.clockIn, todayAttendance.clockOut)}</span>
              </div>
            </div>

            {todayAttendance.workMode && (
              <div className="work-mode">
                {(() => {
                  const mode = getWorkModeDisplay(todayAttendance.workMode);
                  return (
                    <span className={`work-mode-badge ${mode.color}`}>
                      {mode.icon} {mode.label}
                    </span>
                  );
                })()}
              </div>
            )}

            {todayAttendance.location && (
              <div className="location">
                📍 {todayAttendance.location}
              </div>
            )}

            {todayAttendance.notes && (
              <div className="notes">
                💬 {todayAttendance.notes}
              </div>
            )}
          </div>
        ) : (
          <div className="no-attendance">
            <p>No attendance marked for today</p>
          </div>
        )}

        {/* Action Buttons */}
        {mode === 'user' && (
          <div className="action-buttons">
            {!todayAttendance && (
              <AttendanceMarkForm
                onSubmit={handleMarkAttendance}
                loading={loading}
              />
            )}

            {todayAttendance && !todayAttendance.clockOut && (
              <button
                className="clock-out-btn"
                onClick={handleClockOut}
                disabled={loading}
              >
                {loading ? 'Clocking Out...' : 'Clock Out'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      {mode !== 'readonly' && monthlyAttendance && (
        <AttendanceSummaryCard
          monthlyData={monthlyAttendance}
          username={username}
        />
      )}

      {/* Admin Controls */}
      {mode === 'admin' && (
        <AttendanceAdminControls
          username={username}
          tenantId={tenantId}
          onUpdate={loadAttendanceData}
        />
      )}
    </div>
  );
};

// Sub-component for marking attendance
const AttendanceMarkForm = ({ onSubmit, loading }) => {
  const [workMode, setWorkMode] = useState('office');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const now = new Date();
    const clockIn = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    onSubmit({
      clockIn,
      workMode,
      location: location.trim() || null,
      notes: notes.trim() || null,
      status: 'present'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="attendance-mark-form">
      <div className="form-group">
        <label>Work Mode:</label>
        <select
          value={workMode}
          onChange={(e) => setWorkMode(e.target.value)}
          required
        >
          <option value="office">🏢 Office</option>
          <option value="wfh">🏠 Work From Home</option>
          <option value="remote">💻 Remote</option>
        </select>
      </div>

      <div className="form-group">
        <label>Location (Optional):</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Office Floor 2, Home, Cafe..."
        />
      </div>

      <div className="form-group">
        <label>Notes (Optional):</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>

      <button type="submit" disabled={loading} className="mark-attendance-btn">
        {loading ? 'Marking...' : 'Mark Attendance'}
      </button>
    </form>
  );
};

// Sub-component for monthly summary
const AttendanceSummaryCard = ({ monthlyData, username }) => {
  if (!monthlyData) return null;

  return (
    <div className="attendance-summary-card">
      <h3>Monthly Summary</h3>
      <div className="summary-grid">
        <div className="summary-item">
          <label>Days Present:</label>
          <span className="value">{monthlyData.daysPresent || 0}</span>
        </div>
        <div className="summary-item">
          <label>Days Absent:</label>
          <span className="value">{monthlyData.daysAbsent || 0}</span>
        </div>
        <div className="summary-item">
          <label>Total Hours:</label>
          <span className="value">{monthlyData.totalHours || '0:00'}</span>
        </div>
        <div className="summary-item">
          <label>Average Hours:</label>
          <span className="value">{monthlyData.averageHours || '0:00'}</span>
        </div>
      </div>
    </div>
  );
};

// Sub-component for admin controls
const AttendanceAdminControls = ({ username, tenantId, onUpdate }) => {
  const [showEditForm, setShowEditForm] = useState(false);

  return (
    <div className="attendance-admin-controls">
      <h3>Admin Controls</h3>
      <div className="admin-buttons">
        <button
          onClick={() => setShowEditForm(!showEditForm)}
          className="admin-btn"
        >
          Edit Attendance
        </button>
        <button
          onClick={onUpdate}
          className="admin-btn"
        >
          Refresh Data
        </button>
      </div>

      {showEditForm && (
        <div className="edit-form">
          <p>Edit form would go here for admin modifications</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;