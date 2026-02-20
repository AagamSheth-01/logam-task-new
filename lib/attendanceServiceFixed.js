/**
 * Fixed Attendance Service Functions
 * Addresses date/time calculation issues with proper timezone handling
 */

import { adminDb } from './firebase-admin.js';
import admin from 'firebase-admin';
import { getIndiaDate, getIndiaTime, getIndiaDateTime, formatInTimeZone } from './timezone.js';

/**
 * Get today's attendance with proper timezone handling
 */
export const getTodayAttendance = async (username, tenantId) => {
  try {
    if (!username || !tenantId) {
      throw new Error('Username and tenant ID are required');
    }

    // Use India timezone for "today"
    const todayIndia = getIndiaDate(); // YYYY-MM-DD format in IST

    const attendanceQuery = adminDb
      .collection('attendance')
      .where('username', '==', username.trim())
      .where('tenantId', '==', tenantId)
      .where('date', '==', todayIndia)
      .limit(1);

    const querySnapshot = await attendanceQuery.get();

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    // Convert Firestore data with proper timezone handling
    const attendanceRecord = {
      id: doc.id,
      ...data,
      // Ensure date is in consistent format
      date: data.date,
      // Map fields for compatibility
      checkIn: data.clockIn || data.checkIn,
      checkOut: data.clockOut || data.checkOut,
      clockIn: data.clockIn || data.checkIn,
      clockOut: data.clockOut || data.checkOut,
      workType: data.workType || data.workMode,
      workMode: data.workMode || data.workType
    };

    return attendanceRecord;
  } catch (error) {
    console.error('Error getting today attendance:', error);
    throw error;
  }
};

/**
 * Mark attendance with proper timezone and validation
 */
