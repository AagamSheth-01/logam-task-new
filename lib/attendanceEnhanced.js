// Enhanced Attendance System with Advanced Logic and Fraud Prevention
import { adminDb } from './firebase-admin';
import admin from 'firebase-admin';

// Office location configuration (replace with your actual office coordinates)
const OFFICE_LOCATIONS = [
  {
    name: 'Main Office',
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 100, // meters
    timezone: 'America/New_York'
  },
  {
    name: 'Branch Office',
    latitude: 34.0522,
    longitude: -118.2437,
    radius: 150, // meters
    timezone: 'America/Los_Angeles'
  }
];

// Work hours configuration
const WORK_HOURS = {
  start: '09:00',
  end: '17:00',
  lunchBreakStart: '12:00',
  lunchBreakEnd: '13:00',
  flexTimeMinutes: 30, // Allow 30 minutes flexibility
  minimumWorkHours: 8
};

// Attendance validation rules
const ATTENDANCE_RULES = {
  maxLocationAccuracy: 200, // meters
  maxTimeGap: 300000, // 5 minutes in milliseconds
  maxDuplicateInterval: 3600000, // 1 hour in milliseconds
  requireLocationForOffice: true,
  allowWFHWithoutLocation: true,
  fraudDetectionEnabled: true
};

class EnhancedAttendanceService {
  
  // Enhanced attendance marking with fraud detection
  static async markAttendanceAdvanced(attendanceData) {
    try {
      console.log('🔍 Starting enhanced attendance marking:', attendanceData);
      
      // Validate input data
      const validationResult = await this.validateAttendanceData(attendanceData);
      if (!validationResult.valid) {
        throw new Error(validationResult.message);
      }

      // Check for duplicate attendance
      const duplicateCheck = await this.checkForDuplicateAttendance(attendanceData);
      if (duplicateCheck.isDuplicate) {
        throw new Error(duplicateCheck.message);
      }

      // Validate location if required
      if (attendanceData.workType === 'office' && ATTENDANCE_RULES.requireLocationForOffice) {
        const locationValidation = await this.validateLocation(attendanceData);
        if (!locationValidation.valid) {
          throw new Error(locationValidation.message);
        }
      }

      // Fraud detection
      if (ATTENDANCE_RULES.fraudDetectionEnabled) {
        const fraudCheck = await this.detectFraud(attendanceData);
        if (fraudCheck.suspicious) {
          console.warn('🚨 Suspicious activity detected:', fraudCheck.reasons);
          // Log but don't block - admin can review
          await this.logSuspiciousActivity(attendanceData, fraudCheck);
        }
      }

      // Create attendance record
      const attendanceRecord = await this.createAttendanceRecord(attendanceData);
      
      // Update user statistics
      await this.updateUserStatistics(attendanceData.username);
      
      // Send notifications if needed
      await this.sendAttendanceNotifications(attendanceRecord);
      
      console.log('✅ Enhanced attendance marked successfully:', attendanceRecord.id);
      return attendanceRecord;
      
    } catch (error) {
      console.error('❌ Enhanced attendance marking failed:', error);
      throw error;
    }
  }

  // Validate attendance data
  static async validateAttendanceData(attendanceData) {
    const { username, workType, location, timestamp } = attendanceData;
    
    // Check required fields
    if (!username || typeof username !== 'string' || !username.trim()) {
      return { valid: false, message: 'Valid username is required' };
    }
    
    if (!workType || !['office', 'wfh'].includes(workType)) {
      return { valid: false, message: 'Work type must be "office" or "wfh"' };
    }
    
    // Check timestamp validity
    const now = new Date();
    const attendanceTime = new Date(timestamp || now);
    const timeDiff = Math.abs(now.getTime() - attendanceTime.getTime());
    
    if (timeDiff > ATTENDANCE_RULES.maxTimeGap) {
      return { valid: false, message: 'Attendance timestamp is too far from current time' };
    }
    
    // Check work hours
    const workHoursCheck = this.isWithinWorkHours(attendanceTime);
    if (!workHoursCheck.valid) {
      return { 
        valid: false, 
        message: `Attendance outside work hours: ${workHoursCheck.message}` 
      };
    }
    
    // Check location accuracy for office attendance
    if (workType === 'office' && location && location.accuracy > ATTENDANCE_RULES.maxLocationAccuracy) {
      return { 
        valid: false, 
        message: `Location accuracy too low: ${location.accuracy}m (max: ${ATTENDANCE_RULES.maxLocationAccuracy}m)` 
      };
    }
    
    return { valid: true };
  }

