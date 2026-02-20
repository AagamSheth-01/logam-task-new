// pages/api/users/delete-profile-image.js - Delete profile image
import { requireAuth } from '../../../lib/auth.js';
import { getUserByUsername, updateUser } from '../../../lib/firebaseService.js';

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
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

    // Remove profile image
    await updateUser(user.id, { profileImage: null }, tenantId);

    console.log(`Profile image deleted for user: ${username}`);

    return res.status(200).json({
      success: true,
      message: 'Profile image deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile image error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete profile image: ' + error.message
    });
  }
}

export default requireAuth(handler);
