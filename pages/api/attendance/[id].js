// pages/api/attendance/[id].js
import { verifyToken } from '../../../lib/auth';
import {
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getAttendanceById
} from '../../../lib/firebaseService';
import { broadcastNotification } from '../notifications/stream';

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

    // Multi-tenancy: Extract tenantId from authenticated request
    const { tenantId } = decoded;
    const { method } = req;
    const { id } = req.query;

    switch (method) {
      case 'GET':
        return await handleGetAttendanceById(req, res, decoded.user, id, tenantId);
      case 'PATCH':
        return await handleUpdateAttendance(req, res, decoded.user, id, tenantId);
      case 'DELETE':
        return await handleDeleteAttendance(req, res, decoded.user, id, tenantId);
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Attendance API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleGetAttendanceById(req, res, decoded, attendanceId, tenantId) {
  try {
    const record = await getAttendanceById(attendanceId, tenantId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Check permissions
    if (decoded.role !== 'admin' && record.username !== decoded.username) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.status(200).json({
      success: true,
      record
    });
  } catch (error) {
    console.error('Error getting attendance by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get attendance record'
    });
  }
}

async function handleUpdateAttendance(req, res, decoded, attendanceId, tenantId) {
  try {
    // Only admins can update attendance records
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update attendance records'
      });
    }

    const updates = req.body;

    // Validate updates
    if (updates.workType && !['office', 'wfh'].includes(updates.workType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid work type'
      });
    }

    if (updates.status && !['present', 'absent'].includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get the record before updating to check for approval/rejection
    const record = await getAttendanceById(attendanceId, tenantId);
    const oldApproval = record?.approved;

    await updateAttendanceRecord(attendanceId, updates, tenantId);

    // Send notification if attendance was approved or rejected
    if (updates.approved !== undefined && updates.approved !== oldApproval && record) {
      try {
        const approved = updates.approved === true || updates.approved === 'true';
        broadcastNotification({
          type: approved ? 'attendance_approved' : 'attendance_rejected',
          title: approved ? '✅ Attendance Approved' : '❌ Attendance Rejected',
          message: approved
            ? `Your attendance for ${record.date} has been approved`
            : `Your attendance for ${record.date} was rejected${updates.rejectionReason ? ': ' + updates.rejectionReason : ''}`,
          timestamp: new Date().toISOString(),
          priority: approved ? 'medium' : 'high',
          data: {
            attendanceId: attendanceId,
            date: record.date,
            approved: approved,
            rejectionReason: updates.rejectionReason || null
          }
        }, { username: record.username });
        console.log(`✅ Attendance ${approved ? 'approval' : 'rejection'} notification sent to ${record.username}`);
      } catch (notifError) {
        console.warn('📢 Attendance status notification failed:', notifError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully'
    });
  } catch (error) {
    console.error('Error updating attendance:', error);

    if (error.message === 'Attendance record not found') {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update attendance record'
    });
  }
}

async function handleDeleteAttendance(req, res, decoded, attendanceId, tenantId) {
  try {
    // Only admins can delete attendance records
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete attendance records'
      });
    }

    await deleteAttendanceRecord(attendanceId, tenantId);

    return res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);

    if (error.message === 'Attendance record not found') {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete attendance record'
    });
  }
}