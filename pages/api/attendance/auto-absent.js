// pages/api/attendance/auto-absent.js
import { verifyToken } from '../../../lib/auth';
import { markAbsentForMissingAttendance } from '../../../lib/firebaseService';

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

    // Only admins can run auto-absent
    if (decoded.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can mark auto-absent'
      });
    }

    const { method } = req;

    if (method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }

    const { targetDate } = req.body;

    // Mark absent for missing attendance
    const absentRecords = await markAbsentForMissingAttendance(targetDate, tenantId);

    return res.status(200).json({
      success: true,
      message: `Marked ${absentRecords.length} users as absent`,
      absentRecords
    });
  } catch (error) {
    console.error('Auto-absent API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}