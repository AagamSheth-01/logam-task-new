/**
 * Mark Holiday API Controller (MVC Pattern)
 * Handles holiday marking and auto-present functionality
 */
import { asyncHandler, authenticate, requireAdmin } from '../../../src/middleware/index.js';
import { attendanceService } from '../../../src/services/index.js';
import { successResponse, errorResponse } from '../../../src/utils/response.util.js';

export default asyncHandler(async (req, res) => {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return errorResponse(res, 'Method not allowed', 405);
  }

  // Authenticate user and require admin role
  await authenticate(req, res);
  await requireAdmin(req, res);

  const { date, holidayName, markAllPresent = true } = req.body;
  const currentUser = req.user;
  const tenantId = currentUser.tenantId;

  // Validate input
  if (!date || !holidayName?.trim()) {
    return errorResponse(res, 'Date and holiday name are required', 400);
  }

  try {
    // Mark holiday and auto-present all users using service
    const result = await attendanceService.markHoliday({
      date,
      holidayName: holidayName.trim(),
      markAllPresent,
      markedBy: currentUser.username,
      tenantId
    });

    console.log(`Holiday "${holidayName}" marked for ${date} by admin ${currentUser.username}. Users marked present: ${result.usersMarkedPresent || 0}`);

    return successResponse(res, {
      holiday: result.holiday,
      usersMarkedPresent: result.usersMarkedPresent,
      date
    }, `Holiday "${holidayName}" marked successfully. ${result.usersMarkedPresent} users marked present.`);

  } catch (error) {
    console.error('Mark holiday error:', error);
    return errorResponse(res, error.message || 'Failed to mark holiday', 500);
  }
});