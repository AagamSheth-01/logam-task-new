// lib/firebaseService.js - Complete Firebase operations with Daily Tasks Support
import { adminDb } from './firebase-admin.js';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { getIndiaDate, getIndiaTime, getIndiaDateTime } from './timezone.js';

// Always load environment variables first
if (!process.env.FIREBASE_PROJECT_ID) {
  dotenv.config({ path: '.env.local' });
}

// Helper function to safely convert dates
const safeDate = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    // If it's already a Firestore Timestamp
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate().toISOString().split('T')[0] + ' ' + dateValue.toDate().toTimeString().split(' ')[0];
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) {
        return null;
      }
      return dateValue; // Return as-is if it's a valid date string
    }
    
    // If it's a Date object
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) {
        return null;
      }
      return dateValue.toISOString().split('T')[0] + ' ' + dateValue.toTimeString().split(' ')[0];
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Helper function to convert Firestore document to plain object
const convertFirestoreDoc = (doc) => {
  if (!doc.exists) return null;
  
  const data = doc.data();
  const converted = { id: doc.id };
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    // Convert Firestore Timestamps to date strings
    if (value && typeof value.toDate === 'function') {
      converted[key] = safeDate(value);
    } else {
      converted[key] = value;
    }
  });
  
  return converted;
};

// USERS COLLECTION OPERATIONS

// Load users from Firebase
// Multi-tenancy: If tenantId provided, filter by tenant. If null, return all (for super-admin)
export const loadUsers = async (tenantId = null) => {
  try {
    let query = adminDb.collection('users');

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const usersSnapshot = await query.get();

    if (usersSnapshot.empty) {
      return [];
    }

    const users = [];
    usersSnapshot.forEach(doc => {
      const userData = convertFirestoreDoc(doc);
      if (userData && userData.username) {
        users.push(userData);
      }
    });

    return users;
  } catch (error) {
    throw error;
  }
};

// Get all users (alias for loadUsers to match existing API calls)
// Multi-tenancy: Pass tenantId to filter users
export const getUsers = async (tenantId = null) => {
  return await loadUsers(tenantId);
};

// Add user to Firebase
// Multi-tenancy: Requires tenantId to assign user to organization
export const addUser = async (userData, tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required for creating users');
    }

    // Check if username already exists within this tenant
    const existingUser = await adminDb
      .collection('users')
      .where('username', '==', userData.username.trim())
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      throw new Error('Username already exists in this organization');
    }

    // Check if email already exists within this tenant (if provided)
    if (userData.email) {
      const existingEmail = await adminDb
        .collection('users')
        .where('email', '==', userData.email.trim())
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (!existingEmail.empty) {
        throw new Error('Email already exists in this organization');
      }
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Store encrypted copy for display (WITH WARNING: NOT FULLY SECURE)
    const encryptedPassword = encryptPassword(userData.password);

    const userDoc = await adminDb.collection('users').add({
      tenantId: tenantId,  // Multi-tenancy: Assign user to tenant
      username: userData.username.trim(),
      email: userData.email?.trim() || '',
      password: hashedPassword,
      displayPassword: encryptedPassword, // Encrypted password for display (NOT SECURE)
      role: userData.role || 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log activity
    await logActivity({
      action: 'user_created',
      userId: userData.username,
      tenantId: tenantId,  // Multi-tenancy: Include tenant in log
      details: {
        username: userData.username,
        role: userData.role || 'user',
        email: userData.email || ''
      }
    });

    // Return the user data with the generated ID
    return {
      id: userDoc.id,
      tenantId: tenantId,  // Multi-tenancy: Include tenant in response
      username: userData.username.trim(),
      email: userData.email?.trim() || '',
      role: userData.role || 'user'
    };
  } catch (error) {
    throw error;
  }
};

// Create user (alias for addUser to match existing API calls)
// Multi-tenancy: Pass tenantId to addUser
export const createUser = async (userData, tenantId) => {
  return await addUser(userData, tenantId);
};

// Update user in Firebase
// Multi-tenancy: Optionally verify tenantId for security
export const updateUser = async (userId, userData, tenantId = null) => {
  try {
    // Get the current user document to check if username is changing
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const currentUserData = userDoc.data();
    const oldUsername = currentUserData.username;

    // Multi-tenancy: Verify user belongs to tenant (if tenantId provided)
    if (tenantId && currentUserData.tenantId !== tenantId) {
      throw new Error('Unauthorized: User belongs to different organization');
    }

    // Prepare update data
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Track if username is being changed
    let isUsernameChanged = false;
    let newUsername = null;

    // Only update fields that are provided
    if (userData.username !== undefined) {
      newUsername = userData.username.trim();
      updateData.username = newUsername;

      // Check if username is actually changing
      if (oldUsername !== newUsername) {
        isUsernameChanged = true;

        // Check if new username already exists
        let query = adminDb
          .collection('users')
          .where('username', '==', newUsername);

        // Multi-tenancy: Scope check to tenant if provided
        if (tenantId) {
          query = query.where('tenantId', '==', tenantId);
        }

        const existingUser = await query.limit(1).get();

        if (!existingUser.empty && existingUser.docs[0].id !== userId) {
          throw new Error('Username already exists');
        }
      }
    }

    if (userData.email !== undefined) {
      updateData.email = userData.email?.trim() || '';

      // Check if new email already exists (if email is being changed and not empty)
      if (userData.email?.trim()) {
        let query = adminDb
          .collection('users')
          .where('email', '==', userData.email.trim());

        // Multi-tenancy: Scope check to tenant if provided
        if (tenantId) {
          query = query.where('tenantId', '==', tenantId);
        }

        const existingEmail = await query.limit(1).get();

        if (!existingEmail.empty && existingEmail.docs[0].id !== userId) {
          throw new Error('Email already exists');
        }
      }
    }

    if (userData.role !== undefined) {
      updateData.role = userData.role.toLowerCase();
    }

    if (userData.password !== undefined && userData.password.trim()) {
      // Hash password before storing
      updateData.password = await bcrypt.hash(userData.password.trim(), 10);
      // Store encrypted copy for display (WITH WARNING: NOT FULLY SECURE)
      updateData.displayPassword = encryptPassword(userData.password.trim());
    }

    // Handle profile image update
    if (userData.profileImage !== undefined) {
      updateData.profileImage = userData.profileImage;
    }

    // Update the user document
    await adminDb.collection('users').doc(userId).update(updateData);

    // If username changed, update all related records
    if (isUsernameChanged && oldUsername && newUsername) {

      // Update attendance records
      const attendanceQuery = tenantId
        ? adminDb.collection('attendance').where('username', '==', oldUsername).where('tenantId', '==', tenantId)
        : adminDb.collection('attendance').where('username', '==', oldUsername);

      const attendanceSnapshot = await attendanceQuery.get();
      const attendanceUpdatePromises = attendanceSnapshot.docs.map(doc =>
        doc.ref.update({ username: newUsername, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      );
      await Promise.all(attendanceUpdatePromises);

      // Update task records (assigned_to field)
      const tasksAssignedToQuery = tenantId
        ? adminDb.collection('tasks').where('assigned_to', '==', oldUsername).where('tenantId', '==', tenantId)
        : adminDb.collection('tasks').where('assigned_to', '==', oldUsername);

      const tasksAssignedToSnapshot = await tasksAssignedToQuery.get();
      const tasksAssignedToUpdatePromises = tasksAssignedToSnapshot.docs.map(doc =>
        doc.ref.update({ assigned_to: newUsername, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      );
      await Promise.all(tasksAssignedToUpdatePromises);

      // Update task records (given_by field)
      const tasksGivenByQuery = tenantId
        ? adminDb.collection('tasks').where('given_by', '==', oldUsername).where('tenantId', '==', tenantId)
        : adminDb.collection('tasks').where('given_by', '==', oldUsername);

      const tasksGivenBySnapshot = await tasksGivenByQuery.get();
      const tasksGivenByUpdatePromises = tasksGivenBySnapshot.docs.map(doc =>
        doc.ref.update({ given_by: newUsername, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      );
      await Promise.all(tasksGivenByUpdatePromises);

      // Update daily tasks records (username field only, NOT user_id)
      const dailyTasksQuery = tenantId
        ? adminDb.collection('dailyTasks').where('username', '==', oldUsername).where('tenantId', '==', tenantId)
        : adminDb.collection('dailyTasks').where('username', '==', oldUsername);

      const dailyTasksSnapshot = await dailyTasksQuery.get();
      const dailyTasksUpdatePromises = dailyTasksSnapshot.docs.map(doc =>
        doc.ref.update({ username: newUsername, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      );
      await Promise.all(dailyTasksUpdatePromises);

      // Update daily tasks submittedBy field
      const dailyTasksSubmittedByQuery = tenantId
        ? adminDb.collection('dailyTasks').where('submittedBy', '==', oldUsername).where('tenantId', '==', tenantId)
        : adminDb.collection('dailyTasks').where('submittedBy', '==', oldUsername);

      const dailyTasksSubmittedBySnapshot = await dailyTasksSubmittedByQuery.get();
      const dailyTasksSubmittedByUpdatePromises = dailyTasksSubmittedBySnapshot.docs.map(doc =>
        doc.ref.update({ submittedBy: newUsername, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      );
      await Promise.all(dailyTasksSubmittedByUpdatePromises);

      // Update activity log records
      const activityLogQuery = tenantId
        ? adminDb.collection('activity_log').where('userId', '==', oldUsername).where('tenantId', '==', tenantId)
        : adminDb.collection('activity_log').where('userId', '==', oldUsername);

      const activityLogSnapshot = await activityLogQuery.get();
      const activityLogUpdatePromises = activityLogSnapshot.docs.map(doc =>
        doc.ref.update({ userId: newUsername })
      );
      await Promise.all(activityLogUpdatePromises);

    }

    // Log activity
    await logActivity({
      action: 'user_updated',
      userId: newUsername || oldUsername || userId,
      tenantId: tenantId,  // Multi-tenancy: Include tenant in log
      details: {
        userId: userId,
        updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt'),
        usernameChanged: isUsernameChanged,
        oldUsername: isUsernameChanged ? oldUsername : undefined,
        newUsername: isUsernameChanged ? newUsername : undefined,
        updatedAt: new Date().toISOString()
      }
    });

    return true;
  } catch (error) {
    throw error;
  }
};

// Delete user from Firebase
// Multi-tenancy: Verify tenantId if provided
export const deleteUser = async (userId, username, tenantId = null) => {
  try {
    // First, check if user has any tasks
    const userTasks = await getUserTasks(username, tenantId);

    if (userTasks.length > 0) {
      // Count pending tasks
      const pendingTasks = userTasks.filter(t => t.status === 'pending');

      if (pendingTasks.length > 0) {
        throw new Error(`Cannot delete user ${username}. User has ${pendingTasks.length} pending tasks. Please reassign or complete these tasks first.`);
      }
    }
    
    // Check if user exists before deletion
    let userExists = false;
    
    if (userId) {
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        userExists = userDoc.exists;
      } catch (checkError) {
        // Continue to search by username
      }
    }
    
    // If no userId or user doesn't exist by ID, try to find by username
    if (!userId || !userExists) {
      const userQuery = await adminDb
        .collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      
      if (userQuery.empty) {
        throw new Error(`User ${username} not found in database`);
      }
      
      const userDoc = userQuery.docs[0];
      userId = userDoc.id;
      userExists = true;
    }
    
    if (!userExists) {
      throw new Error(`User ${username} not found`);
    }
    
    // Delete the user document
    await adminDb.collection('users').doc(userId).delete();
    
    // Log activity
    await logActivity({
      action: 'user_deleted',
      userId: username,
      details: {
        username: username,
        firebaseId: userId,
        deletedAt: new Date().toISOString()
      }
    });
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Get user by username
// Multi-tenancy: Filter by tenantId if provided
export const getUserByUsername = async (username, tenantId = null) => {
  try {
    let userQuery = adminDb
      .collection('users')
      .where('username', '==', username.trim());

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      userQuery = userQuery.where('tenantId', '==', tenantId);
    }

    const userSnapshot = await userQuery.limit(1).get();

    if (userSnapshot.empty) {
      return null;
    }

    const userDoc = userSnapshot.docs[0];
    return convertFirestoreDoc(userDoc);
  } catch (error) {
    throw error;
  }
};

// Get user by ID
// Multi-tenancy: Verify tenantId if provided
export const getUserById = async (userId, tenantId = null) => {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    // Multi-tenancy: Verify user belongs to tenant
    if (tenantId && userDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: User belongs to different organization');
    }

    return convertFirestoreDoc(userDoc);
  } catch (error) {
    throw error;
  }
};

// TASKS COLLECTION OPERATIONS

// Load all tasks from Firebase
// Multi-tenancy: Filter by tenantId if provided
export const loadTasks = async (tenantId = null) => {
  try {
    let query = adminDb.collection('tasks');

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    // Removed orderBy to avoid composite index requirement
    // Will sort in memory instead
    const tasksSnapshot = await query.get();

    if (tasksSnapshot.empty) {
      return [];
    }

    const tasks = [];
    tasksSnapshot.forEach(doc => {
      const taskData = convertFirestoreDoc(doc);
      if (taskData) {
        tasks.push(taskData);
      }
    });

    // Sort by createdAt in descending order (newest first) in memory
    tasks.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA; // Descending order
    });

    return tasks;
  } catch (error) {
    throw error;
  }
};

// Get all tasks with optional filters
// Multi-tenancy: Filter by tenantId if provided in filters
export const getTasks = async (filters = {}) => {
  try {
    let tasksQuery = adminDb.collection('tasks');

    // Multi-tenancy: Filter by tenantId if provided
    if (filters.tenantId) {
      tasksQuery = tasksQuery.where('tenantId', '==', filters.tenantId);
    }

    // Apply filters
    if (filters.assignedTo) {
      tasksQuery = tasksQuery.where('assigned_to', '==', filters.assignedTo);
    }

    if (filters.status) {
      tasksQuery = tasksQuery.where('status', '==', filters.status);
    }

    if (filters.givenBy) {
      tasksQuery = tasksQuery.where('given_by', '==', filters.givenBy);
    }

    const tasksSnapshot = await tasksQuery.get();
    const tasks = [];

    tasksSnapshot.forEach(doc => {
      const taskData = convertFirestoreDoc(doc);
      if (taskData) {
        tasks.push(taskData);
      }
    });

    // Fetch profile images for assigned_to and given_by users
    const usernames = new Set();
    tasks.forEach(task => {
      if (task.assigned_to) usernames.add(task.assigned_to);
      if (task.given_by) usernames.add(task.given_by);
    });

    // Create a map of username -> profile image
    const profileImages = {};
    if (usernames.size > 0) {
      const usernameArray = Array.from(usernames);
      let usersQuery = adminDb.collection('users').where('username', 'in', usernameArray.slice(0, 10));

      if (filters.tenantId) {
        usersQuery = usersQuery.where('tenantId', '==', filters.tenantId);
      }

      const usersSnapshot = await usersQuery.get();
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.username && userData.profileImage) {
          profileImages[userData.username] = userData.profileImage;
        }
      });

      // If we have more than 10 usernames, fetch the rest in batches
      if (usernameArray.length > 10) {
        for (let i = 10; i < usernameArray.length; i += 10) {
          const batch = usernameArray.slice(i, i + 10);
          let batchQuery = adminDb.collection('users').where('username', 'in', batch);

          if (filters.tenantId) {
            batchQuery = batchQuery.where('tenantId', '==', filters.tenantId);
          }

          const batchSnapshot = await batchQuery.get();
          batchSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.username && userData.profileImage) {
              profileImages[userData.username] = userData.profileImage;
            }
          });
        }
      }
    }

    // Attach profile images to tasks
    tasks.forEach(task => {
      if (task.assigned_to && profileImages[task.assigned_to]) {
        task.assigned_to_profile_image = profileImages[task.assigned_to];
      }
      if (task.given_by && profileImages[task.given_by]) {
        task.given_by_profile_image = profileImages[task.given_by];
      }
    });

    // Sort in memory to avoid index requirements
    tasks.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate - aDate; // Descending order (newest first)
    });

    return tasks;
  } catch (error) {
    throw error;
  }
};

