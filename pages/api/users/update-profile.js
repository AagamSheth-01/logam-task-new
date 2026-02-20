// pages/api/users/update-profile.js - Update own profile
import { requireAuth } from '../../../lib/auth.js';
import { getUserByUsername, updateUser } from '../../../lib/firebaseService.js';

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { email } = req.body;
    const username = req.user.username;
    const tenantId = req.tenantId;

    // Get user from database
    const user = await getUserByUsername(username, tenantId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare update data (users can only update email)
    const updateData = {};

    if (email !== undefined) {
      updateData.email = email.trim();
    }

    // Update user
    await updateUser(user.id, updateData, tenantId);

    console.log(`Profile updated for user: ${username}`);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        username: user.username,
        email: updateData.email || user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update profile: ' + error.message
    });
  }
}

export default requireAuth(handler);
