// pages/api/users/view-password.js - View own password (requires re-authentication)
import { requireAuth } from '../../../lib/auth.js';
import { getUserByUsername } from '../../../lib/firebaseService.js';
import bcrypt from 'bcryptjs';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { currentPassword } = req.body;
    const username = req.user.username;
    const tenantId = req.tenantId;

    // Validate input
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required to view password information'
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

    // Check if there's a temporary password (set during last reset/change)
    const tempPassword = user.tempPassword || null;
    const tempPasswordSetAt = user.tempPasswordSetAt || null;

    // Check if temp password is still valid (within 24 hours)
    let validTempPassword = null;
    if (tempPassword && tempPasswordSetAt) {
      const setTime = tempPasswordSetAt.toDate ? tempPasswordSetAt.toDate() : new Date(tempPasswordSetAt);
      const now = new Date();
      const hoursSinceSet = (now - setTime) / (1000 * 60 * 60);

      if (hoursSinceSet < 24) {
        validTempPassword = tempPassword;
      }
    }

    return res.status(200).json({
      success: true,
      message: validTempPassword
        ? 'Password retrieved successfully'
        : 'Password information not available. For security, passwords can only be viewed within 24 hours of being set.',
      hasPassword: !!validTempPassword,
      password: validTempPassword,
      passwordSetAt: tempPasswordSetAt,
      note: 'For security reasons, passwords are hashed and cannot be retrieved after 24 hours. You can change your password at any time.'
    });

  } catch (error) {
    console.error('View password error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve password information: ' + error.message
    });
  }
}

export default requireAuth(handler);