// Multi-tenancy: Filter by tenantId if provided
export const getUserTasks = async (username, tenantId = null) => {
  try {
    if (!username) {
      return [];
    }

    const trimmedUsername = username.trim();

    let assignedQuery = adminDb
      .collection('tasks')
      .where('assigned_to', '==', trimmedUsername);

    let givenQuery = adminDb
      .collection('tasks')
      .where('given_by', '==', trimmedUsername);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      assignedQuery = assignedQuery.where('tenantId', '==', tenantId);
      givenQuery = givenQuery.where('tenantId', '==', tenantId);
    }

    const [assignedSnapshot, givenSnapshot] = await Promise.all([
      assignedQuery.get(),
      givenQuery.get()
    ]);

    const tasks = [];

    // Add tasks assigned to the user
    assignedSnapshot.forEach(doc => {
      const taskData = convertFirestoreDoc(doc);
      if (taskData) tasks.push(taskData);
    });

    // Add tasks created by the user, avoid duplicates
    givenSnapshot.forEach(doc => {
      const taskData = convertFirestoreDoc(doc);
      if (taskData && !tasks.some(t => t.id === taskData.id)) {
        tasks.push(taskData);
      }
    });

    // Fetch profile images for assigned_to and given_by users
    const usernames = new Set();
    tasks.forEach(task => {
      if (task.assigned_to) usernames.add(task.assigned_to);
      if (task.given_by) usernames.add(task.given_by);
    });

    // Create a map of username -> profile image
    const profileImages = {};
    if (usernames.size > 0) {
      const usernameArray = Array.from(usernames);
      let usersQuery = adminDb.collection('users').where('username', 'in', usernameArray.slice(0, 10));

      if (tenantId) {
        usersQuery = usersQuery.where('tenantId', '==', tenantId);
      }

      const usersSnapshot = await usersQuery.get();
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.username && userData.profileImage) {
          profileImages[userData.username] = userData.profileImage;
        }
      });

      // If we have more than 10 usernames, fetch the rest in batches
      if (usernameArray.length > 10) {
        for (let i = 10; i < usernameArray.length; i += 10) {
          const batch = usernameArray.slice(i, i + 10);
          let batchQuery = adminDb.collection('users').where('username', 'in', batch);

          if (tenantId) {
            batchQuery = batchQuery.where('tenantId', '==', tenantId);
          }

          const batchSnapshot = await batchQuery.get();
          batchSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.username && userData.profileImage) {
              profileImages[userData.username] = userData.profileImage;
            }
          });
        }
      }
    }

    // Attach profile images to tasks
    tasks.forEach(task => {
      if (task.assigned_to && profileImages[task.assigned_to]) {
        task.assigned_to_profile_image = profileImages[task.assigned_to];
      }
      if (task.given_by && profileImages[task.given_by]) {
        task.given_by_profile_image = profileImages[task.given_by];
      }
    });

    // Sort descending by createdAt
    tasks.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate - aDate;
    });

    return tasks;
  } catch (error) {
    throw error;
  }
};

// Check for duplicate tasks
// Multi-tenancy: Filter by tenantId if provided
export const checkForDuplicateTasks = async (taskData, tenantId = null) => {
  try {
    let query = adminDb
      .collection('tasks')
      .where('task', '==', taskData.task)
      .where('assigned_to', '==', taskData.assigned_to)
      .where('client_name', '==', taskData.client_name || '')
      .where('deadline', '==', taskData.deadline)
      .where('given_by', '==', taskData.given_by)
      .where('status', '==', 'pending');

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const duplicateSnapshot = await query.get();

    return duplicateSnapshot.docs.map(doc => convertFirestoreDoc(doc));
  } catch (error) {
    throw error;
  }
};

// Generate unique task hash for duplicate prevention
export const generateTaskHash = (taskData) => {
  const hashString = `${taskData.task}-${taskData.assigned_to}-${taskData.client_name || ''}-${taskData.deadline}-${taskData.given_by}`;
  return hashString.toLowerCase().replace(/\s+/g, '-');
};

// Add a single task to Firebase with duplicate prevention
// Multi-tenancy: Requires tenantId to assign task to organization
export const addTask = async (taskData, tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required for creating tasks');
    }

    // Check for existing duplicates within tenant
    const duplicates = await checkForDuplicateTasks(taskData, tenantId);

    if (duplicates.length > 0) {
      // Return existing task instead of creating duplicate
      return duplicates[0];
    }

    // Generate unique hash for the task
    const taskHash = generateTaskHash(taskData);

    // Get user IDs for assigned_to and given_by
    let assigned_to_id = null;
    let given_by_id = null;

    if (taskData.assigned_to) {
      const assignedUser = await getUserByUsername(taskData.assigned_to, tenantId);
      assigned_to_id = assignedUser?.id || null;
    }

    if (taskData.given_by) {
      const giverUser = await getUserByUsername(taskData.given_by, tenantId);
      given_by_id = giverUser?.id || null;
    }

    // Prepare task data with timestamps
    const taskToSave = {
      tenantId: tenantId, // Multi-tenancy: Assign task to tenant
      task: taskData.task || '',
      assigned_to: taskData.assigned_to || '', // Username (for backward compatibility)
      assigned_to_id: assigned_to_id, // User ID (permanent reference)
      client_name: taskData.client_name || '',
      deadline: taskData.deadline || '',
      status: 'pending',
      priority: taskData.priority || 'Medium',
      acknowledged: false,
      given_by: taskData.given_by || 'admin', // Username (for backward compatibility)
      given_by_id: given_by_id, // User ID (permanent reference)
      assigned_date: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
      completed_date: null,
      time_spent: '',
      // Enhanced comments and notes system
      comments: taskData.comments || [], // Array of comment objects
      assignerNotes: taskData.assignerNotes || '', // Notes visible to both assigner and assignee
      personalNotes: taskData.personalNotes || '', // Private notes for assignee only
      assignerPrivateNotes: taskData.assignerPrivateNotes || '', // Private notes for assigner only
      lastCommentAt: null,
      commentCount: 0,
      taskHash: taskHash, // Add unique hash for better duplicate detection
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const taskDoc = await adminDb.collection('tasks').add(taskToSave);

    // Log activity
    await logActivity({
      action: 'task_created',
      taskId: taskDoc.id,
      userId: taskData.given_by || 'admin',
      tenantId: tenantId, // Multi-tenancy: Include tenant in log
      details: {
        task: taskData.task,
        assigned_to: taskData.assigned_to,
        client_name: taskData.client_name
      }
    });

    // Return the task data with the generated ID
    return {
      id: taskDoc.id,
      ...taskToSave
    };
  } catch (error) {
    throw error;
  }
};

// Create task (alias for addTask to match existing API calls)
// Multi-tenancy: Pass tenantId to addTask
export const createTask = async (taskData, tenantId) => {
  return await addTask(taskData, tenantId);
};

// Find and clean up existing duplicate tasks
// Multi-tenancy: Filter by tenantId if provided
export const findAndCleanupDuplicates = async (tenantId = null) => {
  try {

    let query = adminDb.collection('tasks');

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const tasksSnapshot = await query.get();
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ref: doc.ref,
      ...doc.data()
    }));
    
    // Group tasks by potential duplicate criteria
    const taskGroups = {};
    
    tasks.forEach(task => {
      const key = `${task.task}-${task.assigned_to}-${task.client_name || ''}-${task.deadline}-${task.given_by}`;
      if (!taskGroups[key]) {
        taskGroups[key] = [];
      }
      taskGroups[key].push(task);
    });
    
    // Find groups with duplicates
    const duplicateGroups = Object.values(taskGroups).filter(group => group.length > 1);
    
    if (duplicateGroups.length === 0) {
      return { duplicatesFound: 0, duplicatesRemoved: 0 };
    }
    
    
    let duplicatesRemoved = 0;
    
    for (const group of duplicateGroups) {
      
      // Separate pending and completed tasks
      const pendingTasks = group.filter(t => t.status === 'pending');
      const completedTasks = group.filter(t => t.status === 'done');
      
      // Keep the most recent pending task, delete others
      if (pendingTasks.length > 1) {
        // Sort by creation date (most recent first)
        pendingTasks.sort((a, b) => {
          const aDate = a.createdAt ? a.createdAt.toDate() : new Date(0);
          const bDate = b.createdAt ? b.createdAt.toDate() : new Date(0);
          return bDate - aDate;
        });
        
        // Delete all but the first (most recent)
        const tasksToDelete = pendingTasks.slice(1);
        for (const taskToDelete of tasksToDelete) {
          await taskToDelete.ref.delete();
          duplicatesRemoved++;
          
          // Log the deletion
          await logActivity({
            action: 'duplicate_cleanup',
            taskId: taskToDelete.id,
            userId: 'system',
            details: {
              reason: 'Automated duplicate cleanup',
              keptTaskId: pendingTasks[0].id,
              task: taskToDelete.task
            }
          });
        }
      }
      
      // For completed tasks, keep the first one, delete others
      if (completedTasks.length > 1) {
        const tasksToDelete = completedTasks.slice(1);
        for (const taskToDelete of tasksToDelete) {
          await taskToDelete.ref.delete();
          duplicatesRemoved++;
          
          // Log the deletion
          await logActivity({
            action: 'duplicate_cleanup',
            taskId: taskToDelete.id,
            userId: 'system',
            details: {
              reason: 'Automated duplicate cleanup',
              keptTaskId: completedTasks[0].id,
              task: taskToDelete.task
            }
          });
        }
      }
    }
    
    return { 
      duplicatesFound: duplicateGroups.length, 
      duplicatesRemoved: duplicatesRemoved 
    };
  } catch (error) {
    throw error;
  }
};

// Get duplicate task statistics
// Multi-tenancy: Filter by tenantId if provided
export const getDuplicateTaskStats = async (tenantId = null) => {
  try {
    let query = adminDb.collection('tasks');

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const tasksSnapshot = await query.get();
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group tasks by potential duplicate criteria
    const taskGroups = {};
    
    tasks.forEach(task => {
      const key = `${task.task}-${task.assigned_to}-${task.client_name || ''}-${task.deadline}-${task.given_by}`;
      if (!taskGroups[key]) {
        taskGroups[key] = [];
      }
      taskGroups[key].push(task);
    });
    
    // Find groups with duplicates
    const duplicateGroups = Object.values(taskGroups).filter(group => group.length > 1);
    
    const stats = {
      totalTasks: tasks.length,
      uniqueTasks: Object.keys(taskGroups).length,
      duplicateGroups: duplicateGroups.length,
      totalDuplicates: duplicateGroups.reduce((sum, group) => sum + (group.length - 1), 0),
      duplicateDetails: duplicateGroups.map(group => ({
        taskName: group[0].task,
        assignedTo: group[0].assigned_to,
        count: group.length,
        statuses: group.map(t => t.status)
      }))
    };
    
    return stats;
  } catch (error) {
    throw error;
  }
};

