// pages/api/users/upload-profile-image.js - Upload profile image (base64)
import { requireAuth } from '../../../lib/auth.js';
import { getUserByUsername, updateUser } from '../../../lib/firebaseService.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { imageData } = req.body;
    const username = req.user.username;
    const tenantId = req.tenantId;

    // Validation
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required'
      });
    }

    // Validate base64 image format
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!base64Regex.test(imageData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Only JPEG, PNG, GIF, and WebP are supported'
      });
    }

    // Check image size (limit to 2MB base64 string ≈ 1.5MB actual image)
    if (imageData.length > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image too large. Maximum size is 1.5MB'
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

    // Update user with profile image
    await updateUser(user.id, { profileImage: imageData }, tenantId);

    console.log(`Profile image updated for user: ${username}`);

    return res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      profileImage: imageData
    });

  } catch (error) {
    console.error('Upload profile image error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to upload profile image: ' + error.message
    });
  }
}

export default requireAuth(handler);

// Increase API route body size limit for Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '3mb',
    },
  },
};
