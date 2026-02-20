// pages/api/attendance/clock-out.js
import { verifyToken } from '../../../lib/auth';
import { getTodayAttendance, updateAttendanceRecord, addDailyTask } from '../../../lib/firebaseService';
import { getIndiaTime, getIndiaDate } from '../../../lib/timezone';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`
    });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Extract tenantId from authenticated request
    const tenantId = decoded.user?.tenantId || decoded.tenantId;
    const username = decoded.user?.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'User information missing from token'
      });
    }

    // Get today's attendance record
    const todayRecord = await getTodayAttendance(username, tenantId);

    if (!todayRecord) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found for today. Please clock in first.'
      });
    }

    if (todayRecord.checkOut) {
      return res.status(409).json({
        success: false,
        message: 'Already clocked out for today',
        record: todayRecord
      });
    }

    // Get pending tasks from request body (if any)
    const { pendingTasks } = req.body || {};
    const today = getIndiaDate();

    // If there are pending tasks, auto-save them
    let autoSavedTaskCount = 0;
    if (pendingTasks && Array.isArray(pendingTasks) && pendingTasks.length > 0) {
      try {
        // Save tasks without requiring time to be filled
        await addDailyTask({
          username: username,
          date: today,
          tasks: pendingTasks,
          totalHours: 0, // Time not tracked for auto-saved tasks
          notes: 'Auto-saved at clock out',
          submittedBy: username,
          submittedAt: new Date()
        }, tenantId);
        autoSavedTaskCount = pendingTasks.length;
      } catch (saveError) {
        // Continue with clock out even if save fails
      }
    }

    // Get current time in India timezone
    const checkOutTime = getIndiaTime();

    // Update attendance record with check-out time
    await updateAttendanceRecord(todayRecord.id, {
      checkOut: checkOutTime
    }, tenantId);

    // Fetch the updated record
    const updatedRecord = await getTodayAttendance(username, tenantId);

    // Build success message
    let message = 'Clocked out successfully';
    if (autoSavedTaskCount > 0) {
      message += `\n${autoSavedTaskCount} task${autoSavedTaskCount !== 1 ? 's' : ''} auto-saved to daily log`;
    }
    if (updatedRecord.totalHours) {
      message += `\nTotal hours worked: ${updatedRecord.totalHours}`;
    }

    return res.status(200).json({
      success: true,
      message: message,
      record: updatedRecord,
      autoSavedTasks: autoSavedTaskCount > 0 ? {
        count: autoSavedTaskCount
      } : null
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to clock out',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}