// Get task by name and username
// Multi-tenancy: Filter by tenantId if provided
export const getTaskByName = async (taskName, username, tenantId = null) => {
  try {
    let tasksQuery = adminDb.collection('tasks').where('task', '==', taskName);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      tasksQuery = tasksQuery.where('tenantId', '==', tenantId);
    }

    if (username) {
      tasksQuery = tasksQuery.where('assigned_to', '==', username);
    }

    const querySnapshot = await tasksQuery.limit(1).get();

    if (querySnapshot.empty) {
      return null;
    }

    return convertFirestoreDoc(querySnapshot.docs[0]);
  } catch (error) {
    throw error;
  }
};

// Update task by name and username - ROBUST DUPLICATE HANDLING
// Multi-tenancy: Filter and verify by tenantId if provided
export const updateTaskByName = async (taskName, username, updateData, tenantId = null) => {
  try {
    // Find ALL tasks with this name and username (to handle duplicates)
    let tasksQuery = adminDb
      .collection('tasks')
      .where('assigned_to', '==', username)
      .where('task', '==', taskName);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      tasksQuery = tasksQuery.where('tenantId', '==', tenantId);
    }

    const tasksSnapshot = await tasksQuery.get();
    
    if (tasksSnapshot.empty) {
      throw new Error('Task not found');
    }
    
    const dataWithTimestamp = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (updateData.status === 'done') {
      dataWithTimestamp.completed_date = new Date().toISOString();
    }
    
    // Handle multiple duplicate tasks
    const taskDocs = tasksSnapshot.docs;
    const updatedTasks = [];
    
    
    if (taskDocs.length === 1) {
      // Single task - update normally
      const taskDoc = taskDocs[0];
      await taskDoc.ref.update(dataWithTimestamp);
      updatedTasks.push({ id: taskDoc.id, ...taskDoc.data(), ...dataWithTimestamp });
    } else {
      // Multiple duplicate tasks found
      
      // Strategy: Update the most recent pending task, delete the rest
      const pendingTasks = taskDocs.filter(doc => doc.data().status === 'pending');
      const completedTasks = taskDocs.filter(doc => doc.data().status === 'done');
      
      if (pendingTasks.length > 0) {
        // Sort by creation date (most recent first)
        pendingTasks.sort((a, b) => {
          const aDate = a.data().createdAt ? a.data().createdAt.toDate() : new Date(0);
          const bDate = b.data().createdAt ? b.data().createdAt.toDate() : new Date(0);
          return bDate - aDate;
        });
        
        // Update the most recent pending task
        const taskToUpdate = pendingTasks[0];
        await taskToUpdate.ref.update(dataWithTimestamp);
        updatedTasks.push({ id: taskToUpdate.id, ...taskToUpdate.data(), ...dataWithTimestamp });
        
        // Delete other pending duplicates
        const tasksToDelete = pendingTasks.slice(1);
        for (const duplicateTask of tasksToDelete) {
          await duplicateTask.ref.delete();
          
          // Log the deletion
          await logActivity({
            action: 'duplicate_task_deleted',
            taskId: duplicateTask.id,
            userId: username,
            details: {
              reason: 'Duplicate task cleanup',
              originalTaskId: taskToUpdate.id,
              task: taskName
            }
          });
        }
        
      } else if (completedTasks.length > 0) {
        // All tasks are already completed - just return the first one
        const taskDoc = completedTasks[0];
        updatedTasks.push({ id: taskDoc.id, ...taskDoc.data() });
      }
    }
    
    return { 
      success: true, 
      task: updatedTasks[0],
      duplicatesHandled: taskDocs.length > 1,
      duplicateCount: taskDocs.length
    };
  } catch (error) {
    throw error;
  }
};

// Update task status
// Multi-tenancy: Filter and verify by tenantId if provided
export const updateTaskStatus = async (username, taskName, newStatus = 'done', tenantId = null) => {
  try {
    // Find the task by name and username
    let tasksQuery = adminDb
      .collection('tasks')
      .where('assigned_to', '==', username)
      .where('task', '==', taskName)
      .limit(1);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      tasksQuery = tasksQuery.where('tenantId', '==', tenantId);
    }

    const tasksSnapshot = await tasksQuery.get();
    
    if (tasksSnapshot.empty) {
      throw new Error('Task not found');
    }
    
    const taskDoc = tasksSnapshot.docs[0];
    const currentTask = taskDoc.data();
    
    if (currentTask.status !== newStatus) {
      const updateData = {
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (newStatus === 'done') {
        const completedDate = new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0];
        updateData.completed_date = completedDate;
        
        // Calculate time spent
        let timeSpent = '';
        if (currentTask.assigned_date || currentTask.createdAt) {
          try {
            const startDate = new Date(currentTask.assigned_date || currentTask.createdAt.toDate());
            const endDate = new Date();
            const timeDiff = endDate - startDate;
            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (days > 0) {
              timeSpent = `${days} days, ${hours}:${minutes.toString().padStart(2, '0')}:00`;
            } else {
              timeSpent = `${hours}:${minutes.toString().padStart(2, '0')}:00`;
            }
          } catch (timeError) {
            timeSpent = 'N/A';
          }
        }
        updateData.time_spent = timeSpent;
      }
      
      // Update the task
      await taskDoc.ref.update(updateData);
      
      // Log activity
      await logActivity({
        action: 'task_status_updated',
        taskId: taskDoc.id,
        userId: username,
        details: {
          task: taskName,
          oldStatus: currentTask.status,
          newStatus: newStatus,
          completed_date: updateData.completed_date || null,
          time_spent: updateData.time_spent || null
        }
      });
      
      return true;
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Multi-tenancy: Verify tenantId if provided
export const getTaskById = async (taskId, tenantId = null) => {
  try {
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get();

    if (!taskDoc.exists) {
      return null;
    }

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && taskDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: Task belongs to different organization');
    }

    return convertFirestoreDoc(taskDoc);
  } catch (error) {
    throw error;
  }
};

// Multi-tenancy: Filter and verify by tenantId if provided
export const findTaskByIdentifier = async (identifier, username = null, tenantId = null) => {
  try {
    // First try to get by ID
    try {
      const taskDoc = await adminDb.collection('tasks').doc(identifier).get();
      if (taskDoc.exists) {
        const task = convertFirestoreDoc(taskDoc);
        // Multi-tenancy: Verify task belongs to tenant
        if (tenantId && task.tenantId !== tenantId) {
          return null; // Task belongs to different tenant
        }
        if (!username || task.assigned_to === username) {
          return task;
        }
      }
    } catch (idError) {
      // Not a valid ID, continue to name search
    }

    // If not found by ID, try to find by name
    let tasksQuery = adminDb.collection('tasks').where('task', '==', identifier);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      tasksQuery = tasksQuery.where('tenantId', '==', tenantId);
    }

    if (username) {
      tasksQuery = tasksQuery.where('assigned_to', '==', username);
    }

    const querySnapshot = await tasksQuery.limit(1).get();

    if (!querySnapshot.empty) {
      return convertFirestoreDoc(querySnapshot.docs[0]);
    }

    return null;
  } catch (error) {
    throw error;
  }
};

// Search tasks
export const searchTasks = async (searchTerm, filters = {}) => {
  try {
    let tasks = await getTasks(filters);
    
    if (!searchTerm) {
      return tasks;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    return tasks.filter(task => {
      const searchableFields = [
        task.task || '',
        task.client_name || '',
        task.given_by || '',
        task.assigned_to || '',
        task.priority || '',
        task.status || ''
      ];
      
      return searchableFields.some(field => 
        field.toLowerCase().includes(term)
      );
    });
  } catch (error) {
    throw error;
  }
};

// Update task by ID
// Multi-tenancy: Verify tenantId if provided
export const updateTask = async (taskId, updateData, tenantId = null) => {
  try {
    // Get the current task to check if it exists
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get();

    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    const currentTask = taskDoc.data();

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && currentTask.tenantId !== tenantId) {
      throw new Error('Unauthorized: Task belongs to different organization');
    }
    
    // Prepare update data with validation
    const dataWithTimestamp = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Handle task name update
    if (updateData.task !== undefined) {
      if (!updateData.task.trim()) {
        throw new Error('Task description cannot be empty');
      }
      dataWithTimestamp.task = updateData.task.trim();
    }
    
    // Handle client name update
    if (updateData.client_name !== undefined) {
      dataWithTimestamp.client_name = updateData.client_name.trim();
    }
    
    // Handle deadline update
    if (updateData.deadline !== undefined) {
      if (updateData.deadline && new Date(updateData.deadline) < new Date().setHours(0,0,0,0)) {
        throw new Error('Deadline cannot be in the past');
      }
      dataWithTimestamp.deadline = updateData.deadline;
    }
    
    // Handle priority update
    if (updateData.priority !== undefined) {
      if (!['High', 'Medium', 'Low'].includes(updateData.priority)) {
        throw new Error('Invalid priority level');
      }
      dataWithTimestamp.priority = updateData.priority;
    }
    
    // Handle status update
    if (updateData.status !== undefined) {
      dataWithTimestamp.status = updateData.status;
      
      if (updateData.status === 'done' && currentTask.status !== 'done') {
        // Calculate completion details
        const completedDate = new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0];
        dataWithTimestamp.completed_date = completedDate;
        
        // Calculate time spent
        let timeSpent = '';
        if (currentTask.assigned_date || currentTask.createdAt) {
          try {
            const startDate = new Date(currentTask.assigned_date || currentTask.createdAt.toDate());
            const endDate = new Date();
            const timeDiff = endDate - startDate;
            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (days > 0) {
              timeSpent = `${days} days, ${hours}:${minutes.toString().padStart(2, '0')}:00`;
            } else {
              timeSpent = `${hours}:${minutes.toString().padStart(2, '0')}:00`;
            }
          } catch (timeError) {
            timeSpent = 'N/A';
          }
        }
        dataWithTimestamp.time_spent = timeSpent;
      } else if (updateData.status === 'pending' && currentTask.status === 'done') {
        // If changing from done back to pending, clear completion data
        dataWithTimestamp.completed_date = null;
        dataWithTimestamp.time_spent = '';
      }
    }
    
    // Update the task document
    await adminDb.collection('tasks').doc(taskId).update(dataWithTimestamp);
    
    // Log the activity
    await logActivity({
      action: 'task_updated',
      taskId: taskId,
      userId: currentTask.given_by || 'system',
      details: {
        taskName: dataWithTimestamp.task || currentTask.task,
        updatedFields: Object.keys(dataWithTimestamp).filter(key => !key.includes('At')),
        updatedBy: currentTask.given_by || 'system'
      }
    });
    
    return { success: true, task: { ...currentTask, ...dataWithTimestamp } };
  } catch (error) {
    throw error;
  }
};

