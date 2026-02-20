/**
 * Bulk Date Update API Controller
 * Handles marking attendance for multiple dates for a single user
 */
import { asyncHandler, authenticate } from '../../../src/middleware/index.js';
import { attendanceService } from '../../../src/services/index.js';
import { successResponse, errorResponse } from '../../../src/utils/response.util.js';

export default asyncHandler(async (req, res) => {
  // Authenticate user
  await authenticate(req, res);

  const { method } = req;

  switch (method) {
    case 'POST':
      return await handleBulkDateUpdate(req, res);
    default:
      res.setHeader('Allow', ['POST']);
      return errorResponse(res, `Method ${method} Not Allowed`, 405);
  }
});

/**
 * POST Handler - Bulk update attendance for date range
 */
async function handleBulkDateUpdate(req, res) {
  const { username, startDate, endDate, status, location, updatedBy } = req.body;
  const currentUser = req.user;

  // Validate required fields
  if (!username || !startDate || !endDate || !status) {
    return errorResponse(res, 'Username, start date, end date, and status are required', 400);
  }

  // Only admins can perform bulk updates
  if (currentUser.role !== 'admin') {
    return errorResponse(res, 'Only administrators can perform bulk attendance updates', 403);
  }

  // Validate date range
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return errorResponse(res, 'Start date cannot be after end date', 400);
  }

  // Limit the date range to prevent abuse
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  if (daysDiff > 31) {
    return errorResponse(res, 'Date range cannot exceed 31 days', 400);
  }

  try {
    // Perform bulk date update
    const result = await attendanceService.bulkDateUpdate(currentUser.tenantId, {
      username,
      startDate,
      endDate,
      status,
      location: location || 'office',
      updatedBy: updatedBy || currentUser.username
    });

    return successResponse(res, {
      message: 'Bulk attendance update completed successfully',
      daysProcessed: result.daysProcessed,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      skippedDays: result.skippedDays || []
    });

  } catch (error) {
    console.error('Bulk date update failed:', error);
    return errorResponse(res, 'Failed to update bulk attendance: ' + error.message, 500);
  }
}