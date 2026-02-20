// pages/api/attendance/settings.js
import { verifyToken } from '../../../lib/auth';
import { getAttendanceSettings, updateAttendanceSettings } from '../../../lib/firebaseService';

export default async function handler(req, res) {
  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.valid) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Only admins can manage attendance settings
    if (decoded.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only admins can manage attendance settings'
      });
    }

    const tenantId = decoded.user?.tenantId || decoded.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGetSettings(req, res, tenantId);
      case 'PUT':
        return await handleUpdateSettings(req, res, tenantId);
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} Not Allowed`
        });
    }
  } catch (error) {
    console.error('Attendance settings API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}

async function handleGetSettings(req, res, tenantId) {
  try {
    const settings = await getAttendanceSettings(tenantId);

    return res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error getting attendance settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get attendance settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}

async function handleUpdateSettings(req, res, tenantId) {
  try {
    const { deadlineHour, deadlineMinute, autoMarkAbsent, autoMarkAbsentTime, halfDayEnabled } = req.body;

    // Validate deadline hour
    if (deadlineHour !== undefined && (deadlineHour < 0 || deadlineHour > 23)) {
      return res.status(400).json({
        success: false,
        message: 'Deadline hour must be between 0 and 23'
      });
    }

    // Validate deadline minute
    if (deadlineMinute !== undefined && (deadlineMinute < 0 || deadlineMinute > 59)) {
      return res.status(400).json({
        success: false,
        message: 'Deadline minute must be between 0 and 59'
      });
    }

    const settings = {
      ...(deadlineHour !== undefined && { deadlineHour }),
      ...(deadlineMinute !== undefined && { deadlineMinute }),
      ...(autoMarkAbsent !== undefined && { autoMarkAbsent }),
      ...(autoMarkAbsentTime !== undefined && { autoMarkAbsentTime }),
      ...(halfDayEnabled !== undefined && { halfDayEnabled })
    };

    const updatedSettings = await updateAttendanceSettings(tenantId, settings);

    return res.status(200).json({
      success: true,
      message: 'Attendance settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Error updating attendance settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update attendance settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}
