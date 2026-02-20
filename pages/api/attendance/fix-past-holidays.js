/**
 * Fix Past Holidays API Controller
 * Checks and fixes attendance records for past holidays and Sundays
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

  const currentUser = req.user;
  const tenantId = currentUser.tenantId;

  try {
    console.log(`Admin ${currentUser.username} initiated past holiday attendance fix`);

    // Call attendance service to fix past holidays
    const result = await attendanceService.fixPastHolidayAttendance(tenantId);

    console.log(
      `Past holiday fix completed by ${currentUser.username}: ` +
      `${result.datesChecked} dates checked, ${result.issuesFound} issues found, ${result.issuesFixed} fixed`
    );

    return successResponse(res, {
      datesChecked: result.datesChecked,
      issuesFound: result.issuesFound,
      issuesFixed: result.issuesFixed,
      holidayDates: result.holidayDates,
      summary: result.summary
    }, `Holiday attendance fix completed: ${result.issuesFixed} records fixed across ${result.datesChecked} dates`);

  } catch (error) {
    console.error('Fix past holidays error:', error);
    return errorResponse(res, error.message || 'Failed to fix past holiday attendance', 500);
  }
});