/**
 * Dashboard Attendance API
 * Optimized endpoint for dashboard attendance data
 */

import { asyncHandler, authenticate } from '../../../src/middleware/index.js';
import { attendanceService } from '../../../src/services/index.js';
import { successResponse, errorResponse } from '../../../src/utils/response.util.js';
import { getIndiaDate } from '../../../lib/timezoneClient.js';

export default asyncHandler(async (req, res) => {
  // Only allow GET method
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return errorResponse(res, 'Method not allowed', 405);
  }

  // Authenticate user
  await authenticate(req, res);

  const currentUser = req.user;
  const tenantId = currentUser.tenantId;

  try {
    // Calculate current month date range
    const today = getIndiaDate();
    const [year, month] = today.split('-');
    const startOfMonth = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    // Optimize: Get only what we need for dashboard
    const [todayRecord, monthlyStats] = await Promise.all([
      // Get today's attendance record
      attendanceService.getTodayAttendance(currentUser.username, tenantId),

      // Get monthly stats (simplified query)
      attendanceService.getAttendanceStats({
        tenantId,
        username: currentUser.username,
        startDate: startOfMonth,
        endDate: endOfMonth
      })
    ]);

    const dashboardAttendance = {
      today: todayRecord,
      thisMonth: {
        present: monthlyStats?.presentDays || monthlyStats?.present || 0,
        total: monthlyStats?.totalDays || 0,
        rate: Math.round(monthlyStats?.attendanceRate || 0),
        presentDays: monthlyStats?.presentDays || monthlyStats?.present || 0,
        totalDays: monthlyStats?.totalDays || 0,
        attendanceRate: Math.round(monthlyStats?.attendanceRate || 0)
      }
    };

    return successResponse(res, dashboardAttendance, 'Dashboard attendance retrieved successfully');

  } catch (error) {
    console.error('Error loading dashboard attendance:', error);
    return errorResponse(res, error.message || 'Failed to load dashboard attendance', 500);
  }
});