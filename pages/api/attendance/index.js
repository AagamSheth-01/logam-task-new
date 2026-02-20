// pages/api/attendance/index.js - FULL WORKING VERSION
import { verifyToken } from '../../../lib/auth';
import {
  loadAttendanceRecords,
  markAttendance,
  getTodayAttendance,
  getAttendanceStats,
  getAllUsersAttendanceSummary
} from '../../../lib/firebaseService';
import EnhancedAttendanceService from '../../../lib/attendanceEnhanced';
import { broadcastNotification } from '../notifications/stream';

export default async function handler(req, res) {
  console.log('Attendance API called:', {
    method: req.method,
    query: req.query,
    headers: Object.keys(req.headers)
  });

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.error('No token provided');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.valid) {
      console.error('Invalid token');
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Multi-tenancy: Extract tenantId from authenticated request
    const tenantId = decoded.user?.tenantId || decoded.tenantId;

    console.log('Token decoded successfully:', decoded.user?.username);

    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGetAttendance(req, res, decoded.user, tenantId);
      case 'POST':
        return await handleMarkAttendance(req, res, decoded.user, tenantId);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Attendance API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}

async function handleGetAttendance(req, res, decoded, tenantId) {
  try {
    console.log('handleGetAttendance called with:', {
      query: req.query,
      decodedUser: decoded
    });

    const { user, startDate, endDate, all, page, pageSize } = req.query;

    // Build filters with proper validation
    const filters = { tenantId };

    // CRITICAL FIX: Handle admin "all=true" request properly
    let targetUsername = null;

    if (all === 'true' && decoded.role === 'admin') {
      // Admin requesting all users - don't set username filter
      console.log('Admin requesting ALL users attendance data');
      targetUsername = null; // This will get all users
    } else if (user && typeof user === 'string' && user.trim()) {
      // Check if user is allowed to view this data
      if (user === decoded.username || decoded.role === 'admin') {
        targetUsername = user.trim();
        console.log('Requesting specific user attendance:', targetUsername);
      } else {
        console.error('User not authorized to view attendance for:', user);
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this user\'s attendance'
        });
      }
    } else if (decoded.username && typeof decoded.username === 'string' && decoded.username.trim()) {
      // Default to requesting user's own attendance
      targetUsername = decoded.username.trim();
      console.log('Requesting own attendance for:', targetUsername);
    }

    // Only add username filter if we have a specific target user
    if (targetUsername) {
      filters.username = targetUsername;
    }

    // Date range filters
    if (startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate format. Use YYYY-MM-DD'
        });
      }
      filters.startDate = startDate;
    }

    if (endDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endDate format. Use YYYY-MM-DD'
        });
      }
      filters.endDate = endDate;
    }

    console.log('Attendance filters:', filters);

    // Initialize response data
    let records = [];
    let todayRecord = null;
    let stats = null;
    let usersSummary = null;

    // Load attendance records with pagination
    let hasMore = false;
    let totalRecords = 0;

    try {
      // For attendance management, limit the date range to avoid timeouts
      if (!filters.startDate && !filters.endDate) {
        // Default to last 3 months instead of 2 years to prevent timeouts
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const today = new Date();

        filters.startDate = threeMonthsAgo.toISOString().split('T')[0]; // YYYY-MM-DD format
        filters.endDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

        console.log(`📅 Using recent date range to prevent timeouts: ${filters.startDate} to ${filters.endDate}`);
      }

      // Add a reasonable limit to prevent memory issues
      const maxLimit = parseInt(pageSize) || 100; // Default to 100 records max
      records = await loadAttendanceRecords({ ...filters, limit: maxLimit });
      totalRecords = records.length;

      // For historical data, we don't paginate - we get everything
      hasMore = false;

      console.log(`Loaded attendance records: ${records.length} (historical data)`);

      // Return actual records only - no generation of fake records
    } catch (recordsError) {
      console.error('Error loading attendance records:', recordsError);
      records = [];
    }

    // Get today's attendance for the user (only if we have a specific user)
    if (targetUsername) {
      try {
        todayRecord = await getTodayAttendance(targetUsername, tenantId);
        console.log('Today\'s attendance record:', todayRecord ? 'found' : 'not found');
      } catch (todayError) {
        console.error('Error getting today\'s attendance:', todayError);
        todayRecord = null;
      }
    }

    // Get statistics
    try {
      stats = await getAttendanceStats(filters);
      console.log('Attendance stats:', stats);
    } catch (statsError) {
      console.error('Error getting attendance stats:', statsError);
      stats = {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        wfhDays: 0,
        officeDays: 0,
        attendanceRate: 0
      };
    }

    // If admin requesting all users summary
    if (decoded.role === 'admin' && all === 'true') {
      try {
        // For admin all=true, get summary for all users
        const summaryFilters = {
          tenantId: tenantId, // Include tenantId for proper filtering
          startDate: filters.startDate,
          endDate: filters.endDate
          // Don't include username filter for summary
        };
        usersSummary = await getAllUsersAttendanceSummary(summaryFilters);
        console.log('Users summary loaded:', usersSummary?.length || 0, 'users');
      } catch (summaryError) {
        console.error('Error getting users summary:', summaryError);
        usersSummary = [];
      }
    }

    const response = {
      success: true,
      records,
      todayRecord,
      stats,
      usersSummary,
      pagination: {
        count: totalRecords,
        hasMore,
        limit: parseInt(pageSize) || 30
      }
    };

    console.log('Attendance API response prepared:', {
      records: records.length,
      todayRecord: !!todayRecord,
      stats: !!stats,
      usersSummary: usersSummary?.length || 0,
      hasMore
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in handleGetAttendance:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to load attendance data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}

async function handleMarkAttendance(req, res, decoded, tenantId) {
  try {
    console.log('handleMarkAttendance called with:', {
      body: req.body,
      decodedUser: decoded
    });

    const { workType, notes, location, locationNote } = req.body;

    // CRITICAL FIX: Validate required fields
    if (!decoded || !decoded.username) {
      console.error('User information missing from token:', decoded);
      return res.status(400).json({
        success: false,
        message: 'User information missing from token'
      });
    }

    if (!workType || !['office', 'wfh'].includes(workType)) {
      console.error('Invalid work type:', workType);
      return res.status(400).json({
        success: false,
        message: 'Invalid work type. Must be "office" or "wfh"'
      });
    }

    // Process location data robustly
    let locationData = '';
    let locationInfo = '';

    if (location && typeof location === 'object') {
      locationData = JSON.stringify(location);

      // Add location information to notes
      if (location.isFallback) {
        locationInfo = `Location: ${location.fallbackType || 'fallback'} (${location.fallbackReason || 'reason unknown'})`;
        console.log('📍 Using fallback location:', locationInfo);
      } else if (location.accuracy) {
        const accuracy = location.accuracy;
        if (accuracy <= 10) locationInfo = 'Location: High accuracy GPS';
        else if (accuracy <= 100) locationInfo = 'Location: GPS';
        else if (accuracy <= 1000) locationInfo = 'Location: Approximate';
        else locationInfo = 'Location: Low accuracy';
      }
    } else if (typeof location === 'string') {
      locationData = location;
    }

    // Mark attendance with validated data
    const attendanceData = {
      username: decoded.username.trim(),
      workType,
      notes: [notes, locationNote, locationInfo].filter(Boolean).join(' | '),
      location: locationData
    };

    console.log('Marking attendance with data:', attendanceData);

    // Use basic attendance service (more reliable, no location validation)
    const attendanceRecord = await markAttendance(attendanceData, tenantId);
    console.log('✅ Attendance marked successfully:', attendanceRecord.id);

    // Send notification to admins about attendance submission
    try {
      broadcastNotification({
        type: 'attendance_submitted',
        title: 'Attendance Submitted',
        message: `${decoded.username} marked attendance as ${workType.toUpperCase()}`,
        timestamp: new Date().toISOString(),
        priority: 'low',
        data: {
          attendanceId: attendanceRecord.id,
          username: decoded.username,
          workType: workType,
          date: attendanceRecord.date
        }
      }, { role: 'admin' });
      console.log('✅ Attendance notification sent to admins');
    } catch (notifError) {
      console.warn('📢 Attendance notification failed:', notifError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      record: attendanceRecord
    });
  } catch (error) {
    console.error('Error in handleMarkAttendance:', error);
    console.error('Error stack:', error.stack);

    if (error.message === 'Attendance already marked for today') {
      return res.status(409).json({
        success: false,
        message: 'Attendance already marked for today'
      });
    }

    if (error.message.includes('username') || error.message.includes('Valid username')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user data provided'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}

