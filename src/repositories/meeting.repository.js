/**
 * Meeting Repository
 * Handles database operations for client meetings
 */

import { BaseRepository } from './base.repository.js';
import { adminDb } from '../../lib/firebase-admin.js';
import admin from 'firebase-admin';

export class MeetingRepository extends BaseRepository {
  constructor() {
    super('client_meetings');
  }

  /**
   * Get the meetings collection reference
   */
  getCollection() {
    return adminDb.collection(this.collectionName);
  }

  /**
   * Convert meeting document to object with proper date handling
   */
  docToObject(doc) {
    if (!doc || !doc.exists) return null;

    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || 'Untitled Meeting',
      description: data.description || '',
      meetingType: data.meetingType || 'google_meet',
      meetUrl: data.meetUrl || '',
      meetingLinks: data.meetingLinks || {},
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      timezone: data.timezone || 'UTC',
      attendees: data.attendees || [],
      agenda: data.agenda || '',
      location: data.location || 'Virtual',
      status: data.status || 'scheduled',
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      cancelledAt: data.cancelledAt || null,
      cancelledBy: data.cancelledBy || null,
      tenantId: data.tenantId,
      clientId: data.clientId
    };
  }

  /**
   * Find meetings by filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} List of meetings
   */
  async find(filters = {}) {
    try {
      let query = this.getCollection();

      // Apply filters
      if (filters.tenantId) {
        query = query.where('tenantId', '==', filters.tenantId);
      }
      if (filters.clientId) {
        query = query.where('clientId', '==', filters.clientId);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.where('status', '==', filters.status);
      }
      if (filters.createdBy) {
        query = query.where('createdBy', '==', filters.createdBy);
      }

      const snapshot = await query.get();
      const meetings = [];

      snapshot.forEach(doc => {
        const meeting = this.docToObject(doc);

        // Apply date filters in memory (Firestore limitation for composite queries)
        let includeInResults = true;
        if (filters.startDate || filters.endDate) {
          const meetingDate = new Date(
            meeting.startDateTime?.toDate?.() || meeting.startDateTime
          );

          if (filters.startDate && meetingDate < new Date(filters.startDate)) {
            includeInResults = false;
          }
          if (filters.endDate && meetingDate > new Date(filters.endDate)) {
            includeInResults = false;
          }
        }

        if (includeInResults) {
          meetings.push(meeting);
        }
      });

      // Sort by start date
      meetings.sort((a, b) => {
        const aTime = a.startDateTime?.toDate?.() || new Date(a.startDateTime);
        const bTime = b.startDateTime?.toDate?.() || new Date(b.startDateTime);
        return aTime - bTime;
      });

      return meetings;
    } catch (error) {
      this.handleError(error, 'find meetings');
    }
  }

  /**
   * Find meeting by ID
   * @param {string} meetingId - Meeting ID
   * @param {string} tenantId - Organization ID (for verification)
   * @returns {Promise<Object|null>} Meeting object or null
   */
  async findById(meetingId, tenantId) {
    try {
      const doc = await this.getCollection().doc(meetingId).get();

      if (!doc.exists) {
        return null;
      }

      const meeting = this.docToObject(doc);

      // Verify tenant ownership
      if (meeting.tenantId !== tenantId) {
        return null;
      }

      return meeting;
    } catch (error) {
      this.handleError(error, 'find meeting by ID');
    }
  }

  /**
   * Find meetings for a client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Additional filters (status, dates)
   * @returns {Promise<Array>} List of meetings
   */
  async findByClient(clientId, tenantId, filters = {}) {
    try {
      return await this.find({
        clientId,
        tenantId,
        ...filters
      });
    } catch (error) {
      this.handleError(error, 'find meetings by client');
    }
  }

  /**
   * Create a new meeting
   * @param {Object} meetingData - Meeting data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created meeting
   */
  async create(meetingData, tenantId) {
    try {
      const {
        clientId,
        title,
        description = '',
        startDateTime,
        endDateTime,
        timezone = 'UTC',
        attendees = [],
        agenda = '',
        location = 'Virtual',
        meetingType = 'google_meet',
        meetUrl = null,
        meetingLinks = {},
        createdBy
      } = meetingData;

      // Validate required fields
      if (!clientId || !title || !startDateTime || !endDateTime || !createdBy) {
        throw new Error('Missing required fields: clientId, title, startDateTime, endDateTime, createdBy');
      }

      // Parse dates
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);

      // Validate date range
      if (startDate >= endDate) {
        throw new Error('End date/time must be after start date/time');
      }

      // Validate future date
      if (startDate < new Date()) {
        throw new Error('Meeting cannot be scheduled in the past');
      }

      // Process attendees
      const validatedAttendees = [];
      if (Array.isArray(attendees)) {
        for (const attendee of attendees) {
          if (typeof attendee === 'string') {
            validatedAttendees.push({
              username: attendee,
              email: '',
              status: 'pending'
            });
          } else if (attendee && attendee.username) {
            validatedAttendees.push({
              username: attendee.username,
              email: attendee.email || '',
              status: attendee.status || 'pending'
            });
          }
        }
      }

      // Create meeting document
      const newMeeting = {
        tenantId,
        clientId,
        title: title.trim(),
        description,
        meetingType,
        meetUrl,
        meetingLinks,
        startDateTime: admin.firestore.Timestamp.fromDate(startDate),
        endDateTime: admin.firestore.Timestamp.fromDate(endDate),
        timezone,
        attendees: validatedAttendees,
        agenda,
        location,
        status: 'scheduled',
        createdBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.getCollection().add(newMeeting);

      return {
        id: docRef.id,
        ...newMeeting,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      this.handleError(error, 'create meeting');
    }
  }

  /**
   * Update a meeting
   * @param {string} meetingId - Meeting ID
   * @param {Object} updateData - Data to update
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated meeting
   */
  async update(meetingId, updateData, tenantId) {
    try {
      const meetingRef = this.getCollection().doc(meetingId);
      const meetingDoc = await meetingRef.get();

      if (!meetingDoc.exists) {
        throw new Error('Meeting not found');
      }

      const meetingData = meetingDoc.data();

      // Verify tenant ownership
      if (meetingData.tenantId !== tenantId) {
        throw new Error('Unauthorized: Meeting does not belong to this organization');
      }

      // Prepare update data
      const dataToUpdate = {
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Don't allow changing these fields
      delete dataToUpdate.id;
      delete dataToUpdate.tenantId;
      delete dataToUpdate.createdBy;
      delete dataToUpdate.createdAt;

      await meetingRef.update(dataToUpdate);

      return {
        id: meetingId,
        ...meetingData,
        ...dataToUpdate
      };
    } catch (error) {
      this.handleError(error, 'update meeting');
    }
  }

  /**
   * Cancel a meeting (soft delete)
   * @param {string} meetingId - Meeting ID
   * @param {string} username - Username of person cancelling
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async cancel(meetingId, username, tenantId) {
    try {
      const meetingRef = this.getCollection().doc(meetingId);
      const meetingDoc = await meetingRef.get();

      if (!meetingDoc.exists) {
        throw new Error('Meeting not found');
      }

      const meetingData = meetingDoc.data();

      // Verify tenant ownership
      if (meetingData.tenantId !== tenantId) {
        throw new Error('Unauthorized: Meeting does not belong to this organization');
      }

      await meetingRef.update({
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelledBy: username,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      this.handleError(error, 'cancel meeting');
    }
  }

  /**
   * Delete a meeting permanently
   * @param {string} meetingId - Meeting ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async delete(meetingId, tenantId) {
    try {
      const meetingRef = this.getCollection().doc(meetingId);
      const meetingDoc = await meetingRef.get();

      if (!meetingDoc.exists) {
        throw new Error('Meeting not found');
      }

      const meetingData = meetingDoc.data();

      // Verify tenant ownership
      if (meetingData.tenantId !== tenantId) {
        throw new Error('Unauthorized: Meeting does not belong to this organization');
      }

      await meetingRef.delete();
    } catch (error) {
      this.handleError(error, 'delete meeting');
    }
  }

  /**
   * Get upcoming meetings for a client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Number of meetings to return
   * @returns {Promise<Array>} List of upcoming meetings
   */
  async getUpcoming(clientId, tenantId, limit = 10) {
    try {
      const meetings = await this.findByClient(clientId, tenantId, {
        status: 'scheduled'
      });

      const now = new Date();
      const upcomingMeetings = meetings.filter(meeting => {
        const startTime = meeting.startDateTime?.toDate?.() || new Date(meeting.startDateTime);
        return startTime >= now;
      });

      return upcomingMeetings.slice(0, limit);
    } catch (error) {
      this.handleError(error, 'get upcoming meetings');
    }
  }

  /**
   * Get past meetings for a client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Number of meetings to return
   * @returns {Promise<Array>} List of past meetings
   */
  async getPast(clientId, tenantId, limit = 10) {
    try {
      const meetings = await this.findByClient(clientId, tenantId);

      const now = new Date();
      const pastMeetings = meetings.filter(meeting => {
        const endTime = meeting.endDateTime?.toDate?.() || new Date(meeting.endDateTime);
        return endTime < now;
      });

      // Sort by most recent first
      pastMeetings.sort((a, b) => {
        const aTime = a.endDateTime?.toDate?.() || new Date(a.endDateTime);
        const bTime = b.endDateTime?.toDate?.() || new Date(b.endDateTime);
        return bTime - aTime;
      });

      return pastMeetings.slice(0, limit);
    } catch (error) {
      this.handleError(error, 'get past meetings');
    }
  }

  /**
   * Check if user has permission to modify meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} username - Username
   * @param {string} userRole - User role
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if user has permission
   */
  async hasPermission(meetingId, username, userRole, tenantId) {
    try {
      const meeting = await this.findById(meetingId, tenantId);

      if (!meeting) {
        return false;
      }

      // Admins can always modify
      if (userRole === 'admin') {
        return true;
      }

      // Creator can modify
      if (meeting.createdBy === username) {
        return true;
      }

      return false;
    } catch (error) {
      this.handleError(error, 'check meeting permission');
    }
  }

  /**
   * Count meetings by status
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Count by status
   */
  async countByStatus(clientId, tenantId) {
    try {
      const meetings = await this.findByClient(clientId, tenantId);

      const counts = {
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        total: meetings.length
      };

      meetings.forEach(meeting => {
        if (meeting.status === 'scheduled') counts.scheduled++;
        else if (meeting.status === 'completed') counts.completed++;
        else if (meeting.status === 'cancelled') counts.cancelled++;
      });

      return counts;
    } catch (error) {
      this.handleError(error, 'count meetings by status');
    }
  }
}

export default MeetingRepository;