export const markAttendance = async (attendanceData, tenantId) => {
  try {
    if (!attendanceData?.username || !tenantId) {
      throw new Error('Username and tenant ID are required');
    }

    const trimmedUsername = attendanceData.username.trim();
    if (!trimmedUsername) {
      throw new Error('Username cannot be empty');
    }

    // Use India timezone consistently
    const todayIndia = getIndiaDate(); // YYYY-MM-DD format
    const currentTimeIndia = getIndiaTime(); // HH:MM:SS format
    const currentDateTimeIndia = getIndiaDateTime();

    // Check if already marked for today (using India date)
    const existingAttendance = await getTodayAttendance(trimmedUsername, tenantId);
    if (existingAttendance) {
      throw new Error('Attendance already marked for today');
    }

    // Prepare attendance record with proper timezone data
    const attendanceRecord = {
      tenantId: tenantId,
      username: trimmedUsername,
      date: todayIndia, // Consistent YYYY-MM-DD format
      workType: attendanceData.workType || attendanceData.workMode || 'office',
      workMode: attendanceData.workType || attendanceData.workMode || 'office',
      status: attendanceData.status || 'present',
      clockIn: attendanceData.clockIn || currentTimeIndia.substring(0, 5), // HH:MM format
      checkIn: attendanceData.clockIn || currentTimeIndia.substring(0, 5), // For compatibility
      clockOut: null,
      checkOut: null,
      totalHours: null,
      notes: attendanceData.notes || '',
      location: attendanceData.location || '',
      isLate: false, // Will be calculated based on settings
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtIndia: currentDateTimeIndia.toISOString(), // Store India time as well
      dateCreatedIndia: todayIndia
    };

    // Check if late based on attendance settings (if configured)
    try {
      const settingsQuery = await adminDb
        .collection('attendance_settings')
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (!settingsQuery.empty) {
        const settings = settingsQuery.docs[0].data();
        const deadlineTime = settings.attendanceDeadline || '10:00';

        const [currentHour, currentMin] = currentTimeIndia.split(':').map(Number);
        const [deadlineHour, deadlineMin] = deadlineTime.split(':').map(Number);

        const currentTotalMinutes = currentHour * 60 + currentMin;
        const deadlineTotalMinutes = deadlineHour * 60 + deadlineMin;

        if (currentTotalMinutes > deadlineTotalMinutes) {
          attendanceRecord.isLate = true;
          if (settings.halfDayAfterDeadline) {
            attendanceRecord.status = 'half-day';
          }
        }
      }
    } catch (settingsError) {
      console.warn('Could not check attendance deadline settings:', settingsError);
    }

    // Save to Firebase
    const docRef = await adminDb.collection('attendance').add(attendanceRecord);

    // Return the created record with ID
    return {
      id: docRef.id,
      ...attendanceRecord,
      createdAt: new Date().toISOString(), // Convert timestamp for response
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error marking attendance:', error);
    throw error;
  }
};

/**
 * Clock out with proper time calculation
 */
export const clockOutUser = async (username, tenantId) => {
  try {
    if (!username || !tenantId) {
      throw new Error('Username and tenant ID are required');
    }

    // Get today's attendance record
    const todayRecord = await getTodayAttendance(username.trim(), tenantId);

    if (!todayRecord) {
      throw new Error('No attendance record found for today. Please clock in first.');
    }

    if (todayRecord.clockOut || todayRecord.checkOut) {
      throw new Error('Already clocked out for today');
    }

    if (!todayRecord.clockIn && !todayRecord.checkIn) {
      throw new Error('Cannot clock out without clocking in first');
    }

    // Get current time in India timezone
    const currentTimeIndia = getIndiaTime(); // HH:MM:SS format
    const clockOutTime = currentTimeIndia.substring(0, 5); // HH:MM format

    // Calculate total hours worked
    const clockInTime = todayRecord.clockIn || todayRecord.checkIn;
    const totalHours = calculateWorkHours(clockInTime, clockOutTime);

    // Prepare update data
    const updateData = {
      clockOut: clockOutTime,
      checkOut: clockOutTime, // For compatibility
      totalHours: totalHours,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      clockOutAtIndia: getIndiaDateTime().toISOString() // Store exact clock out time
    };

    // Update the record
    const docRef = adminDb.collection('attendance').doc(todayRecord.id);
    await docRef.update(updateData);

    // Get the updated record
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();

    return {
      id: updatedDoc.id,
      ...updatedData,
      // Ensure compatibility fields
      checkIn: updatedData.clockIn || updatedData.checkIn,
      checkOut: updatedData.clockOut || updatedData.checkOut,
      clockIn: updatedData.clockIn || updatedData.checkIn,
      clockOut: updatedData.clockOut || updatedData.checkOut,
      workType: updatedData.workType || updatedData.workMode,
      workMode: updatedData.workMode || updatedData.workType
    };
  } catch (error) {
    console.error('Error clocking out:', error);
    throw error;
  }
};

/**
 * Calculate work hours between two time strings
 * Handles overnight work and proper minute calculations
 */
export const calculateWorkHours = (clockInTime, clockOutTime) => {
  try {
    if (!clockInTime || !clockOutTime) {
      return '0:00';
    }

    // Parse times (handle both HH:MM and HH:MM:SS formats)
    const parseTime = (timeStr) => {
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      return { hours, minutes };
    };

    const clockIn = parseTime(clockInTime);
    const clockOut = parseTime(clockOutTime);

    // Convert to total minutes for easier calculation
    const clockInMinutes = clockIn.hours * 60 + clockIn.minutes;
    const clockOutMinutes = clockOut.hours * 60 + clockOut.minutes;

    let totalMinutes;

    if (clockOutMinutes >= clockInMinutes) {
      // Same day
      totalMinutes = clockOutMinutes - clockInMinutes;
    } else {
      // Overnight work (clock out is next day)
      totalMinutes = (24 * 60) - clockInMinutes + clockOutMinutes;
    }

    // Convert back to hours and minutes
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Return in HH:MM format
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculating work hours:', error);
    return '0:00';
  }
};

/**
 * Get attendance records for a user with proper date handling
 */
export const getAttendanceRecords = async (username, tenantId, options = {}) => {
  try {
    if (!username || !tenantId) {
      throw new Error('Username and tenant ID are required');
    }

    let query = adminDb
      .collection('attendance')
      .where('username', '==', username.trim())
      .where('tenantId', '==', tenantId);

    // Add date range filtering if provided
    if (options.startDate) {
      query = query.where('date', '>=', options.startDate);
    }
    if (options.endDate) {
      query = query.where('date', '<=', options.endDate);
    }

    // Add ordering
    query = query.orderBy('date', 'desc');

    // Add pagination if provided
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const querySnapshot = await query.get();

    if (querySnapshot.empty) {
      return [];
    }

    const records = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();

      // Process and normalize the record
      const record = {
        id: doc.id,
        ...data,
        // Ensure consistent field mapping
        checkIn: data.clockIn || data.checkIn,
        checkOut: data.clockOut || data.checkOut,
        clockIn: data.clockIn || data.checkIn,
        clockOut: data.clockOut || data.checkOut,
        workType: data.workType || data.workMode,
        workMode: data.workMode || data.workType,
        // Recalculate total hours if missing or incorrect
        totalHours: data.totalHours || (
          (data.clockIn && data.clockOut) ?
          calculateWorkHours(data.clockIn, data.clockOut) :
          null
        )
      };

      records.push(record);
    });

    return records;
  } catch (error) {
    console.error('Error getting attendance records:', error);
    throw error;
  }
};

/**
 * Update attendance record with proper validation
 */
