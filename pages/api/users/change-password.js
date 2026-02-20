// pages/api/users/change-password.js - Change own password
import { requireAuth } from '../../../lib/auth.js';
import { getUserByUsername, updateUser } from '../../../lib/firebaseService.js';
import bcrypt from 'bcryptjs';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    const username = req.user.username;
    const tenantId = req.tenantId;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user from database
    const user = await getUserByUsername(username, tenantId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password
    await updateUser(user.id, { password: newPassword }, tenantId);

    console.log(`Password changed for user: ${username}`);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to change password: ' + error.message
    });
  }
}

export default requireAuth(handler);
