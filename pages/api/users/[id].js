/**
 * Individual User API Controller (MVC Pattern)
 * Handles specific user operations - get, update, delete by ID
 */
import { asyncHandler, authenticate, requireAdmin } from '../../../src/middleware/index.js';
import { userService } from '../../../src/services/index.js';
import { successResponse, errorResponse, notFoundResponse } from '../../../src/utils/response.util.js';

export default asyncHandler(async (req, res) => {
  // Authenticate user
  await authenticate(req, res);

  const { method, query } = req;
  const userId = query.id;

  if (!userId) {
    return errorResponse(res, 'User ID is required', 400);
  }

  switch (method) {
    case 'GET':
      return await handleGetUser(req, res, userId);
    case 'PUT':
      return await handleUpdateUser(req, res, userId);
    case 'DELETE':
      return await handleDeleteUser(req, res, userId);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return errorResponse(res, `Method ${method} Not Allowed`, 405);
  }
});

/**
 * GET Handler - Get specific user by ID
 */
async function handleGetUser(req, res, userId) {
  const currentUser = req.user;
  const tenantId = currentUser.tenantId;

  // Only admins can view other users, users can view their own profile
  if (currentUser.role !== 'admin' && currentUser.id !== userId) {
    return errorResponse(res, 'Access denied', 403);
  }

  try {
    const user = await userService.getUserById(userId, tenantId);

    if (!user) {
      return notFoundResponse(res, 'User');
    }

    return successResponse(res, { user }, 'User retrieved successfully');
  } catch (error) {
    console.error('Error getting user:', error);
    return errorResponse(res, error.message || 'Failed to retrieve user', 500);
  }
}

/**
 * PUT Handler - Update specific user by ID
 */
async function handleUpdateUser(req, res, userId) {
  const currentUser = req.user;
  const tenantId = currentUser.tenantId;

  // Only admins can update other users, users can update their own profile
  if (currentUser.role !== 'admin' && currentUser.id !== userId) {
    return errorResponse(res, 'Access denied', 403);
  }

  try {
    // Check if user exists
    const existingUser = await userService.getUserById(userId, tenantId);
    if (!existingUser) {
      return notFoundResponse(res, 'User');
    }

    // Prevent non-admin users from updating role
    if (currentUser.role !== 'admin' && req.body.role) {
      return errorResponse(res, 'Only administrators can modify user roles', 403);
    }

    const updatedUser = await userService.updateUser(userId, req.body, tenantId);
    return successResponse(res, { user: updatedUser }, 'User updated successfully');
  } catch (error) {
    console.error('Error updating user:', error);
    return errorResponse(res, error.message || 'Failed to update user', 500);
  }
}

/**
 * DELETE Handler - Delete specific user by ID
 */
async function handleDeleteUser(req, res, userId) {
  const currentUser = req.user;
  const tenantId = currentUser.tenantId;

  // Only admins can delete users
  if (currentUser.role !== 'admin') {
    return errorResponse(res, 'Only administrators can delete users', 403);
  }

  // Prevent admin from deleting themselves
  if (currentUser.id === userId) {
    return errorResponse(res, 'You cannot delete your own account', 400);
  }

  try {
    // Check if user exists
    const existingUser = await userService.getUserById(userId, tenantId);
    if (!existingUser) {
      return notFoundResponse(res, 'User');
    }

    await userService.deleteUser(userId, existingUser.username, tenantId);
    return successResponse(res, null, 'User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    return errorResponse(res, error.message || 'Failed to delete user', 500);
  }
}