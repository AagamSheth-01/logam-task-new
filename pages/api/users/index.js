// pages/api/users.js (or pages/api/users/index.js) - Corrected with debug logging
import { requireAuth } from '../../../lib/auth.js'; // Use ../../ if file is at pages/api/users.js
import { loadUsers, addUser, deleteUser, updateUser, getUserByUsername, getUserById } from '../../../lib/firebaseService.js'; // Use ../../ if file is at pages/api/users.js

async function handler(req, res) {
  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;

  console.log(`🔧 [${req.method}] /api/users - User: ${req.user?.username} (${req.user?.role})`);

  if (req.method === 'GET') {
    try {
      console.log('📥 Loading users from Firebase...');
      const users = await loadUsers(tenantId);
      
      if (!users || users.length === 0) {
        console.log('⚠️ No users found, returning empty array');
        return res.status(200).json({ 
          success: true, 
          users: [] 
        });
      }
      
      // Remove sensitive information (passwords) before sending
      const safeUsers = users
        .filter(user => user.username && user.username.trim() !== '') // Filter out empty usernames
        .map(user => ({
          id: user.id,
          username: user.username,
          role: user.role || 'user',
          email: user.email || '',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }));
      
      console.log(`✅ Returning ${safeUsers.length} users`);
      return res.status(200).json({ 
        success: true, 
        users: safeUsers 
      });
    } catch (error) {
      console.error('❌ Get users error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load users',
        error: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log('👤 POST request received - creating user');
      
      // Only admins can create users
      if (req.user.role?.toLowerCase() !== 'admin') {
        console.log('❌ Access denied - user is not admin');
        return res.status(403).json({ 
          success: false, 
          message: 'Only administrators can create users' 
        });
      }

      const { username, email, password, role } = req.body;
      console.log('📦 Request data:', { username, email, role, password: password ? '***' : 'missing' });

      // Validate required fields
      if (!username || !password) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
          success: false, 
          message: 'Username and password are required' 
        });
      }

      // Validate role
      const validRoles = ['admin', 'user'];
      if (role && !validRoles.includes(role.toLowerCase())) {
        console.log('❌ Invalid role:', role);
        return res.status(400).json({ 
          success: false, 
          message: 'Role must be either "admin" or "user"' 
        });
      }

      console.log('👤 Creating new user:', username);

      // Create user
      const newUser = await addUser({
        username: username.trim(),
        email: email?.trim() || '',
        password: password,
        role: role?.toLowerCase() || 'user'
      }, tenantId);

      console.log('✅ User created successfully:', newUser.id);

      return res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      });
      
    } catch (error) {
      console.error('❌ Create user error:', error);
      
      // Handle specific Firebase errors
      if (error.message.includes('already exists')) {
        return res.status(409).json({ 
          success: false, 
          message: error.message 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create user',
        error: error.message 
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      console.log('🗑️ DELETE request received - deleting user');
      
      // Only admins can delete users
      if (req.user.role?.toLowerCase() !== 'admin') {
        console.log('❌ Access denied - user is not admin');
        return res.status(403).json({ 
          success: false, 
          message: 'Only administrators can delete users' 
        });
      }

      const { userId, username } = req.body;
      console.log('📦 Delete data:', { userId, username });

      // Validate required fields
      if (!userId && !username) {
        console.log('❌ Missing required fields for deletion');
        return res.status(400).json({ 
          success: false, 
          message: 'Either userId or username is required' 
        });
      }

      // Prevent admin from deleting themselves
      if (username === req.user.username) {
        console.log('❌ User trying to delete themselves');
        return res.status(400).json({ 
          success: false, 
          message: 'You cannot delete your own account' 
        });
      }

      console.log('🗑️ Deleting user:', username || userId);

      // Get user details if we only have username
      let userToDelete = null;
      if (username && !userId) {
        userToDelete = await getUserByUsername(username, tenantId);
        if (!userToDelete) {
          console.log('❌ User not found:', username);
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
      } else if (userId) {
        userToDelete = await getUserById(userId, tenantId);
        if (!userToDelete) {
          console.log('❌ User not found:', userId);
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
      }

      // Delete user
      await deleteUser(
        userId || userToDelete.id,
        username || userToDelete.username,
        tenantId
      );

      console.log('✅ User deleted successfully');

      return res.status(200).json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
      
    } catch (error) {
      console.error('❌ Delete user error:', error);
      
      // Handle specific errors
      if (error.message.includes('Cannot delete user')) {
        return res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete user',
        error: error.message 
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      console.log('✏️ PUT request received - updating user');
      
      // Only admins can update users
      if (req.user.role?.toLowerCase() !== 'admin') {
        console.log('❌ Access denied - user is not admin');
        return res.status(403).json({ 
          success: false, 
          message: 'Only administrators can update users' 
        });
      }

      const { userId, username, email, role, password } = req.body;
      console.log('📦 Update data:', { userId, username, email, role, password: password ? '***' : 'not provided' });

      // Validate required fields
      if (!userId) {
        console.log('❌ Missing userId');
        return res.status(400).json({ 
          success: false, 
          message: 'User ID is required' 
        });
      }

      // Check if user exists
      const userDoc = await getUserById(userId, tenantId);
      if (!userDoc) {
        console.log('❌ User not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent admin from changing their own role
      if (userDoc.username === req.user.username && role && role !== userDoc.role) {
        console.log('❌ User trying to change their own role');
        return res.status(400).json({ 
          success: false, 
          message: 'You cannot change your own role' 
        });
      }

      // Validate role if provided
      if (role) {
        const validRoles = ['admin', 'user'];
        if (!validRoles.includes(role.toLowerCase())) {
          console.log('❌ Invalid role:', role);
          return res.status(400).json({ 
            success: false, 
            message: 'Role must be either "admin" or "user"' 
          });
        }
      }

      console.log('✏️ Updating user:', userId);

      // Prepare update data (only include provided fields)
      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (password !== undefined && password.trim()) updateData.password = password;

      // Update user
      await updateUser(userId, updateData, tenantId);

      console.log('✅ User updated successfully');

      return res.status(200).json({ 
        success: true, 
        message: 'User updated successfully'
      });
      
    } catch (error) {
      console.error('❌ Update user error:', error);
      
      // Handle specific Firebase errors
      if (error.message.includes('already exists')) {
        return res.status(409).json({ 
          success: false, 
          message: error.message 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update user',
        error: error.message 
      });
    }
  }
}

export default requireAuth(handler);