  // Check for duplicate attendance
  static async checkForDuplicateAttendance(attendanceData) {
    const { username } = attendanceData;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const existingAttendance = await adminDb
        .collection('attendance')
        .where('username', '==', username.trim())
        .where('date', '==', today)
        .get();
      
      if (!existingAttendance.empty) {
        const lastRecord = existingAttendance.docs[0].data();
        return {
          isDuplicate: true,
          message: `Attendance already marked for today at ${lastRecord.checkIn}`,
          existingRecord: lastRecord
        };
      }
      
      // Check for recent attendance within the duplicate interval
      const recentAttendance = await adminDb
        .collection('attendance')
        .where('username', '==', username.trim())
        .where('createdAt', '>', admin.firestore.Timestamp.fromDate(
          new Date(Date.now() - ATTENDANCE_RULES.maxDuplicateInterval)
        ))
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!recentAttendance.empty) {
        const recentRecord = recentAttendance.docs[0].data();
        const timeDiff = Date.now() - recentRecord.createdAt.toDate().getTime();
        
        if (timeDiff < ATTENDANCE_RULES.maxDuplicateInterval) {
          return {
            isDuplicate: true,
            message: `Too soon to mark attendance again. Last marked ${Math.round(timeDiff / 60000)} minutes ago.`,
            existingRecord: recentRecord
          };
        }
      }
      
