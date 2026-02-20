// pages/api/auth/refresh.js - Token refresh endpoint
import { verifyToken, generateToken } from '../../../lib/auth.js';
import { loadUsers } from '../../../lib/firebaseService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify the refresh token
    const verification = verifyToken(refreshToken);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Get current user data from database
    const users = await loadUsers();
    const user = users.find(u =>
      u.username && u.username.toLowerCase() === verification.user.username.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new access token with current user data
    const newAccessToken = generateToken(user);

    // Generate new refresh token (longer expiration)
    const newRefreshToken = generateToken({
      ...user,
      tokenType: 'refresh'
    });

    // Return new tokens
    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'user',
        email: user.email || '',
        tenantId: user.tenantId,
        profileImage: user.profileImage || null
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}