// Multi-tenancy: Verify tenantId if provided
export const deleteTask = async (taskId, tenantId = null) => {
  try {
    // Check if task exists first
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get();

    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    const taskData = taskDoc.data();

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && taskData.tenantId !== tenantId) {
      throw new Error('Unauthorized: Task belongs to different organization');
    }
    
    // Delete the task
    await adminDb.collection('tasks').doc(taskId).delete();
    
    // Log the deletion
    await logActivity({
      action: 'task_deleted',
      taskId: taskId,
      userId: taskData.given_by || 'system',
      details: {
        taskName: taskData.task,
        assignedTo: taskData.assigned_to,
        clientName: taskData.client_name || '',
        deletedBy: taskData.given_by || 'system'
      }
    });
    
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Add comment to task
// Multi-tenancy: Verify tenantId if provided
export const addTaskComment = async (taskId, commentData, tenantId = null) => {
  try {
    if (!taskId || !commentData) {
      throw new Error('Task ID and comment data are required');
    }

    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && taskDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: Task belongs to different organization');
    }

    const comment = {
      id: `comment_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      author: commentData.author,
      authorRole: commentData.authorRole || 'user',
      content: commentData.content,
      timestamp: new Date().toISOString(),
      isEdited: false,
      editedAt: null
    };

    const taskData = taskDoc.data();
    const updatedComments = [...(taskData.comments || []), comment];

    await taskRef.update({
      comments: updatedComments,
      commentCount: updatedComments.length,
      lastCommentAt: comment.timestamp,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log activity
    await logActivity({
      action: 'comment_added',
      taskId: taskId,
      userId: commentData.author,
      details: {
        commentId: comment.id,
        content: commentData.content.substring(0, 100) + (commentData.content.length > 100 ? '...' : '')
      }
    });

    return { success: true, comment: comment };
  } catch (error) {
    throw error;
  }
};

// Update task notes
// Multi-tenancy: Verify tenantId if provided
export const updateTaskNotes = async (taskId, notesData, userId, tenantId = null) => {
  try {
    if (!taskId || !notesData) {
      throw new Error('Task ID and notes data are required');
    }

    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && taskDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: Task belongs to different organization');
    }

    const taskData = taskDoc.data();
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update different types of notes based on permissions
    if (notesData.assignerNotes !== undefined) {
      updateData.assignerNotes = notesData.assignerNotes;
    }
    
    if (notesData.personalNotes !== undefined && userId === taskData.assigned_to) {
      updateData.personalNotes = notesData.personalNotes;
    }
    
    if (notesData.assignerPrivateNotes !== undefined && userId === taskData.given_by) {
      updateData.assignerPrivateNotes = notesData.assignerPrivateNotes;
    }

    await taskRef.update(updateData);

    // Log activity
    await logActivity({
      action: 'notes_updated',
      taskId: taskId,
      userId: userId,
      details: {
        notesType: Object.keys(notesData).join(', ')
      }
    });

    return { success: true, message: 'Notes updated successfully' };
  } catch (error) {
    throw error;
  }
};

// Get task comments
// Multi-tenancy: Verify tenantId if provided
export const getTaskComments = async (taskId, tenantId = null) => {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const taskDoc = await adminDb.collection('tasks').doc(taskId).get();

    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && taskDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: Task belongs to different organization');
    }

    const taskData = taskDoc.data();
    return {
      success: true,
      comments: taskData.comments || [],
      commentCount: taskData.commentCount || 0,
      lastCommentAt: taskData.lastCommentAt
    };
  } catch (error) {
    throw error;
  }
};

// Edit task comment
// Multi-tenancy: Verify tenantId if provided
export const editTaskComment = async (taskId, commentId, newContent, userId, tenantId = null) => {
  try {
    if (!taskId || !commentId || !newContent) {
      throw new Error('Task ID, comment ID, and new content are required');
    }

    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    const taskData = taskDoc.data();

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && taskData.tenantId !== tenantId) {
      throw new Error('Unauthorized: Task belongs to different organization');
    }

    const comments = taskData.comments || [];
    const commentIndex = comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
      throw new Error('Comment not found');
    }

    const comment = comments[commentIndex];
    if (comment.author !== userId) {
      throw new Error('You can only edit your own comments');
    }

    comments[commentIndex] = {
      ...comment,
      content: newContent,
      isEdited: true,
      editedAt: new Date().toISOString()
    };

    await taskRef.update({
      comments: comments,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log activity
    await logActivity({
      action: 'comment_edited',
      taskId: taskId,
      userId: userId,
      details: {
        commentId: commentId,
        content: newContent.substring(0, 100) + (newContent.length > 100 ? '...' : '')
      }
    });

    return { success: true, comment: comments[commentIndex] };
  } catch (error) {
    throw error;
  }
};

// Delete task comment
// Multi-tenancy: Verify tenantId if provided
export const deleteTaskComment = async (taskId, commentId, userId, tenantId = null) => {
  try {
    if (!taskId || !commentId) {
      throw new Error('Task ID and comment ID are required');
    }

    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    const taskData = taskDoc.data();

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && taskData.tenantId !== tenantId) {
      throw new Error('Unauthorized: Task belongs to different organization');
    }

    const comments = taskData.comments || [];
    const commentIndex = comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
      throw new Error('Comment not found');
    }

    const comment = comments[commentIndex];
    if (comment.author !== userId) {
      throw new Error('You can only delete your own comments');
    }

    comments.splice(commentIndex, 1);

    await taskRef.update({
      comments: comments,
      commentCount: comments.length,
      lastCommentAt: comments.length > 0 ? comments[comments.length - 1].timestamp : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log activity
    await logActivity({
      action: 'comment_deleted',
      taskId: taskId,
      userId: userId,
      details: {
        commentId: commentId
      }
    });

    return { success: true, message: 'Comment deleted successfully' };
  } catch (error) {
    throw error;
  }
};

// Save multiple tasks (batch operation)
// Multi-tenancy: Requires tenantId to assign all tasks to organization
export const saveTasks = async (tasks, tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required for batch creating tasks');
    }

    const batch = adminDb.batch();

    tasks.forEach(taskData => {
      const taskRef = adminDb.collection('tasks').doc();
      batch.set(taskRef, {
        tenantId: tenantId, // Multi-tenancy: Assign all tasks to tenant
        ...taskData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    return true;
  } catch (error) {
    throw error;
  }
};

// DAILY TASKS COLLECTION OPERATIONS - COMPLETE IMPLEMENTATION

// Add or update daily task entry
// Multi-tenancy: Requires tenantId to assign daily task to organization
export const addDailyTask = async (dailyTaskData, tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required for creating daily tasks');
    }


    const today = dailyTaskData.date;
    const username = dailyTaskData.username;

    // Validate required fields
    if (!username || !today) {
      throw new Error('Username and date are required');
    }

    // Check if entry already exists for this user and date within tenant
    let existingQuery = adminDb
      .collection('dailyTasks')
      .where('username', '==', username)
      .where('date', '==', today);

    // Multi-tenancy: Scope check to tenant
    if (tenantId) {
      existingQuery = existingQuery.where('tenantId', '==', tenantId);
    }

    const existingSnapshot = await existingQuery.limit(1).get();

    // Get user IDs for permanent reference
    const user = await getUserByUsername(username, tenantId);
    const user_id = user?.id || null;

    const submittedByUser = await getUserByUsername(dailyTaskData.submittedBy || username, tenantId);
    const submitted_by_id = submittedByUser?.id || null;

    const taskToSave = {
      tenantId: tenantId, // Multi-tenancy: Assign daily task to tenant
      username: username, // Username (for backward compatibility)
      user_id: user_id, // User ID (permanent reference)
      date: today,
      tasks: dailyTaskData.tasks || [],
      totalHours: dailyTaskData.totalHours || 0,
      notes: dailyTaskData.notes || '',
      submittedBy: dailyTaskData.submittedBy || username, // Username (for backward compatibility)
      submitted_by_id: submitted_by_id, // User ID (permanent reference)
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: dailyTaskData.metadata || {}
    };

    let docRef;

    if (!existingSnapshot.empty) {
      // Update existing entry
      const docId = existingSnapshot.docs[0].id;

      await adminDb.collection('dailyTasks').doc(docId).update({
        ...taskToSave,
        submittedAt: existingSnapshot.docs[0].data().submittedAt // Keep original submission time
      });
      docRef = { id: docId };
    } else {
      // Create new entry
      docRef = await adminDb.collection('dailyTasks').add(taskToSave);
    }
    
    // Log activity
    try {
      await logActivity({
        action: 'daily_task_logged',
        dailyTaskId: docRef.id,
        userId: username,
        details: {
          date: today,
          totalHours: dailyTaskData.totalHours,
          taskCount: dailyTaskData.tasks.length
        }
      });
    } catch (logError) {
    }
    
    
    return {
      id: docRef.id,
      ...taskToSave
    };
  } catch (error) {
    throw error;
  }
};

// Get daily tasks with filters
// Multi-tenancy: Filter by tenantId if provided in filters
export const getDailyTasks = async (filters = {}) => {
  try {

    let dailyTasksQuery = adminDb.collection('dailyTasks');

    // Multi-tenancy: Filter by tenantId if provided
    if (filters.tenantId) {
      dailyTasksQuery = dailyTasksQuery.where('tenantId', '==', filters.tenantId);
    }

    // Apply username filter
    if (filters.username) {
      dailyTasksQuery = dailyTasksQuery.where('username', '==', filters.username);
    }

    // Apply date filter
    if (filters.date) {
      dailyTasksQuery = dailyTasksQuery.where('date', '==', filters.date);
    }
    
    // Execute query
    const dailyTasksSnapshot = await dailyTasksQuery.get();
    
    
    let dailyTasks = [];
    
    dailyTasksSnapshot.forEach(doc => {
      const taskData = convertFirestoreDoc(doc);
      if (taskData) {
        dailyTasks.push(taskData);
      }
    });
    
    // Apply date range filters in memory if needed
    if (filters.startDate && filters.endDate) {
      const originalCount = dailyTasks.length;
      dailyTasks = dailyTasks.filter(task => {
        return task.date >= filters.startDate && task.date <= filters.endDate;
      });
    } else if (filters.startDate) {
      dailyTasks = dailyTasks.filter(task => task.date >= filters.startDate);
    } else if (filters.endDate) {
      dailyTasks = dailyTasks.filter(task => task.date <= filters.endDate);
    }
    
    // Sort by date descending
    dailyTasks.sort((a, b) => {
      const aDate = new Date(a.date || 0);
      const bDate = new Date(b.date || 0);
      return bDate - aDate;
    });
    
    return dailyTasks;
  } catch (error) {
    throw error;
  }
};

// Get all users' daily tasks (admin only)
export const getAllUsersDailyTasks = async (filters = {}) => {
  try {
    
    // Get all daily tasks (don't filter by username for admin)
    const allFilters = { ...filters };
    delete allFilters.username; // Remove username filter to get all users
    
    const dailyTasks = await getDailyTasks(allFilters);
    
    
    const summary = {
      totalEntries: dailyTasks.length,
      uniqueUsers: [...new Set(dailyTasks.map(t => t.username))].length,
      totalHours: dailyTasks.reduce((sum, task) => sum + (task.totalHours || 0), 0),
      totalTasks: dailyTasks.reduce((sum, task) => sum + (task.tasks?.length || 0), 0)
    };
    
    
    return {
      dailyTasks,
      summary
    };
  } catch (error) {
    throw error;
  }
};

// Delete daily task entry
// Multi-tenancy: Filter by tenantId if provided
export const deleteDailyTask = async (username, date, tenantId = null) => {
  try {

    let dailyTaskQuery = adminDb
      .collection('dailyTasks')
      .where('username', '==', username)
      .where('date', '==', date);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      dailyTaskQuery = dailyTaskQuery.where('tenantId', '==', tenantId);
    }

    const dailyTaskSnapshot = await dailyTaskQuery.limit(1).get();

    if (!dailyTaskSnapshot.empty) {
      const docId = dailyTaskSnapshot.docs[0].id;
      
      await adminDb.collection('dailyTasks').doc(docId).delete();
      
      // Log activity
      try {
        await logActivity({
          action: 'daily_task_deleted',
          dailyTaskId: docId,
          userId: username,
          details: {
            date: date
          }
        });
      } catch (logError) {
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    throw error;
  }
};

// Get daily task analytics
export const getDailyTaskAnalytics = async (filters = {}) => {
  try {
    
    // Get all daily tasks for analytics
    const allFilters = { ...filters };
    delete allFilters.username; // Remove username filter for analytics
    
    const dailyTasks = await getDailyTasks(allFilters);
    
    
    // Calculate analytics
    const userStats = {};
    const categoryStats = {};
    let totalHours = 0;
    let totalTasks = 0;
    
    dailyTasks.forEach(entry => {
      const username = entry.username;
      
      if (!userStats[username]) {
        userStats[username] = {
          totalHours: 0,
          totalTasks: 0,
          totalEntries: 0
        };
      }
      
      userStats[username].totalHours += entry.totalHours || 0;
      userStats[username].totalTasks += entry.tasks?.length || 0;
      userStats[username].totalEntries += 1;
      
      totalHours += entry.totalHours || 0;
      totalTasks += entry.tasks?.length || 0;
      
      // Category breakdown
      entry.tasks?.forEach(task => {
        const category = task.category || 'general';
        categoryStats[category] = (categoryStats[category] || 0) + (task.timeSpent || 0);
      });
    });
    
    const analytics = {
      userStats,
      categoryStats,
      totalHours,
      totalTasks,
      totalEntries: dailyTasks.length,
      uniqueUsers: Object.keys(userStats).length
    };

    return analytics;
  } catch (error) {
    throw error;
  }
};

// CLIENT MANAGEMENT OPERATIONS

// Load all clients from Firebase
// Multi-tenancy: Filter by tenantId if provided
export const loadClientsFromFirebase = async (tenantId = null) => {
  try {
    let query = adminDb.collection('clients');

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const clientsSnapshot = await query.orderBy('createdAt', 'desc').get();

    if (clientsSnapshot.empty) {
      return [];
    }
    
    const clients = [];
    clientsSnapshot.forEach(doc => {
      const clientData = convertFirestoreDoc(doc);
      if (clientData) {
        // Parse JSON fields
        if (clientData.tags && typeof clientData.tags === 'string') {
          try {
            clientData.tags = JSON.parse(clientData.tags);
          } catch (e) {
            clientData.tags = [];
          }
        }
        if (clientData.assignedUsers && typeof clientData.assignedUsers === 'string') {
          try {
            clientData.assignedUsers = JSON.parse(clientData.assignedUsers);
          } catch (e) {
            clientData.assignedUsers = [];
          }
        }
        clients.push(clientData);
      }
    });
    
    return clients;
  } catch (error) {
    throw error;
  }
};

// Get all clients with enhanced data
// Multi-tenancy: Pass tenantId through to underlying functions
export const getClientsWithData = async (tenantId = null) => {
  try {
    const clients = await loadClientsFromFirebase(tenantId);
    const tasks = await getTasks({ tenantId });
    
    // Enhance clients with task data
    const enhancedClients = clients.map(client => {
      const clientTasks = tasks.filter(task => task.client_name === client.name);
      
      return {
        ...client,
        totalTasks: clientTasks.length,
        completedTasks: clientTasks.filter(t => t.status === 'done').length,
        pendingTasks: clientTasks.filter(t => t.status === 'pending').length,
        overdueTasks: clientTasks.filter(t => {
          if (t.status === 'pending' && t.deadline) {
            return new Date(t.deadline) < new Date();
          }
          return false;
        }).length,
        lastTaskDate: clientTasks.length > 0 ? 
          Math.max(...clientTasks.map(t => new Date(t.createdAt || 0).getTime())) : null
      };
    });
    
    return enhancedClients;
  } catch (error) {
    throw error;
  }
};

// Add a new client to Firebase
// Multi-tenancy: Requires tenantId to assign client to organization
export const addClient = async (clientData, tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required for creating clients');
    }

    // Validate required fields
    if (!clientData.name || !clientData.email) {
      throw new Error('Client name and email are required');
    }

    // Check if client with same email already exists within tenant
    const existingClient = await adminDb
      .collection('clients')
      .where('email', '==', clientData.email.trim())
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();

    if (!existingClient.empty) {
      throw new Error('A client with this email already exists in this organization');
    }
    
    // Prepare client data
    const clientToSave = {
      tenantId: tenantId, // Multi-tenancy: Assign client to tenant
      name: clientData.name.trim(),
      email: clientData.email.trim(),
      phone: clientData.phone?.trim() || '',
      website: clientData.website?.trim() || '',
      address: clientData.address?.trim() || '',
      industry: clientData.industry?.trim() || '',
      status: clientData.status || 'Active',
      priority: clientData.priority || 'Medium',
      description: clientData.description?.trim() || '',
      contractValue: clientData.contractValue?.trim() || '',
      contractStart: clientData.contractStart || '',
      contractEnd: clientData.contractEnd || '',
      // Social media
      facebook: clientData.facebook?.trim() || '',
      instagram: clientData.instagram?.trim() || '',
      twitter: clientData.twitter?.trim() || '',
      linkedin: clientData.linkedin?.trim() || '',
      youtube: clientData.youtube?.trim() || '',
      // Additional details
      timezone: clientData.timezone?.trim() || '',
      preferredContact: clientData.preferredContact || 'email',
      tags: JSON.stringify(clientData.tags || []),
      notes: clientData.notes?.trim() || '',
      assignedUsers: JSON.stringify(clientData.assignedUsers || []),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: clientData.createdBy || 'admin'
    };
    
    const clientDoc = await adminDb.collection('clients').add(clientToSave);
    
    // Log activity
    await logActivity({
      action: 'client_created',
      clientId: clientDoc.id,
      userId: clientData.createdBy || 'admin',
      tenantId: tenantId, // Multi-tenancy: Include tenant in log
      details: {
        clientName: clientData.name,
        email: clientData.email,
        industry: clientData.industry
      }
    });
    
    return {
      id: clientDoc.id,
      ...clientToSave,
      tags: clientData.tags || [],
      assignedUsers: clientData.assignedUsers || []
    };
  } catch (error) {
    throw error;
  }
};

// Get client by ID
// Multi-tenancy: Verify tenantId if provided
export const getClientById = async (clientId, tenantId = null) => {
  try {
    const clientDoc = await adminDb.collection('clients').doc(clientId).get();

    if (!clientDoc.exists) {
      return null;
    }

    // Multi-tenancy: Verify client belongs to tenant
    if (tenantId && clientDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: Client belongs to different organization');
    }
    
    const clientData = convertFirestoreDoc(clientDoc);
    
    // Parse JSON fields
    if (clientData.tags && typeof clientData.tags === 'string') {
      try {
        clientData.tags = JSON.parse(clientData.tags);
      } catch (e) {
        clientData.tags = [];
      }
    }
    if (clientData.assignedUsers && typeof clientData.assignedUsers === 'string') {
      try {
        clientData.assignedUsers = JSON.parse(clientData.assignedUsers);
      } catch (e) {
        clientData.assignedUsers = [];
      }
    }
    
    return clientData;
  } catch (error) {
    throw error;
  }
};

// Get client by name
// Multi-tenancy: Filter by tenantId if provided
export const getClientByName = async (clientName, tenantId = null) => {
  try {
    let clientQuery = adminDb
      .collection('clients')
      .where('name', '==', clientName.trim());

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      clientQuery = clientQuery.where('tenantId', '==', tenantId);
    }

    const clientSnapshot = await clientQuery.limit(1).get();
    
    if (clientSnapshot.empty) {
      return null;
    }
    
    const clientDoc = clientSnapshot.docs[0];
    const clientData = convertFirestoreDoc(clientDoc);
    
    // Parse JSON fields
    if (clientData.tags && typeof clientData.tags === 'string') {
      try {
        clientData.tags = JSON.parse(clientData.tags);
      } catch (e) {
        clientData.tags = [];
      }
    }
    if (clientData.assignedUsers && typeof clientData.assignedUsers === 'string') {
      try {
        clientData.assignedUsers = JSON.parse(clientData.assignedUsers);
      } catch (e) {
        clientData.assignedUsers = [];
      }
    }
    
    return clientData;
  } catch (error) {
    throw error;
  }
};

// Update client
// Multi-tenancy: Verify tenantId if provided
export const updateClient = async (clientId, updateData, tenantId = null) => {
  try {
    // Get current client to validate update
    const currentClient = await getClientById(clientId, tenantId);
    if (!currentClient) {
      throw new Error('Client not found');
    }
    
    // Check for email conflicts if email is being updated
    if (updateData.email && updateData.email !== currentClient.email) {
      let existingQuery = adminDb
        .collection('clients')
        .where('email', '==', updateData.email.trim());

      // Multi-tenancy: Scope check to tenant if provided
      if (tenantId) {
        existingQuery = existingQuery.where('tenantId', '==', tenantId);
      }

      const existingClient = await existingQuery.limit(1).get();

      if (!existingClient.empty && existingClient.docs[0].id !== clientId) {
        throw new Error('A client with this email already exists in this organization');
      }
    }
    
    // Prepare update data
    const dataToUpdate = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Update only provided fields
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name.trim();
    if (updateData.email !== undefined) dataToUpdate.email = updateData.email.trim();
    if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone.trim();
    if (updateData.website !== undefined) dataToUpdate.website = updateData.website.trim();
    if (updateData.address !== undefined) dataToUpdate.address = updateData.address.trim();
    if (updateData.industry !== undefined) dataToUpdate.industry = updateData.industry.trim();
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
    if (updateData.priority !== undefined) dataToUpdate.priority = updateData.priority;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description.trim();
    if (updateData.contractValue !== undefined) dataToUpdate.contractValue = updateData.contractValue.trim();
    if (updateData.contractStart !== undefined) dataToUpdate.contractStart = updateData.contractStart;
    if (updateData.contractEnd !== undefined) dataToUpdate.contractEnd = updateData.contractEnd;
    
    // Social media fields
    if (updateData.facebook !== undefined) dataToUpdate.facebook = updateData.facebook.trim();
    if (updateData.instagram !== undefined) dataToUpdate.instagram = updateData.instagram.trim();
    if (updateData.twitter !== undefined) dataToUpdate.twitter = updateData.twitter.trim();
    if (updateData.linkedin !== undefined) dataToUpdate.linkedin = updateData.linkedin.trim();
    if (updateData.youtube !== undefined) dataToUpdate.youtube = updateData.youtube.trim();
    
    // Additional fields
    if (updateData.timezone !== undefined) dataToUpdate.timezone = updateData.timezone.trim();
    if (updateData.preferredContact !== undefined) dataToUpdate.preferredContact = updateData.preferredContact;
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes.trim();
    
    // Handle arrays
    if (updateData.tags !== undefined) dataToUpdate.tags = JSON.stringify(updateData.tags);
    if (updateData.assignedUsers !== undefined) dataToUpdate.assignedUsers = JSON.stringify(updateData.assignedUsers);
    
    // Update the client document
    await adminDb.collection('clients').doc(clientId).update(dataToUpdate);
    
    // Log activity
    await logActivity({
      action: 'client_updated',
      clientId: clientId,
      userId: updateData.updatedBy || 'admin',
      details: {
        clientName: dataToUpdate.name || currentClient.name,
        updatedFields: Object.keys(dataToUpdate).filter(key => key !== 'updatedAt')
      }
    });
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Delete client
// Multi-tenancy: Verify tenantId if provided
export const deleteClient = async (clientId, tenantId = null) => {
  try {
    // Check if client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Check if client has any active tasks
    const tasks = await getTasks({ tenantId });
    const clientTasks = tasks.filter(task => task.client_name === client.name);
    const activeTasks = clientTasks.filter(task => task.status === 'pending');
    
    if (activeTasks.length > 0) {
      throw new Error(`Cannot delete client ${client.name}. Client has ${activeTasks.length} active tasks. Please complete or reassign these tasks first.`);
    }
    
    // Delete the client
    await adminDb.collection('clients').doc(clientId).delete();

    // Delete client activities
    let activitiesQuery = adminDb.collection('client_activities').where('clientId', '==', clientId);
    // Multi-tenancy: Scope deletion to tenant if provided
    if (tenantId) {
      activitiesQuery = activitiesQuery.where('tenantId', '==', tenantId);
    }
    const activitiesSnapshot = await activitiesQuery.get();
    const batch = adminDb.batch();
    activitiesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    // Log activity
    await logActivity({
      action: 'client_deleted',
      clientId: clientId,
      userId: 'admin',
      details: {
        clientName: client.name,
        email: client.email,
        totalTasks: clientTasks.length
      }
    });
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Search clients
// Multi-tenancy: Pass tenantId through to loadClientsFromFirebase
export const searchClients = async (searchTerm, filters = {}) => {
  try {
    let clients = await loadClientsFromFirebase(filters.tenantId);
    
    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      clients = clients.filter(client => client.status === filters.status);
    }
    
    // Apply priority filter
    if (filters.priority && filters.priority !== 'all') {
      clients = clients.filter(client => client.priority === filters.priority);
    }
    
    // Apply industry filter
    if (filters.industry && filters.industry !== 'all') {
      clients = clients.filter(client => client.industry === filters.industry);
    }
    
    // Apply search term
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      clients = clients.filter(client => {
        const searchableFields = [
          client.name || '',
          client.email || '',
          client.industry || '',
          client.phone || '',
          client.website || '',
          ...(client.tags || [])
        ];
        
        return searchableFields.some(field => 
          field.toLowerCase().includes(term)
        );
      });
    }
    
    return clients;
  } catch (error) {
    throw error;
  }
};

// Get client analytics
// Multi-tenancy: Pass tenantId through to underlying functions
export const getClientAnalytics = async (tenantId = null) => {
  try {
    const clients = await getClientsWithData(tenantId);

    // Calculate client distribution by status
    const statusStats = {
      Active: clients.filter(c => c.status === 'Active').length,
      Inactive: clients.filter(c => c.status === 'Inactive').length,
      Prospect: clients.filter(c => c.status === 'Prospect').length,
      'On Hold': clients.filter(c => c.status === 'On Hold').length
    };
    
    // Calculate client distribution by priority
    const priorityStats = {
      High: clients.filter(c => c.priority === 'High').length,
      Medium: clients.filter(c => c.priority === 'Medium').length,
      Low: clients.filter(c => c.priority === 'Low').length
    };
    
    // Calculate industry distribution
    const industryStats = {};
    clients.forEach(client => {
      const industry = client.industry || 'Not Specified';
      industryStats[industry] = (industryStats[industry] || 0) + 1;
    });
    
    // Top clients by task volume
    const topClients = clients
      .filter(c => c.totalTasks > 0)
      .sort((a, b) => b.totalTasks - a.totalTasks)
      .slice(0, 10);
    
    return {
      totalClients: clients.length,
      statusStats,
      priorityStats,
      industryStats,
      topClients,
      clientsWithActiveTasks: clients.filter(c => c.pendingTasks > 0).length,
      clientsWithOverdueTasks: clients.filter(c => c.overdueTasks > 0).length
    };
  } catch (error) {
    throw error;
  }
};

// Get client activities/history
// Multi-tenancy: Filter by tenantId if provided
export const getClientActivities = async (clientId, limit = 50, tenantId = null) => {
  try {
    let query = adminDb
      .collection('client_activities')
      .where('clientId', '==', clientId);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const activitiesSnapshot = await query.orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const activities = [];
    activitiesSnapshot.forEach(doc => {
      const activity = convertFirestoreDoc(doc);
      if (activity) {
        activities.push(activity);
      }
    });
    
    return activities;
  } catch (error) {
    throw error;
  }
};

// Add client activity
// Multi-tenancy: Requires tenantId to assign activity to organization
export const addClientActivity = async (clientId, activityData, tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required for creating client activities');
    }

    const activity = {
      tenantId: tenantId, // Multi-tenancy: Assign activity to tenant
      clientId: clientId,
      activityType: activityData.activityType,
      description: activityData.description,
      createdBy: activityData.createdBy,
      metadata: activityData.metadata || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await adminDb.collection('client_activities').add(activity);
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Get client tasks
// Multi-tenancy: Pass tenantId through to getTasks
export const getClientTasks = async (clientName, tenantId = null) => {
  try {
    const tasks = await getTasks({ tenantId });
    return tasks.filter(task => task.client_name === clientName);
  } catch (error) {
    throw error;
  }
};

// Get client meetings
// Multi-tenancy: Filter by tenantId if provided
export const getClientMeetings = async (clientId, tenantId = null) => {
  try {
    let query = adminDb
      .collection('client_meetings')
      .where('clientId', '==', clientId);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const meetingsSnapshot = await query.orderBy('startDateTime', 'desc').get();
    
    const meetings = [];
    meetingsSnapshot.forEach(doc => {
      const meetingData = convertFirestoreDoc(doc);
      if (meetingData) {
        meetings.push(meetingData);
      }
    });
    
    return meetings;
  } catch (error) {
    throw error;
  }
};

// FILE MANAGEMENT OPERATIONS

// Add a file to Firebase
// Multi-tenancy: Requires tenantId to assign file to organization
export const addFile = async (fileData, tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required for uploading files');
    }

    const fileToSave = {
      tenantId: tenantId, // Multi-tenancy: Assign file to tenant
      name: fileData.name || '',
      filename: fileData.filename || '',
      path: fileData.path || '',
      url: fileData.url || '',
      downloadUrl: fileData.downloadUrl || '',
      size: fileData.size || '',
      sizeBytes: fileData.sizeBytes || 0,
      type: fileData.type || 'other',
      mimeType: fileData.mimeType || '',
      clientId: fileData.clientId || '',
      clientName: fileData.clientName || '',
      description: fileData.description || '',
      tags: fileData.tags || [],
      uploadedBy: fileData.uploadedBy || 'unknown',
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const fileDoc = await adminDb.collection('client_files').add(fileToSave);
    
    // Log activity
    await logActivity({
      action: 'file_uploaded',
      fileId: fileDoc.id,
      userId: fileData.uploadedBy,
      details: {
        filename: fileData.name,
        clientId: fileData.clientId,
        clientName: fileData.clientName,
        size: fileData.size,
        type: fileData.type
      }
    });
    
    return {
      id: fileDoc.id,
      ...fileToSave
    };
  } catch (error) {
    throw error;
  }
};

// Get all files (with optional filters)
// Multi-tenancy: Filter by tenantId if provided in filters
export const getFiles = async (filters = {}) => {
  try {
    let filesQuery = adminDb.collection('client_files');

    // Multi-tenancy: Filter by tenantId if provided
    if (filters.tenantId) {
      filesQuery = filesQuery.where('tenantId', '==', filters.tenantId);
    }

    // Apply filters
    if (filters.clientId) {
      filesQuery = filesQuery.where('clientId', '==', filters.clientId);
    }

    if (filters.uploadedBy) {
      filesQuery = filesQuery.where('uploadedBy', '==', filters.uploadedBy);
    }

    if (filters.type) {
      filesQuery = filesQuery.where('type', '==', filters.type);
    }

    // Only get active files
    filesQuery = filesQuery.where('status', '==', 'active');
    
    const filesSnapshot = await filesQuery.orderBy('uploadedAt', 'desc').get();
    
    const files = [];
    filesSnapshot.forEach(doc => {
      const fileData = convertFirestoreDoc(doc);
      if (fileData) {
        files.push(fileData);
      }
    });
    
    return files;
  } catch (error) {
    throw error;
  }
};

// Get file by ID
// Multi-tenancy: Verify tenantId if provided
export const getFileById = async (fileId, tenantId = null) => {
  try {
    const fileDoc = await adminDb.collection('client_files').doc(fileId).get();

    if (!fileDoc.exists) {
      return null;
    }

    // Multi-tenancy: Verify file belongs to tenant
    if (tenantId && fileDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: File belongs to different organization');
    }

    return convertFirestoreDoc(fileDoc);
  } catch (error) {
    throw error;
  }
};

// Update file information
// Multi-tenancy: Verify tenantId if provided
export const updateFile = async (fileId, updateData, tenantId = null) => {
  try {
    const fileDoc = await adminDb.collection('client_files').doc(fileId).get();

    if (!fileDoc.exists) {
      throw new Error('File not found');
    }

    // Multi-tenancy: Verify file belongs to tenant
    if (tenantId && fileDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: File belongs to different organization');
    }
    
    const dataWithTimestamp = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await adminDb.collection('client_files').doc(fileId).update(dataWithTimestamp);
    
    // Log activity
    await logActivity({
      action: 'file_updated',
      fileId: fileId,
      userId: updateData.updatedBy || 'system',
      details: {
        changes: Object.keys(updateData)
      }
    });
    
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Delete file (soft delete)
// Multi-tenancy: Verify tenantId if provided
export const deleteFile = async (fileId, deletedBy = 'system', tenantId = null) => {
  try {
    const fileDoc = await adminDb.collection('client_files').doc(fileId).get();

    if (!fileDoc.exists) {
      throw new Error('File not found');
    }

    // Multi-tenancy: Verify file belongs to tenant
    if (tenantId && fileDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: File belongs to different organization');
    }
    
    await adminDb.collection('client_files').doc(fileId).update({
      status: 'deleted',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: deletedBy,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Log activity
    await logActivity({
      action: 'file_deleted',
      fileId: fileId,
      userId: deletedBy,
      details: {
        filename: fileDoc.data().name
      }
    });
    
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Get client files
// Multi-tenancy: Filter by tenantId if provided
export const getClientFiles = async (clientId, tenantId = null) => {
  try {
    let query = adminDb
      .collection('client_files')
      .where('clientId', '==', clientId)
      .where('status', '==', 'active');

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const filesSnapshot = await query.orderBy('uploadedAt', 'desc').get();
    
    const files = [];
    filesSnapshot.forEach(doc => {
      const fileData = convertFirestoreDoc(doc);
      if (fileData) {
        files.push(fileData);
      }
    });
    
    return files;
  } catch (error) {
    throw error;
  }
};

// Update the main getClients function to use Firebase
// Multi-tenancy: Pass tenantId through to getClientsWithData
export const getClientsFromFirebase = async (tenantId = null) => {
  return await getClientsWithData(tenantId);
};

// ATTENDANCE MANAGEMENT OPERATIONS

// Load attendance records from Firebase
// Multi-tenancy: Filter by tenantId if provided in filters
export const loadAttendanceRecords = async (filters = {}) => {
  try {
    let attendanceQuery = adminDb.collection('attendance');

    // Multi-tenancy: Filter by tenantId if provided
    if (filters.tenantId) {
      attendanceQuery = attendanceQuery.where('tenantId', '==', filters.tenantId);
    }

    // Only filter by username in the query to avoid composite index requirement
    if (filters.username && typeof filters.username === 'string' && filters.username.trim()) {
      attendanceQuery = attendanceQuery.where('username', '==', filters.username.trim());
    }

    // Apply limit if provided (for pagination)
    // IMPORTANT: If date filters are provided, we DON'T use a limit because
    // date filtering happens AFTER the query, not in the query itself
    // So we need to fetch ALL records for the user, then filter by date
    if (!filters.startDate && !filters.endDate) {
      // Only apply limit when there's no date filter
      const limit = filters.limit || 100; // Default to 100 records
      attendanceQuery = attendanceQuery.limit(limit);
    }
    // When date filters are present, no limit - fetch all records for user

    // Get records
    const attendanceSnapshot = await attendanceQuery.get();

    if (attendanceSnapshot.empty) {
      return [];
    }

    let records = [];
    attendanceSnapshot.forEach(doc => {
      const recordData = convertFirestoreDoc(doc);
      if (recordData) {
        records.push(recordData);
      }
    });

    // Apply date filters in memory instead of in the database query
    if (filters.startDate && filters.endDate) {
      records = records.filter(record => {
        const recordDate = record.date;
        return recordDate >= filters.startDate && recordDate <= filters.endDate;
      });
    } else if (filters.startDate) {
      records = records.filter(record => record.date >= filters.startDate);
    } else if (filters.endDate) {
      records = records.filter(record => record.date <= filters.endDate);
    }

    // Fetch profile images for usernames
    const usernames = new Set();
    records.forEach(record => {
      if (record.username) usernames.add(record.username);
    });

    // Create a map of username -> profile image
    const profileImages = {};
    if (usernames.size > 0) {
      const usernameArray = Array.from(usernames);
      let usersQuery = adminDb.collection('users').where('username', 'in', usernameArray.slice(0, 10));

      if (filters.tenantId) {
        usersQuery = usersQuery.where('tenantId', '==', filters.tenantId);
      }

      const usersSnapshot = await usersQuery.get();
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.username && userData.profileImage) {
          profileImages[userData.username] = userData.profileImage;
        }
      });

      // If we have more than 10 usernames, fetch the rest in batches
      if (usernameArray.length > 10) {
        for (let i = 10; i < usernameArray.length; i += 10) {
          const batch = usernameArray.slice(i, i + 10);
          let batchQuery = adminDb.collection('users').where('username', 'in', batch);

          if (filters.tenantId) {
            batchQuery = batchQuery.where('tenantId', '==', filters.tenantId);
          }

          const batchSnapshot = await batchQuery.get();
          batchSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.username && userData.profileImage) {
              profileImages[userData.username] = userData.profileImage;
            }
          });
        }
      }
    }

    // Attach profile images to records
    records.forEach(record => {
      if (record.username && profileImages[record.username]) {
        record.profileImage = profileImages[record.username];
      }
    });

    // Sort in memory by date descending
    records.sort((a, b) => {
      const aDate = new Date(a.date || 0);
      const bDate = new Date(b.date || 0);
      return bDate - aDate; // Descending order (newest first)
    });

    return records;
  } catch (error) {
    throw error;
  }
};

// Load attendance records with pagination (faster for large datasets)
export const loadAttendanceRecordsPaginated = async (filters = {}, pageSize = 30) => {
  try {
    let attendanceQuery = adminDb.collection('attendance');

    // Multi-tenancy: Filter by tenantId if provided
    if (filters.tenantId) {
      attendanceQuery = attendanceQuery.where('tenantId', '==', filters.tenantId);
    }

    // Only filter by username in the query to avoid composite index requirement
    if (filters.username && typeof filters.username === 'string' && filters.username.trim()) {
      attendanceQuery = attendanceQuery.where('username', '==', filters.username.trim());
    }

    // Apply pagination
    attendanceQuery = attendanceQuery.limit(pageSize);

    // If we have a cursor for the next page
    if (filters.lastDocId) {
      const lastDocRef = adminDb.collection('attendance').doc(filters.lastDocId);
      const lastDocSnap = await lastDocRef.get();
      if (lastDocSnap.exists) {
        attendanceQuery = attendanceQuery.startAfter(lastDocSnap);
      }
    }

    const attendanceSnapshot = await attendanceQuery.get();

    if (attendanceSnapshot.empty) {
      return { records: [], hasMore: false, lastDocId: null };
    }

    let records = [];
    attendanceSnapshot.forEach(doc => {
      const recordData = convertFirestoreDoc(doc);
      if (recordData) {
        records.push(recordData);
      }
    });

    // Apply date filters in memory
    if (filters.startDate && filters.endDate) {
      records = records.filter(record => {
        const recordDate = record.date;
        return recordDate >= filters.startDate && recordDate <= filters.endDate;
      });
    } else if (filters.startDate) {
      records = records.filter(record => record.date >= filters.startDate);
    } else if (filters.endDate) {
      records = records.filter(record => record.date <= filters.endDate);
    }

    // Sort in memory by date descending
    records.sort((a, b) => {
      const aDate = new Date(a.date || 0);
      const bDate = new Date(b.date || 0);
      return bDate - aDate;
    });

    // Get the last document ID for pagination
    const lastDocId = attendanceSnapshot.docs.length > 0
      ? attendanceSnapshot.docs[attendanceSnapshot.docs.length - 1].id
      : null;

    // Check if there are more records
    const hasMore = attendanceSnapshot.docs.length === pageSize;

    return {
      records,
      hasMore,
      lastDocId,
      count: records.length
    };
  } catch (error) {
    throw error;
  }
};

// Get today's attendance record for a user
// Multi-tenancy: Filter by tenantId if provided
export const getTodayAttendance = async (username, tenantId = null) => {
  try {
    // Validate username parameter
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return null;
    }

    const trimmedUsername = username.trim();
    // Use India timezone for consistency with markAttendance
    const today = getIndiaDate();

    let attendanceQuery = adminDb
      .collection('attendance')
      .where('username', '==', trimmedUsername)
      .where('date', '==', today);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      attendanceQuery = attendanceQuery.where('tenantId', '==', tenantId);
    }

    const attendanceSnapshot = await attendanceQuery.limit(1).get();
    
    if (attendanceSnapshot.empty) {
      return null;
    }
    
    const doc = attendanceSnapshot.docs[0];
    return convertFirestoreDoc(doc);
  } catch (error) {
    throw error;
  }
};

// Mark attendance for a user
// Multi-tenancy: Requires tenantId to assign attendance to organization
export const markAttendance = async (attendanceData, tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required for marking attendance');
    }

    // Validate required fields
    if (!attendanceData || !attendanceData.username || typeof attendanceData.username !== 'string') {
      throw new Error('Valid username is required for attendance marking');
    }

    const trimmedUsername = attendanceData.username.trim();
    if (!trimmedUsername) {
      throw new Error('Username cannot be empty');
    }

    // Use India timezone for date and time (imported at top of file)
    const today = getIndiaDate();
    const currentTime = getIndiaTime();
    const currentDateTime = getIndiaDateTime();

    // Check if attendance already exists for today within tenant
    const existingAttendance = await getTodayAttendance(trimmedUsername, tenantId);

    if (existingAttendance) {
      throw new Error('Attendance already marked for today');
    }

    // Get attendance settings for deadline
    const settings = await getAttendanceSettings(tenantId);
    const deadlineHour = settings.deadlineHour || 12;
    const deadlineMinute = settings.deadlineMinute || 0;
    const halfDayEnabled = settings.halfDayEnabled !== false;

    // Check if marking attendance after deadline
    const currentHour = currentDateTime.getHours();
    const currentMinute = currentDateTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const deadlineInMinutes = deadlineHour * 60 + deadlineMinute;
    const isAfterDeadline = currentTimeInMinutes >= deadlineInMinutes;

    // Determine status based on time and settings
    // After deadline = half-day (if enabled), Before deadline = present
    const attendanceStatus = (isAfterDeadline && halfDayEnabled) ? 'half-day' : 'present';

    // Get user ID for permanent reference
    const user = await getUserByUsername(trimmedUsername, tenantId);
    const user_id = user?.id || null;

    // Prepare attendance record
    const attendanceRecord = {
      tenantId: tenantId, // Multi-tenancy: Assign attendance to tenant
      username: trimmedUsername, // Username (for backward compatibility)
      user_id: user_id, // User ID (permanent reference)
      date: today,
      workType: attendanceData.workType || 'office', // 'office' or 'wfh'
      status: attendanceStatus,
      checkIn: currentTime,
      checkOut: null,
      totalHours: null,
      notes: attendanceData.notes || '',
      location: attendanceData.location || '',
      markedLate: isAfterDeadline, // Flag to indicate late marking
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const attendanceDoc = await adminDb.collection('attendance').add(attendanceRecord);
    
    // Log activity
    await logActivity({
      action: 'attendance_marked',
      attendanceId: attendanceDoc.id,
      userId: trimmedUsername,
      details: {
        date: today,
        workType: attendanceData.workType,
        checkIn: currentTime,
        status: attendanceStatus,
        markedLate: isAfterDeadline
      }
    });

    const deadlineTime = `${String(deadlineHour).padStart(2, '0')}:${String(deadlineMinute).padStart(2, '0')}`;

    return {
      id: attendanceDoc.id,
      ...attendanceRecord,
      message: isAfterDeadline
        ? `Marked as half-day (attendance after ${deadlineTime} deadline)`
        : 'Attendance marked successfully'
    };
  } catch (error) {
    throw error;
  }
};

// Update attendance record (for check-out, corrections, etc.)
// Multi-tenancy: Verify tenantId if provided
export const updateAttendanceRecord = async (attendanceId, updateData, tenantId = null) => {
  try {
    // Get current attendance record
    const attendanceDoc = await adminDb.collection('attendance').doc(attendanceId).get();

    if (!attendanceDoc.exists) {
      throw new Error('Attendance record not found');
    }

    const currentRecord = attendanceDoc.data();

    // Multi-tenancy: Verify attendance belongs to tenant
    if (tenantId && currentRecord.tenantId !== tenantId) {
      throw new Error('Unauthorized: Attendance record belongs to different organization');
    }
    
    // Prepare update data
    const dataToUpdate = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Handle check-out - Calculate total hours on EVERY clock-out
    if (updateData.checkOut) {
      dataToUpdate.checkOut = updateData.checkOut;

      // Calculate total hours if check-in exists
      if (currentRecord.checkIn) {
        const checkInTime = new Date(`1970-01-01T${currentRecord.checkIn}:00`);
        const checkOutTime = new Date(`1970-01-01T${updateData.checkOut}:00`);

        let totalMinutes = (checkOutTime - checkInTime) / (1000 * 60);

        // Handle case where check-out is next day
        if (totalMinutes < 0) {
          totalMinutes += 24 * 60; // Add 24 hours
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);

        dataToUpdate.totalHours = `${hours}:${minutes.toString().padStart(2, '0')}`;

      } else {
      }
    }
    
    // Handle other updates
    if (updateData.workType !== undefined) dataToUpdate.workType = updateData.workType;
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;
    if (updateData.location !== undefined) dataToUpdate.location = updateData.location;
    if (updateData.autoClockOut !== undefined) dataToUpdate.autoClockOut = updateData.autoClockOut;
    
    // Update the attendance record
    await adminDb.collection('attendance').doc(attendanceId).update(dataToUpdate);
    
    // Log activity
    await logActivity({
      action: 'attendance_updated',
      attendanceId: attendanceId,
      userId: currentRecord.username,
      details: {
        updatedFields: Object.keys(dataToUpdate).filter(key => key !== 'updatedAt'),
        date: currentRecord.date
      }
    });
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Get attendance statistics for a user or all users
export const getAttendanceStats = async (filters = {}) => {
  try {
    // Validate filters
    const validatedFilters = {};
    if (filters.username && typeof filters.username === 'string' && filters.username.trim()) {
      validatedFilters.username = filters.username.trim();
    }
    if (filters.startDate) validatedFilters.startDate = filters.startDate;
    if (filters.endDate) validatedFilters.endDate = filters.endDate;

    const records = await loadAttendanceRecords(validatedFilters);

    // Calculate total days in date range (only up to today, excluding future dates)
    let totalDays = 0;
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      const today = new Date(getIndiaDate()); // Get today's date in India timezone

      // Use the earlier of endDate or today to avoid counting future days
      const effectiveEnd = end < today ? end : today;

      // Only calculate if start date is not in the future
      if (start <= today) {
        const diffTime = Math.abs(effectiveEnd - start);
        totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
      }
    } else {
      // If no date range specified, use records count (backward compatibility)
      totalDays = records.length;
    }

    const presentDays = records.filter(r => r.status === 'present').length;
    const halfDays = records.filter(r => r.status === 'half-day').length;
    const markedAbsentDays = records.filter(r => r.status === 'absent').length;

    // Calculate actual absent days: total days (up to today) - present days - half days
    // This includes both marked absent and days with no record, but ONLY for past dates
    const actualAbsentDays = totalDays - presentDays - halfDays;

    const stats = {
      totalDays: totalDays,
      presentDays: presentDays,
      halfDays: halfDays,
      absentDays: actualAbsentDays, // Total absent including unmarked days
      markedAbsentDays: markedAbsentDays, // Only explicitly marked absent
      wfhDays: records.filter(r => r.workType === 'wfh' && (r.status === 'present' || r.status === 'half-day')).length,
      officeDays: records.filter(r => r.workType === 'office' && (r.status === 'present' || r.status === 'half-day')).length,
      attendanceRate: 0
    };

    // Calculate attendance rate (present + half-day counted as working days)
    if (stats.totalDays > 0) {
      const workingDays = stats.presentDays + stats.halfDays;
      stats.attendanceRate = Math.round((workingDays / stats.totalDays) * 100);
    }

    return stats;
  } catch (error) {
    throw error;
  }
};

// Get attendance summary for all users (admin view)
// Multi-tenancy: Pass tenantId through to underlying functions
export const getAllUsersAttendanceSummary = async (filters = {}) => {
  try {
    const startTime = Date.now();

    const users = await getUsers(filters.tenantId);

    // 🚀 PERFORMANCE FIX: Use Promise.all to load all users in parallel
    // Before: Sequential loading = ~30s for 21 users
    // After: Parallel loading = ~3s for 21 users
    const summaries = await Promise.all(
      users
        .filter(user => user.username && typeof user.username === 'string' && user.username.trim())
        .map(async (user) => {
          const username = user.username.trim();

          // Create user-specific filters
          const userFilters = {
            ...filters,
            username
          };

          try {
            // Run all 3 queries in parallel for this user
            const [records, stats, todayAttendance] = await Promise.all([
              loadAttendanceRecords(userFilters),
              getAttendanceStats(userFilters),
              getTodayAttendance(username, filters.tenantId)
            ]);

            return {
              username,
              role: user.role,
              email: user.email,
              todayStatus: todayAttendance?.status || 'absent',
              todayWorkType: todayAttendance?.workType || null,
              stats,
              recentRecords: records.slice(0, 5) // Last 5 records
            };
          } catch (userError) {
            // Return default data on error
            return {
              username,
              role: user.role,
              email: user.email,
              todayStatus: 'absent',
              todayWorkType: null,
              stats: {
                totalDays: 0,
                presentDays: 0,
                absentDays: 0,
                wfhDays: 0,
                officeDays: 0,
                attendanceRate: 0
              },
              recentRecords: []
            };
          }
        })
    );

    const duration = Date.now() - startTime;

    return summaries;
  } catch (error) {
    throw error;
  }
};

// Mark absent for users who haven't marked attendance
// Multi-tenancy: Pass tenantId to scope to organization
export const markAbsentForMissingAttendance = async (targetDate = null, tenantId = null) => {
  try {
    const date = targetDate || new Date().toISOString().split('T')[0];
    const users = await getUsers(tenantId);
    const absentRecords = [];

    for (const user of users) {
      // Validate user has proper username
      if (!user.username || typeof user.username !== 'string' || !user.username.trim()) {
        continue;
      }

      // Check if user has attendance for the date
      let attendanceQuery = adminDb
        .collection('attendance')
        .where('username', '==', user.username.trim())
        .where('date', '==', date);

      // Multi-tenancy: Scope to tenant if provided
      if (tenantId) {
        attendanceQuery = attendanceQuery.where('tenantId', '==', tenantId);
      }

      const existingAttendance = await attendanceQuery.limit(1).get();

      if (existingAttendance.empty) {
        // Mark as absent
        const absentRecord = {
          tenantId: tenantId, // Multi-tenancy: Assign to tenant if provided
          username: user.username.trim(),
          date: date,
          workType: 'office', // Default
          status: 'absent',
          checkIn: null,
          checkOut: null,
          totalHours: null,
          notes: 'Auto-marked absent',
          location: '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const attendanceDoc = await adminDb.collection('attendance').add(absentRecord);
        absentRecords.push({
          id: attendanceDoc.id,
          ...absentRecord
        });
        
        // Log activity
        await logActivity({
          action: 'attendance_auto_absent',
          attendanceId: attendanceDoc.id,
          userId: user.username.trim(),
          details: {
            date: date,
            reason: 'Auto-marked absent for missing attendance'
          }
        });
      }
    }
    
    return absentRecords;
  } catch (error) {
    throw error;
  }
};

// Delete attendance record (admin only)
// Multi-tenancy: Verify tenantId if provided
export const deleteAttendanceRecord = async (attendanceId, tenantId = null) => {
  try {
    // Get attendance record first
    const attendanceDoc = await adminDb.collection('attendance').doc(attendanceId).get();

    if (!attendanceDoc.exists) {
      throw new Error('Attendance record not found');
    }

    const attendanceData = attendanceDoc.data();

    // Multi-tenancy: Verify attendance belongs to tenant
    if (tenantId && attendanceData.tenantId !== tenantId) {
      throw new Error('Unauthorized: Attendance record belongs to different organization');
    }
    
    // Delete the record
    await adminDb.collection('attendance').doc(attendanceId).delete();
    
    // Log activity
    await logActivity({
      action: 'attendance_deleted',
      attendanceId: attendanceId,
      userId: attendanceData.username,
      details: {
        date: attendanceData.date,
        workType: attendanceData.workType,
        status: attendanceData.status
      }
    });
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Attendance Settings Management
// Multi-tenancy: Scoped to tenant
export const getAttendanceSettings = async (tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    const settingsDoc = await adminDb
      .collection('attendance_settings')
      .doc(tenantId)
      .get();

    if (!settingsDoc.exists) {
      // Return default settings
      return {
        tenantId,
        deadlineHour: 12, // 12 PM noon
        deadlineMinute: 0,
        autoMarkAbsent: true,
        autoMarkAbsentTime: '23:59', // End of day
        halfDayEnabled: true
      };
    }

    return {
      id: settingsDoc.id,
      ...settingsDoc.data()
    };
  } catch (error) {
    throw error;
  }
};

export const updateAttendanceSettings = async (tenantId, settings) => {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    const settingsData = {
      ...settings,
      tenantId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await adminDb
      .collection('attendance_settings')
      .doc(tenantId)
      .set(settingsData, { merge: true });

    // Log activity
    await logActivity({
      action: 'attendance_settings_updated',
      userId: 'admin',
      details: {
        tenantId,
        settings: settingsData
      }
    });

    return settingsData;
  } catch (error) {
    throw error;
  }
};

// Get attendance by ID
// Multi-tenancy: Verify tenantId if provided
export const getAttendanceById = async (attendanceId, tenantId = null) => {
  try {
    if (!attendanceId || typeof attendanceId !== 'string') {
      throw new Error('Valid attendance ID is required');
    }

    const attendanceDoc = await adminDb.collection('attendance').doc(attendanceId).get();

    if (!attendanceDoc.exists) {
      return null;
    }

    // Multi-tenancy: Verify attendance belongs to tenant
    if (tenantId && attendanceDoc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: Attendance record belongs to different organization');
    }

    return convertFirestoreDoc(attendanceDoc);
  } catch (error) {
    throw error;
  }
};

// Update attendance record by username and date (for admin corrections)
// Multi-tenancy: Filter by tenantId
export const updateAttendanceByUserDate = async (attendanceData, tenantId = null) => {
  try {
    if (!attendanceData || !attendanceData.username || !attendanceData.date) {
      throw new Error('Username and date are required for attendance update');
    }

    // Build query to find existing record
    let query = adminDb.collection('attendance')
      .where('username', '==', attendanceData.username)
      .where('date', '==', attendanceData.date);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const querySnapshot = await query.get();

    if (querySnapshot.empty) {
      // Create new record if none exists
      const newRecord = {
        ...attendanceData,
        tenantId: tenantId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await adminDb.collection('attendance').add(newRecord);
      const newDoc = await docRef.get();
      return convertFirestoreDoc(newDoc);
    } else {
      // Update existing record
      const existingDoc = querySnapshot.docs[0];
      const updateData = {
        ...attendanceData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await existingDoc.ref.update(updateData);
      const updatedDoc = await existingDoc.ref.get();
      return convertFirestoreDoc(updatedDoc);
    }
  } catch (error) {
    console.error('Error updating attendance by user date:', error);
    throw error;
  }
};

// Get attendance records for a date range with pagination
// Multi-tenancy: Filter by tenantId if provided in filters
export const getAttendanceRecordsPaginated = async (filters = {}, limit = 50, lastDoc = null) => {
  try {
    let attendanceQuery = adminDb.collection('attendance');

    // Multi-tenancy: Filter by tenantId if provided
    if (filters.tenantId) {
      attendanceQuery = attendanceQuery.where('tenantId', '==', filters.tenantId);
    }

    // Apply filters with validation
    if (filters.username && typeof filters.username === 'string' && filters.username.trim()) {
      attendanceQuery = attendanceQuery.where('username', '==', filters.username.trim());
    }
    
    if (filters.startDate && filters.endDate) {
      attendanceQuery = attendanceQuery
        .where('date', '>=', filters.startDate)
        .where('date', '<=', filters.endDate);
    }
    
    if (filters.status) {
      attendanceQuery = attendanceQuery.where('status', '==', filters.status);
    }
    
    if (filters.workType) {
      attendanceQuery = attendanceQuery.where('workType', '==', filters.workType);
    }
    
    // Order and paginate
    attendanceQuery = attendanceQuery.orderBy('date', 'desc').limit(limit);
    
    if (lastDoc) {
      attendanceQuery = attendanceQuery.startAfter(lastDoc);
    }
    
    const attendanceSnapshot = await attendanceQuery.get();
    
    const records = [];
    attendanceSnapshot.forEach(doc => {
      const recordData = convertFirestoreDoc(doc);
      if (recordData) {
        records.push(recordData);
      }
    });
    
    const lastDocument = attendanceSnapshot.docs[attendanceSnapshot.docs.length - 1];
    const hasMore = attendanceSnapshot.docs.length === limit;
    
    return {
      records,
      lastDocument,
      hasMore
    };
  } catch (error) {
    throw error;
  }
};

// Export attendance data for reporting
// Multi-tenancy: Pass tenantId through via filters
export const exportAttendanceData = async (filters = {}) => {
  try {
    // Validate filters before passing to loadAttendanceRecords
    const validatedFilters = {};
    if (filters.username && typeof filters.username === 'string' && filters.username.trim()) {
      validatedFilters.username = filters.username.trim();
    }
    if (filters.startDate) validatedFilters.startDate = filters.startDate;
    if (filters.endDate) validatedFilters.endDate = filters.endDate;
    if (filters.tenantId) validatedFilters.tenantId = filters.tenantId; // Multi-tenancy: Include tenantId

    const records = await loadAttendanceRecords(validatedFilters);
    
    // Convert to CSV format
    const csvHeaders = [
      'Date',
      'Username', 
      'Status',
      'Work Type',
      'Check In',
      'Check Out',
      'Total Hours',
      'Notes'
    ];
    
    const csvRows = records.map(record => [
      record.date,
      record.username,
      record.status,
      record.workType,
      record.checkIn || '',
      record.checkOut || '',
      record.totalHours || '',
      record.notes || ''
    ]);
    
    return {
      headers: csvHeaders,
      rows: csvRows,
      totalRecords: records.length
    };
  } catch (error) {
    throw error;
  }
};

// DASHBOARD AND ANALYTICS OPERATIONS

// Get dashboard summary
// Multi-tenancy: Pass tenantId through to underlying functions
export const getDashboardSummary = async (username = null, tenantId = null) => {
  try {
    let tasks;
    if (username) {
      tasks = await getUserTasks(username, tenantId);
    } else {
      tasks = await loadTasks(tenantId);
    }
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const pending = total - completed;
    
    // Calculate overdue tasks
    const today = new Date();
    const overdue = tasks.filter(task => {
      if (task.status === 'pending' && task.deadline) {
        try {
          const deadline = new Date(task.deadline);
          return deadline < today;
        } catch (dateError) {
          return false;
        }
      }
      return false;
    }).length;
    
    return {
      total,
      completed,
      pending,
      overdue
    };
  } catch (error) {
    throw error;
  }
};

// Get user performance summary
// Multi-tenancy: Pass tenantId through to loadTasks
export const getUserPerformanceSummary = async (tenantId = null) => {
  try {
    const tasks = await loadTasks(tenantId);
    const summary = {};
    
    tasks.forEach(task => {
      const user = task.assigned_to;
      if (!user) return;
      
      if (!summary[user]) {
        summary[user] = {
          total: 0,
          completed: 0,
          pending: 0,
          time_spent: 0
        };
      }
      
      summary[user].total++;
      
      if (task.status === 'done') {
        summary[user].completed++;
        
        // Parse time spent
        if (task.time_spent) {
          try {
            let totalHours = 0;
            if (task.time_spent.includes('days')) {
              const [days, hms] = task.time_spent.split(' days, ');
              const [h, m] = hms.split(':');
              totalHours = parseInt(days) * 24 + parseInt(h) + parseInt(m) / 60;
            } else {
              const [h, m] = task.time_spent.split(':');
              totalHours = parseInt(h) + parseInt(m) / 60;
            }
            summary[user].time_spent += Math.round(totalHours * 100) / 100;
          } catch (timeError) {
            // Skip invalid time entries
          }
        }
      } else {
        summary[user].pending++;
      }
    });
    
    return summary;
  } catch (error) {
    throw error;
  }
};

// Get performance data (comprehensive)
// Multi-tenancy: Pass tenantId through to underlying functions
export const getPerformanceData = async (tenantId = null) => {
  try {
    const users = await getUsers(tenantId);
    const tasks = await getTasks({ tenantId });
    
    const performance = {};
    
    users.forEach(user => {
      const userTasks = tasks.filter(t => t.assigned_to === user.username);
      performance[user.username] = {
        total: userTasks.length,
        completed: userTasks.filter(t => t.status === 'done').length,
        pending: userTasks.filter(t => t.status === 'pending').length,
        completionRate: userTasks.length > 0 ? Math.round((userTasks.filter(t => t.status === 'done').length / userTasks.length) * 100) : 0
      };
    });
    
    return { users, tasks, performance };
  } catch (error) {
    throw error;
  }
};

// Get overdue tasks
// Multi-tenancy: Filter by tenantId if provided
export const getOverdueTasks = async (forUser = null, tenantId = null) => {
  try {
    let tasksQuery = adminDb.collection('tasks').where('status', '==', 'pending');

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      tasksQuery = tasksQuery.where('tenantId', '==', tenantId);
    }

    if (forUser) {
      tasksQuery = tasksQuery.where('assigned_to', '==', forUser);
    }
    
    const tasksSnapshot = await tasksQuery.get();
    const today = new Date();
    const overdueTasks = [];
    
    tasksSnapshot.forEach(doc => {
      const task = convertFirestoreDoc(doc);
      if (task && task.deadline) {
        try {
          const deadline = new Date(task.deadline);
          if (deadline < today) {
            overdueTasks.push(task);
          }
        } catch (dateError) {
          // Invalid date, skip this task
        }
      }
    });
    
    return overdueTasks;
  } catch (error) {
    throw error;
  }
};

// Get task analytics
// Multi-tenancy: Pass tenantId through to underlying functions
export const getTaskAnalytics = async (tenantId = null) => {
  try {
    const tasks = await getTasks({ tenantId });
    const users = await getUsers(tenantId);
    
    // Calculate task distribution by priority
    const priorityStats = {
      High: tasks.filter(t => t.priority === 'High').length,
      Medium: tasks.filter(t => t.priority === 'Medium').length,
      Low: tasks.filter(t => t.priority === 'Low').length
    };
    
    // Calculate task distribution by status
    const statusStats = {
      pending: tasks.filter(t => t.status === 'pending').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => {
        if (t.status === 'pending' && t.deadline) {
          return new Date(t.deadline) < new Date();
        }
        return false;
      }).length
    };
    
    // Calculate completion trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCompletions = tasks.filter(t => 
      t.status === 'done' && 
      t.completed_date && 
      new Date(t.completed_date) >= thirtyDaysAgo
    );
    
    // User productivity stats
    const userProductivity = users.map(user => {
      const userTasks = tasks.filter(t => t.assigned_to === user.username);
      const userCompleted = userTasks.filter(t => t.status === 'done');
      
      return {
        username: user.username,
        role: user.role,
        totalTasks: userTasks.length,
        completedTasks: userCompleted.length,
        pendingTasks: userTasks.filter(t => t.status === 'pending').length,
        completionRate: userTasks.length > 0 ? Math.round((userCompleted.length / userTasks.length) * 100) : 0
      };
    });
    
    return {
      totalTasks: tasks.length,
      totalUsers: users.length,
      priorityStats,
      statusStats,
      recentCompletions: recentCompletions.length,
      userProductivity,
      overallCompletionRate: tasks.length > 0 ? Math.round((statusStats.done / tasks.length) * 100) : 0
    };
  } catch (error) {
    throw error;
  }
};

// Get clients - Updated to use client management
// Multi-tenancy: Pass tenantId through to getClientsWithData
export const getClients = async (tenantId = null) => {
  try {
    const clients = await getClientsWithData(tenantId);
    return clients.map(client => ({
      name: client.name,
      totalTasks: client.totalTasks,
      completedTasks: client.completedTasks,
      pendingTasks: client.pendingTasks,
      overdueTasks: client.overdueTasks,
      email: client.email,
      industry: client.industry,
      status: client.status,
      priority: client.priority
    }));
  } catch (error) {
    throw error;
  }
};

// ACTIVITY LOGGING

// Log activity to Firebase
export const logActivity = async (activityData) => {
  try {
    await adminDb.collection('activity_log').add({
      ...activityData,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    // Silently fail to avoid breaking main functionality
  }
};

// PASSWORD RESET OPERATIONS

// Get user by email
export const getUserByEmail = async (email, tenantId = null) => {
  try {
    let query = adminDb.collection('users').where('email', '==', email.trim());

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const userDoc = snapshot.docs[0];
    return convertFirestoreDoc(userDoc);
  } catch (error) {
    throw error;
  }
};

// Simple encryption for password display (NOT SECURE - FOR DISPLAY ONLY)
// WARNING: This is not cryptographically secure, it's just for obfuscation
const encryptPassword = (password) => {
  try {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.JWT_SECRET || 'default-key-32-characters-long!!', 'utf-8').slice(0, 32);
    const iv = Buffer.alloc(16, 0); // Fixed IV for simplicity (NOT SECURE)

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    return null;
  }
};

const decryptPassword = (encrypted) => {
  try {
    if (!encrypted) return null;
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.JWT_SECRET || 'default-key-32-characters-long!!', 'utf-8').slice(0, 32);
    const iv = Buffer.alloc(16, 0); // Fixed IV for simplicity (NOT SECURE)

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
};

// Generate password reset token
export const generatePasswordResetToken = () => {
  // Generate a random token
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Save password reset token to user document
export const savePasswordResetToken = async (userId, token, tenantId = null) => {
  try {
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await adminDb.collection('users').doc(userId).update({
      resetPasswordToken: token,
      resetPasswordExpires: admin.firestore.Timestamp.fromDate(expiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log activity
    await logActivity({
      action: 'password_reset_requested',
      userId: userId,
      tenantId: tenantId,
      details: {
        timestamp: new Date().toISOString()
      }
    });

    return true;
  } catch (error) {
    throw error;
  }
};

// Verify password reset token
export const verifyPasswordResetToken = async (token) => {
  try {
    const snapshot = await adminDb
      .collection('users')
      .where('resetPasswordToken', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { valid: false, message: 'Invalid or expired reset token' };
    }

    const userDoc = snapshot.docs[0];
    const userData = convertFirestoreDoc(userDoc);

    // Check if token is expired
    const expiresAt = userData.resetPasswordExpires;
    if (!expiresAt) {
      return { valid: false, message: 'Invalid reset token' };
    }

    // Convert Firestore Timestamp to Date
    let expiryDate;
    if (expiresAt && typeof expiresAt.toDate === 'function') {
      expiryDate = expiresAt.toDate();
    } else if (typeof expiresAt === 'string') {
      expiryDate = new Date(expiresAt);
    } else {
      return { valid: false, message: 'Invalid token expiry' };
    }

    if (expiryDate < new Date()) {
      return { valid: false, message: 'Reset token has expired' };
    }

    return {
      valid: true,
      userId: userDoc.id,
      username: userData.username,
      email: userData.email
    };
  } catch (error) {
    throw error;
  }
};

// Reset password using token
export const resetPasswordWithToken = async (token, newPassword) => {
  try {
    // Verify token first
    const verification = await verifyPasswordResetToken(token);

    if (!verification.valid) {
      throw new Error(verification.message);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and clear reset token
    await adminDb.collection('users').doc(verification.userId).update({
      password: hashedPassword,
      resetPasswordToken: admin.firestore.FieldValue.delete(),
      resetPasswordExpires: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log activity
    await logActivity({
      action: 'password_reset_completed',
      userId: verification.username,
      details: {
        timestamp: new Date().toISOString()
      }
    });

    return {
      success: true,
      message: 'Password has been reset successfully',
      username: verification.username
    };
  } catch (error) {
    throw error;
  }
};

// MIGRATION HELPERS (for reference)

// Test Firebase connection
export const testFirebaseService = async () => {
  try {
    // Test writing to and reading from Firebase
    const testDoc = await adminDb.collection('_service_test').add({
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const testRead = await testDoc.get();

    if (testRead.exists) {
      await testDoc.delete(); // Clean up
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

// Export all functions for easy access
export default {
  // User operations
  loadUsers,
  getUsers,
  addUser,
  createUser,
  updateUser,
  deleteUser,
  getUserByUsername,
  getUserById,
  
  // Task operations
  loadTasks,
  getTasks,
  getUserTasks,
  addTask,
  createTask,
  getTaskByName,
  updateTask,
  updateTaskByName,
  updateTaskStatus,
  deleteTask,
  saveTasks,
  getTaskById,
  findTaskByIdentifier,
  searchTasks,
  checkForDuplicateTasks,
  generateTaskHash,
  findAndCleanupDuplicates,
  getDuplicateTaskStats,
  
  // Daily Task operations
  addDailyTask,
  getDailyTasks,
  getAllUsersDailyTasks,
  deleteDailyTask,
  getDailyTaskAnalytics,
  
  // Client operations
  loadClientsFromFirebase,
  getClientsWithData,
  getClientsFromFirebase,
  addClient,
  getClientById,
  getClientByName,
  updateClient,
  deleteClient,
  searchClients,
  getClientAnalytics,
  getClientActivities,
  addClientActivity,
  getClientTasks,
  
  // File operations
  addFile,
  getFiles,
  getFileById,
  updateFile,
  deleteFile,
  getClientFiles,
  
  // Attendance operations
  loadAttendanceRecords,
  getTodayAttendance,
  markAttendance,
  updateAttendanceRecord,
  updateAttendanceByUserDate,
  getAttendanceStats,
  getAllUsersAttendanceSummary,
  markAbsentForMissingAttendance,
  deleteAttendanceRecord,
  getAttendanceById,
  getAttendanceRecordsPaginated,
  exportAttendanceData,
  
  // Dashboard operations
  getDashboardSummary,
  getUserPerformanceSummary,
  getPerformanceData,
  getOverdueTasks,
  
  // Analytics operations
  getTaskAnalytics,
  getClients,

  // Password Reset operations
  getUserByEmail,
  generatePasswordResetToken,
  savePasswordResetToken,
  verifyPasswordResetToken,
  resetPasswordWithToken,

  // Utility operations
  logActivity,
  testFirebaseService
};

// Export decrypt function for password display
export { decryptPassword };