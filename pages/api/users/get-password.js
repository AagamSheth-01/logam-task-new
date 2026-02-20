// pages/api/users/get-password.js - Get decrypted password for display
import { requireAuth } from '../../../lib/auth.js';
import { getUserByUsername, decryptPassword } from '../../../lib/firebaseService.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
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

    // Decrypt password if available
    let displayPassword = null;
    if (user.displayPassword) {
      displayPassword = decryptPassword(user.displayPassword);
    }

    return res.status(200).json({
      success: true,
      password: displayPassword,
      hasPassword: !!displayPassword,
      warning: 'Passwords should be kept confidential. Do not share with anyone.'
    });

  } catch (error) {
    console.error('Get password error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve password: ' + error.message
    });
  }
}

export default requireAuth(handler);
