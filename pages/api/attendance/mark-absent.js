// pages/api/attendance/mark-absent.js
import { verifyToken } from '../../../lib/auth';
import { markAbsentForMissingAttendance } from '../../../lib/firebaseService';
import { getIndiaDate } from '../../../lib/timezone';

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
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.valid) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Only admins can trigger auto-absent marking
    if (decoded.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only admins can mark absences'
      });
    }

    const tenantId = decoded.user?.tenantId || decoded.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Get target date from body, default to today
    const { date } = req.body;
    const targetDate = date || getIndiaDate();

    console.log(`Auto-marking absences for date: ${targetDate}, tenant: ${tenantId}`);

    // Mark absent for users who haven't marked attendance
    const absentRecords = await markAbsentForMissingAttendance(targetDate, tenantId);

    return res.status(200).json({
      success: true,
      message: `Marked ${absentRecords.length} users as absent for ${targetDate}`,
      count: absentRecords.length,
      records: absentRecords
    });

  } catch (error) {
    console.error('Mark absent API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark absences',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}
