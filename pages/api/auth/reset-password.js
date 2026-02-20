// pages/api/auth/reset-password.js
import { resetPasswordWithToken } from '../../../lib/firebaseService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Reset password using token
    const result = await resetPasswordWithToken(token, password);

    if (result.success) {
      console.log(`Password reset successful for user: ${result.username}`);

      return res.status(200).json({
        success: true,
        message: 'Your password has been reset successfully. You can now log in with your new password.',
        username: result.username
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to reset password'
      });
    }

  } catch (error) {
    console.error('Reset password error:', error);

    // Handle specific error messages
    if (error.message.includes('expired') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'An error occurred while resetting your password. Please try again.'
    });
  }
}