      return { isDuplicate: false };
      
    } catch (error) {
      console.error('Error checking duplicate attendance:', error);
      return { isDuplicate: false };
    }
  }

  // Validate location against office locations
  static async validateLocation(attendanceData) {
    const { location } = attendanceData;
    
    if (!location || !location.latitude || !location.longitude) {
      return { valid: false, message: 'Location is required for office attendance' };
    }
    
    // Check if location is within any office radius
    const isInOffice = OFFICE_LOCATIONS.some(office => {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        office.latitude,
        office.longitude
      );
      return distance <= office.radius;
    });
    
    if (!isInOffice) {
      const distances = OFFICE_LOCATIONS.map(office => {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          office.latitude,
          office.longitude
        );
        return { office: office.name, distance: Math.round(distance) };
      });
      
      return { 
        valid: false, 
        message: `Location not within office premises. Distances: ${distances.map(d => `${d.office}: ${d.distance}m`).join(', ')}` 
      };
    }
    
    return { valid: true };
  }

  // Fraud detection system
  static async detectFraud(attendanceData) {
    const { username, location, timestamp } = attendanceData;
    const suspiciousReasons = [];
    
    try {
      // Check for unusual location patterns
      if (location) {
        const recentLocations = await this.getRecentLocations(username, 7); // Last 7 days
        
        if (recentLocations.length > 0) {
          const locationPattern = this.analyzeLocationPattern(recentLocations, location);
          if (locationPattern.suspicious) {
            suspiciousReasons.push(`Unusual location pattern: ${locationPattern.reason}`);
          }
        }
      }
      
      // Check for unusual time patterns
      const recentTimes = await this.getRecentAttendanceTimes(username, 30); // Last 30 days
      if (recentTimes.length > 0) {
        const timePattern = this.analyzeTimePattern(recentTimes, timestamp);
        if (timePattern.suspicious) {
          suspiciousReasons.push(`Unusual time pattern: ${timePattern.reason}`);
        }
      }
      
      // Check for rapid successive markings
      const lastAttendance = await this.getLastAttendance(username);
      if (lastAttendance && lastAttendance.createdAt) {
        const timeDiff = Date.now() - lastAttendance.createdAt.toDate().getTime();
        if (timeDiff < 300000) { // 5 minutes
          suspiciousReasons.push('Rapid successive attendance marking');
        }
      }
      
      // Check for weekend/holiday attendance
      const isWeekend = this.isWeekend(new Date(timestamp || Date.now()));
      if (isWeekend) {
        suspiciousReasons.push('Weekend attendance');
      }
      
      return {
        suspicious: suspiciousReasons.length > 0,
        reasons: suspiciousReasons,
        riskLevel: this.calculateRiskLevel(suspiciousReasons)
      };
      
    } catch (error) {
      console.error('Error in fraud detection:', error);
      return { suspicious: false, reasons: [] };
    }
  }

  // Create attendance record with enhanced data
  static async createAttendanceRecord(attendanceData) {
    const { username, workType, location, notes, timestamp } = attendanceData;
    
    const now = new Date(timestamp || Date.now());
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Determine office location if applicable
    let detectedOffice = null;
    if (workType === 'office' && location) {
      detectedOffice = this.detectOfficeLocation(location);
    }
    
    // Calculate expected work hours
    const workHours = this.calculateExpectedWorkHours(now);
    
    // Create comprehensive attendance record
    const attendanceRecord = {
      username: username.trim(),
      date: today,
      workType: workType,
      status: 'present',
      checkIn: currentTime,
      checkOut: null,
      totalHours: null,
      expectedHours: workHours.expected,
      notes: notes || '',
      
      // Enhanced location data
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        address: location.address || null,
        detectedOffice: detectedOffice
      } : null,
      
      // Work schedule information
      workSchedule: {
        expectedStart: workHours.start,
        expectedEnd: workHours.end,
        isFlexTime: workHours.isFlexTime,
        isLateArrival: workHours.isLate,
        isEarlyArrival: workHours.isEarly
      },
      
      // Metadata
      deviceInfo: {
        userAgent: attendanceData.userAgent || null,
        ipAddress: attendanceData.ipAddress || null,
        browserFingerprint: attendanceData.fingerprint || null
      },
      
      // Validation flags
      validationFlags: {
        locationValidated: workType === 'office' && location ? true : false,
        fraudCheckPassed: true,
        manualOverride: false
      },
      
      // Timestamps
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add the record to database
    const attendanceDoc = await adminDb.collection('attendance').add(attendanceRecord);
    
    // Log activity
    await this.logAttendanceActivity(attendanceDoc.id, attendanceRecord);
    
    return {
      id: attendanceDoc.id,
      ...attendanceRecord,
      createdAt: new Date()
    };
  }

  // Update user statistics
  static async updateUserStatistics(username) {
    try {
      const statsDoc = adminDb.collection('attendance_stats').doc(username);
      const currentMonth = new Date().toISOString().substr(0, 7); // YYYY-MM
      
      await statsDoc.set({
        username: username,
        currentMonth: currentMonth,
        totalDaysMarked: admin.firestore.FieldValue.increment(1),
        lastAttendanceDate: new Date().toISOString().split('T')[0],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
    } catch (error) {
      console.error('Error updating user statistics:', error);
    }
  }

  // Helper methods
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  static isWithinWorkHours(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    const [startHour, startMin] = WORK_HOURS.start.split(':').map(Number);
    const [endHour, endMin] = WORK_HOURS.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin - WORK_HOURS.flexTimeMinutes;
    const endTime = endHour * 60 + endMin + WORK_HOURS.flexTimeMinutes;
    
    if (timeInMinutes < startTime) {
      return { valid: false, message: 'Too early - before work hours' };
    }
    
    if (timeInMinutes > endTime) {
      return { valid: false, message: 'Too late - after work hours' };
    }
    
    return { valid: true };
  }

  static calculateExpectedWorkHours(date) {
    const [startHour, startMin] = WORK_HOURS.start.split(':').map(Number);
    const [endHour, endMin] = WORK_HOURS.end.split(':').map(Number);
    
    const actualHours = date.getHours();
    const actualMinutes = date.getMinutes();
    const actualTime = actualHours * 60 + actualMinutes;
    const expectedStart = startHour * 60 + startMin;
    const expectedEnd = endHour * 60 + endMin;
    
    return {
      expected: WORK_HOURS.minimumWorkHours,
      start: WORK_HOURS.start,
      end: WORK_HOURS.end,
      isFlexTime: Math.abs(actualTime - expectedStart) <= WORK_HOURS.flexTimeMinutes,
      isLate: actualTime > expectedStart + WORK_HOURS.flexTimeMinutes,
      isEarly: actualTime < expectedStart - WORK_HOURS.flexTimeMinutes
    };
  }

  static detectOfficeLocation(location) {
    for (const office of OFFICE_LOCATIONS) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        office.latitude,
        office.longitude
      );
      
      if (distance <= office.radius) {
        return {
          name: office.name,
          distance: Math.round(distance),
          timezone: office.timezone
        };
      }
    }
    return null;
  }

  static isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  static calculateRiskLevel(reasons) {
    if (reasons.length === 0) return 'low';
    if (reasons.length <= 2) return 'medium';
    return 'high';
  }

  // Log suspicious activity
  static async logSuspiciousActivity(attendanceData, fraudCheck) {
    try {
      await adminDb.collection('suspicious_activities').add({
        type: 'attendance_fraud',
        username: attendanceData.username,
        reasons: fraudCheck.reasons,
        riskLevel: fraudCheck.riskLevel,
        attendanceData: attendanceData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        resolved: false
      });
    } catch (error) {
      console.error('Error logging suspicious activity:', error);
    }
  }

  // Log attendance activity
  static async logAttendanceActivity(attendanceId, attendanceRecord) {
    try {
      await adminDb.collection('activities').add({
        action: 'attendance_marked',
        entityType: 'attendance',
        entityId: attendanceId,
        userId: attendanceRecord.username,
        details: {
          workType: attendanceRecord.workType,
          date: attendanceRecord.date,
          checkIn: attendanceRecord.checkIn,
          hasLocation: !!attendanceRecord.location,
          officeDetected: attendanceRecord.location?.detectedOffice?.name || null
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging attendance activity:', error);
    }
  }

  // Send notifications
  static async sendAttendanceNotifications(attendanceRecord) {
    try {
      // Send to admin if late arrival
      if (attendanceRecord.workSchedule.isLateArrival) {
        // Implementation depends on your notification system
        console.log(`🔔 Late arrival notification for ${attendanceRecord.username}`);
      }
      
      // Send reminder for check-out
      // Implementation depends on your notification system
      console.log(`📅 Check-out reminder set for ${attendanceRecord.username}`);
      
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  // Get recent locations for fraud detection
  static async getRecentLocations(username, days) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const snapshot = await adminDb
        .collection('attendance')
        .where('username', '==', username)
        .where('createdAt', '>', admin.firestore.Timestamp.fromDate(cutoffDate))
        .where('location', '!=', null)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      
      return snapshot.docs.map(doc => doc.data().location);
    } catch (error) {
      console.error('Error getting recent locations:', error);
      return [];
    }
  }

  // Get recent attendance times
  static async getRecentAttendanceTimes(username, days) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const snapshot = await adminDb
        .collection('attendance')
        .where('username', '==', username)
        .where('createdAt', '>', admin.firestore.Timestamp.fromDate(cutoffDate))
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();
      
      return snapshot.docs.map(doc => ({
        checkIn: doc.data().checkIn,
        date: doc.data().date,
        createdAt: doc.data().createdAt
      }));
    } catch (error) {
      console.error('Error getting recent times:', error);
      return [];
    }
  }

  // Get last attendance
  static async getLastAttendance(username) {
    try {
      const snapshot = await adminDb
        .collection('attendance')
        .where('username', '==', username)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      return snapshot.docs[0].data();
    } catch (error) {
      console.error('Error getting last attendance:', error);
      return null;
    }
  }

  // Analyze location pattern
  static analyzeLocationPattern(recentLocations, currentLocation) {
    // Simple pattern analysis - can be enhanced
    const distances = recentLocations.map(loc => 
      this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        loc.latitude,
        loc.longitude
      )
    );
    
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDistance = Math.max(...distances);
    
    if (maxDistance > 5000) { // More than 5km from usual locations
      return {
        suspicious: true,
        reason: `Location ${Math.round(maxDistance)}m away from usual locations`
      };
    }
    
    return { suspicious: false };
  }

  // Analyze time pattern
  static analyzeTimePattern(recentTimes, currentTime) {
    const currentHour = new Date(currentTime).getHours();
    const recentHours = recentTimes.map(t => {
      const [hours] = t.checkIn.split(':').map(Number);
      return hours;
    });
    
    const avgHour = recentHours.reduce((a, b) => a + b, 0) / recentHours.length;
    const hourDiff = Math.abs(currentHour - avgHour);
    
    if (hourDiff > 2) { // More than 2 hours different
      return {
        suspicious: true,
        reason: `Unusual time: ${hourDiff} hours different from average`
      };
    }
    
    return { suspicious: false };
  }
}

export default EnhancedAttendanceService;