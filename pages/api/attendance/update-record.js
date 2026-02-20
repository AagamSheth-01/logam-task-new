/**
 * Update Individual Attendance Record API (Admin Only)
 * Handles detailed attendance record updates
 */
import { verifyToken } from '../../../lib/auth';
import { updateAttendanceByUserDate } from '../../../lib/firebaseService';

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.valid) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Require admin role
    if (decoded.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
    }

    const {
      username,
      date,
      status,
      clockIn,
      clockOut,
      workType,
      location,
      leaveType,
      notes
    } = req.body;

    const currentUser = decoded.user;
    const tenantId = currentUser.tenantId;

    // Validate input
    if (!username || !date || !status) {
      return res.status(400).json({ success: false, message: 'Username, date, and status are required' });
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'leave', 'half_day', 'late', 'early_out'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Validate leave type if status is leave
    if (status === 'leave') {
      const validLeaveTypes = ['sick_leave', 'casual_leave', 'annual_leave', 'maternity_leave', 'paternity_leave', 'emergency_leave'];
      if (leaveType && !validLeaveTypes.includes(leaveType)) {
        return res.status(400).json({ success: false, message: `Invalid leave type. Must be one of: ${validLeaveTypes.join(', ')}` });
      }
    }

    // Validate work type
    const validWorkTypes = ['office', 'wfh'];
    if (workType && !validWorkTypes.includes(workType)) {
      return res.status(400).json({ success: false, message: `Invalid work type. Must be one of: ${validWorkTypes.join(', ')}` });
    }
    // Prepare attendance data
    const attendanceData = {
      username,
      date,
      status,
      clockIn: clockIn || null,
      clockOut: clockOut || null,
      workType: workType || (status === 'present' ? 'office' : null),
      location: location || null,
      leaveType: status === 'leave' ? (leaveType || 'casual_leave') : null,
      notes: notes || '',
      updatedBy: currentUser.username,
      updatedAt: new Date().toISOString()
    };

    // Special handling for different statuses
    switch (status) {
      case 'absent':
        attendanceData.clockIn = null;
        attendanceData.clockOut = null;
        attendanceData.location = null;
        break;

      case 'leave':
        attendanceData.clockIn = null;
        attendanceData.clockOut = null;
        attendanceData.location = null;
        break;

      case 'present':
      case 'late':
      case 'early_out':
      case 'half_day':
        // Keep provided times or set defaults
        if (!attendanceData.clockIn) {
          attendanceData.clockIn = status === 'late' ? '09:30' : '09:00';
        }
        if (!attendanceData.clockOut && status === 'half_day') {
          attendanceData.clockOut = '13:00';
        }
        if (!attendanceData.workType) {
          attendanceData.workType = 'office';
        }
        break;
    }

    // Update the attendance record
    const result = await updateAttendanceByUserDate(attendanceData, tenantId);

    console.log(`Attendance record updated by admin ${currentUser.username}: ${username} - ${date} - ${status}`);

    return res.status(200).json({
      success: true,
      record: result,
      message: 'Attendance record updated successfully',
      updatedBy: currentUser.username
    });

  } catch (error) {
    console.error('Update attendance record error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update attendance record'
    });
  }
}