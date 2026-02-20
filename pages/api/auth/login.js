// pages/api/auth/login.js - Updated to use Firebase instead of Google Sheets
import { authenticateUser } from '../../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Authenticate user (auth.js will now use Firebase through firebaseService.js)
    const result = await authenticateUser(username.trim(), password);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: result.token,
        user: result.user
      });
    } else {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
}