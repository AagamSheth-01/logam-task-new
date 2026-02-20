// pages/api/auth/forgot-password.js
import { getUserByEmail, generatePasswordResetToken, savePasswordResetToken } from '../../../lib/firebaseService.js';
import { sendPasswordResetEmail } from '../../../lib/emailService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { email } = req.body;

    // Validate input
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required'
      });
    }

    // Find user by email
    const user = await getUserByEmail(email);

    if (!user) {
      // For security, don't reveal if email exists or not
      // Always return success message
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Check if user has email set
    if (!user.email || user.email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'This account does not have an email address associated with it. Please contact your administrator.'
      });
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken();

    // Save token to user document
    await savePasswordResetToken(user.id, resetToken, user.tenantId);

    // Send reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.username);

      console.log(`Password reset email sent to ${user.email} for user ${user.username}`);

      return res.status(200).json({
        success: true,
        message: 'Password reset link has been sent to your email address.'
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);

      // If email sending fails, we should inform the user
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please contact your administrator.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);

    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request. Please try again later.'
    });
  }
}
