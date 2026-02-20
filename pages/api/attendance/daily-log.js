// pages/api/attendance/daily-log.js
// API to add/update daily log (work summary)

import { verifyToken } from '../../../lib/auth';
import { getTodayAttendance, updateAttendanceRecord } from '../../../lib/firebaseService';
import { getIndiaTime, getIndiaDate } from '../../../lib/timezone';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    res.setHeader('Allow', ['POST', 'PUT']);
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

    const tenantId = decoded.user?.tenantId || decoded.tenantId;
    const username = decoded.user?.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'User information missing from token'
      });
    }

    const { notes } = req.body;

    // Validate daily log
    if (!notes || typeof notes !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Daily log is required'
      });
    }

    const trimmedNotes = notes.trim();

    if (trimmedNotes.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Daily log must be at least 10 characters long. Please provide a meaningful work summary.'
      });
    }

    if (trimmedNotes.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Daily log must not exceed 2000 characters'
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

    // Get current time in India timezone
    const currentTime = getIndiaTime();

    // Update attendance record with daily log
    const updateData = {
      notes: trimmedNotes,
      dailyLogSubmittedAt: currentTime
    };

    await updateAttendanceRecord(todayRecord.id, updateData, tenantId);

    // Fetch updated record
    const updatedRecord = await getTodayAttendance(username, tenantId);

    return res.status(200).json({
      success: true,
      message: 'Daily log submitted successfully',
      record: updatedRecord
    });

  } catch (error) {
    console.error('Daily log API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit daily log',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}
