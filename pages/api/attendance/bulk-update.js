/**
 * Bulk Attendance Update API (Admin Only)
 * Handles bulk attendance operations for multiple users
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

    const { operations, date } = req.body;
    const currentUser = decoded.user;
    const tenantId = currentUser.tenantId;

    // Validate input
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ success: false, message: 'Operations array is required' });
    }

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each operation
    for (const operation of operations) {
      try {
        const { username, action } = operation;

        if (!username || !action) {
          results.push({
            username,
            success: false,
            error: 'Username and action are required'
          });
          errorCount++;
          continue;
        }

        // Determine attendance data based on action
        let attendanceData = {
          username,
          date,
          updatedBy: currentUser.username,
          updatedAt: new Date().toISOString()
        };

        switch (action) {
          case 'mark_present':
            attendanceData.status = 'present';
            attendanceData.clockIn = '09:00';
            attendanceData.clockOut = null;
            attendanceData.location = 'office';
            break;

          case 'mark_absent':
            attendanceData.status = 'absent';
            attendanceData.clockIn = null;
            attendanceData.clockOut = null;
            attendanceData.location = null;
            break;

          case 'mark_leave':
            attendanceData.status = 'leave';
            attendanceData.leaveType = 'casual_leave';
            attendanceData.clockIn = null;
            attendanceData.clockOut = null;
            attendanceData.location = null;
            break;

          case 'mark_half_day':
            attendanceData.status = 'half_day';
            attendanceData.clockIn = '09:00';
            attendanceData.clockOut = '13:00';
            attendanceData.location = 'office';
            break;

          default:
            results.push({
              username,
              success: false,
              error: `Invalid action: ${action}`
            });
            errorCount++;
            continue;
        }

        // Update attendance record
        await updateAttendanceByUserDate(attendanceData, tenantId);

        results.push({
          username,
          success: true,
          action: action
        });
        successCount++;

      } catch (error) {
        console.error(`Error processing operation for ${operation.username}:`, error);
        results.push({
          username: operation.username,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    console.log(`Bulk attendance update completed by ${currentUser.username}: ${successCount} successful, ${errorCount} failed`);

    return res.status(200).json({
      success: true,
      results,
      message: `Bulk operation completed: ${successCount} successful, ${errorCount} failed`,
      summary: {
        total: operations.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error) {
    console.error('Bulk attendance update error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process bulk attendance update'
    });
  }
}