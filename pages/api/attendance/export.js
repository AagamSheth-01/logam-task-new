// pages/api/attendance/export.js
import { verifyToken } from '../../../lib/auth';
import { exportAttendanceData } from '../../../lib/firebaseService';

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

    if (method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }

    const { user, startDate, endDate, format = 'json' } = req.query;

    // Build filters
    const filters = { tenantId };

    // If user is requesting their own data or admin requesting specific user
    if (user && (user === decoded.user.username || decoded.user.role === 'admin')) {
      filters.username = user;
    } else if (decoded.user.role !== 'admin') {
      // Regular users can only see their own data
      filters.username = decoded.user.username;
    }

    // Date range filters
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Export data
    const exportData = await exportAttendanceData(filters);

    if (format === 'csv') {
      // Return CSV format
      const csvContent = [
        exportData.headers.join(','),
        ...exportData.rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-export.csv');
      return res.status(200).send(csvContent);
    }

    // Return JSON format
    return res.status(200).json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Export API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}