export const updateAttendanceRecord = async (attendanceId, updateData, tenantId) => {
  try {
    if (!attendanceId || !tenantId) {
      throw new Error('Attendance ID and tenant ID are required');
    }

    const docRef = adminDb.collection('attendance').doc(attendanceId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      throw new Error('Attendance record not found');
    }

    const currentRecord = docSnapshot.data();

    // Verify tenant access
    if (currentRecord.tenantId !== tenantId) {
      throw new Error('Unauthorized: Cannot update attendance from different organization');
    }

    // Prepare update data
    const updatePayload = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Handle clock out time calculation
    if (updateData.clockOut || updateData.checkOut) {
      const clockOutTime = updateData.clockOut || updateData.checkOut;
      const clockInTime = currentRecord.clockIn || currentRecord.checkIn;

      if (clockInTime) {
        const totalHours = calculateWorkHours(clockInTime, clockOutTime);
        updatePayload.totalHours = totalHours;
        updatePayload.clockOut = clockOutTime;
        updatePayload.checkOut = clockOutTime; // For compatibility
      }
    }

    // Handle clock in time updates
    if (updateData.clockIn || updateData.checkIn) {
      const clockInTime = updateData.clockIn || updateData.checkIn;
      updatePayload.clockIn = clockInTime;
      updatePayload.checkIn = clockInTime; // For compatibility

      // Recalculate total hours if clock out exists
      const clockOutTime = currentRecord.clockOut || currentRecord.checkOut;
      if (clockOutTime) {
        const totalHours = calculateWorkHours(clockInTime, clockOutTime);
        updatePayload.totalHours = totalHours;
      }
    }

    // Update the record
    await docRef.update(updatePayload);

    // Return updated record
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();

    return {
      id: updatedDoc.id,
      ...updatedData,
      // Ensure compatibility
      checkIn: updatedData.clockIn || updatedData.checkIn,
      checkOut: updatedData.clockOut || updatedData.checkOut,
      clockIn: updatedData.clockIn || updatedData.checkIn,
      clockOut: updatedData.clockOut || updatedData.checkOut,
      workType: updatedData.workType || updatedData.workMode,
      workMode: updatedData.workMode || updatedData.workType
    };
  } catch (error) {
    console.error('Error updating attendance record:', error);
    throw error;
  }
};

/**
 * Fix existing attendance records with incorrect time calculations
 */
export const fixAttendanceTimeCalculations = async (tenantId) => {
  try {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    console.log(`Starting attendance time calculation fix for tenant: ${tenantId}`);

    // Get all records with clock in and clock out but missing or incorrect total hours
    const query = adminDb
      .collection('attendance')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'present');

    const querySnapshot = await query.get();

    if (querySnapshot.empty) {
      console.log('No attendance records found to fix');
      return { recordsFixed: 0, recordsProcessed: 0 };
    }

    const batch = adminDb.batch();
    let recordsFixed = 0;
    let recordsProcessed = 0;
    const batchSize = 500; // Firestore batch limit

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      recordsProcessed++;

      const clockIn = data.clockIn || data.checkIn;
      const clockOut = data.clockOut || data.checkOut;

      if (clockIn && clockOut) {
        // Recalculate total hours
        const correctTotalHours = calculateWorkHours(clockIn, clockOut);

        // Check if current total hours is different or missing
        if (!data.totalHours || data.totalHours !== correctTotalHours) {
          batch.update(doc.ref, {
            totalHours: correctTotalHours,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastFixedAt: new Date().toISOString()
          });
          recordsFixed++;

          // Execute batch if we reach the limit
          if (recordsFixed % batchSize === 0) {
            await batch.commit();
            console.log(`Fixed ${recordsFixed} records so far...`);
          }
        }
      }
    }

    // Commit any remaining updates
    if (recordsFixed % batchSize !== 0) {
      await batch.commit();
    }

    console.log(`Attendance fix completed: ${recordsFixed} records fixed out of ${recordsProcessed} processed`);

    return {
      recordsFixed,
      recordsProcessed,
      tenantId,
      completedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fixing attendance time calculations:', error);
    throw error;
  }
};

/**
 * Validate and normalize attendance data before saving
 */
export const validateAttendanceData = (attendanceData) => {
  const errors = [];

  // Required fields
  if (!attendanceData.username) {
    errors.push('Username is required');
  }

  if (!attendanceData.date) {
    errors.push('Date is required');
  }

  // Date format validation (YYYY-MM-DD)
  if (attendanceData.date && !/^\d{4}-\d{2}-\d{2}$/.test(attendanceData.date)) {
    errors.push('Date must be in YYYY-MM-DD format');
  }

  // Time format validation (HH:MM or HH:MM:SS)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

  if (attendanceData.clockIn && !timeRegex.test(attendanceData.clockIn)) {
    errors.push('Clock in time must be in HH:MM or HH:MM:SS format');
  }

  if (attendanceData.clockOut && !timeRegex.test(attendanceData.clockOut)) {
    errors.push('Clock out time must be in HH:MM or HH:MM:SS format');
  }

  // Status validation
  const validStatuses = ['present', 'absent', 'half-day', 'holiday'];
  if (attendanceData.status && !validStatuses.includes(attendanceData.status)) {
    errors.push('Status must be one of: present, absent, half-day, holiday');
  }

  // Work type validation
  const validWorkTypes = ['office', 'wfh', 'remote'];
  if (attendanceData.workType && !validWorkTypes.includes(attendanceData.workType)) {
    errors.push('Work type must be one of: office, wfh, remote');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  getTodayAttendance,
  markAttendance,
  clockOutUser,
  calculateWorkHours,
  getAttendanceRecords,
  updateAttendanceRecord,
  fixAttendanceTimeCalculations,
  validateAttendanceData
};