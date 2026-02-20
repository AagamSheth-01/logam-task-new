/**
 * Admin Password Reset Email API (Server-side only)
 * Sends password reset notification emails when admin resets user password
 */
import { asyncHandler, authenticate, requireAdmin } from '../../../src/middleware/index.js';
import { sendPasswordResetNotificationEmail } from '../../../lib/emailService.js';
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

  const { email, username, password } = req.body;

  // Validate input
  if (!email || !username || !password) {
    return errorResponse(res, 'Email, username, and password are required', 400);
  }

  if (!email.includes('@')) {
    return errorResponse(res, 'Valid email address is required', 400);
  }

  try {
    // Send password reset notification email
    await sendPasswordResetNotificationEmail(email, username, password);

    console.log(`Password reset notification email sent to ${email} for user ${username} by admin ${req.user.username}`);

    return successResponse(res, null, 'Password reset notification email sent successfully');
  } catch (error) {
    console.error('Failed to send password reset notification email:', error);
    return errorResponse(res, 'Failed to send password reset notification email', 500);
  }
});