/**
 * Calendar Event Repository
 * Handles database operations for client calendar events
 * Uses Google Calendar-compatible format and structure
 */

import { BaseRepository } from './base.repository.js';
import { adminDb } from '../../lib/firebase-admin.js';
import admin from 'firebase-admin';

export class CalendarEventRepository extends BaseRepository {
  constructor() {
    super('client_calendar_events');
  }

  /**
   * Google Calendar compatible event types + Indian cultural events
   */
  static EVENT_TYPES = [
    'default',
    'focusTime',
    'outOfOffice',
    'workingLocation',
    'holiday',           // Indian holidays
    'festival',          // Cultural festivals
    'meeting',           // Business meetings
    'deadline',          // Project deadlines
    'milestone',         // Project milestones
    'reminder'           // General reminders
  ];

  /**
   * Google Calendar status values
   */
  static STATUS = {
    CONFIRMED: 'confirmed',
    TENTATIVE: 'tentative',
    CANCELLED: 'cancelled'
  };

  /**
   * Google Calendar visibility values
   */
  static VISIBILITY = {
    DEFAULT: 'default',
    PUBLIC: 'public',
    PRIVATE: 'private',
    CONFIDENTIAL: 'confidential'
  };

  /**
   * Google Calendar color IDs
   */
  static COLORS = {
    LAVENDER: '1',
    SAGE: '2',
    GRAPE: '3',
    FLAMINGO: '4',
    BANANA: '5',
    TANGERINE: '6',
    PEACOCK: '7',
    GRAPHITE: '8',
    BLUEBERRY: '9',
    BASIL: '10',
    TOMATO: '11'
  };

  /**
   * Indian timezone (IST - Indian Standard Time)
   */
  static DEFAULT_TIMEZONE = 'Asia/Kolkata';

  /**
   * Indian business working hours (IST)
   */
  static WORKING_HOURS = {
    start: '09:30',  // 9:30 AM IST
    end: '18:30',    // 6:30 PM IST
    workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday (0 = Sunday)
    lunchBreak: {
      start: '13:00', // 1:00 PM IST
      end: '14:00'    // 2:00 PM IST
    }
  };

  /**
   * Indian National & Cultural Holidays (2025)
   * Format: MM-DD
   */
  static INDIAN_HOLIDAYS_2025 = {
    // National Holidays
    'REPUBLIC_DAY': { date: '01-26', name: 'Republic Day', type: 'national' },
    'INDEPENDENCE_DAY': { date: '08-15', name: 'Independence Day', type: 'national' },
    'GANDHI_JAYANTI': { date: '10-02', name: 'Gandhi Jayanti', type: 'national' },

    // Major Festivals (2025)
    'HOLI': { date: '03-14', name: 'Holi', type: 'festival' },
    'MAHAVIR_JAYANTI': { date: '04-10', name: 'Mahavir Jayanti', type: 'festival' },
    'GOOD_FRIDAY': { date: '04-18', name: 'Good Friday', type: 'festival' },
    'EID_UL_FITR': { date: '04-01', name: 'Eid ul-Fitr', type: 'festival' },
    'BUDDHA_PURNIMA': { date: '05-12', name: 'Buddha Purnima', type: 'festival' },
    'EID_UL_ADHA': { date: '06-07', name: 'Eid ul-Adha (Bakrid)', type: 'festival' },
    'MUHARRAM': { date: '07-06', name: 'Muharram', type: 'festival' },
    'RAKSHA_BANDHAN': { date: '08-09', name: 'Raksha Bandhan', type: 'festival' },
    'JANMASHTAMI': { date: '08-16', name: 'Janmashtami', type: 'festival' },
    'GANESH_CHATURTHI': { date: '08-27', name: 'Ganesh Chaturthi', type: 'festival' },
    'DUSSEHRA': { date: '10-02', name: 'Dussehra', type: 'festival' },
    'DIWALI': { date: '10-20', name: 'Diwali', type: 'festival' },
    'GURU_NANAK_JAYANTI': { date: '11-15', name: 'Guru Nanak Jayanti', type: 'festival' },
    'CHRISTMAS': { date: '12-25', name: 'Christmas', type: 'festival' }
  };

  /**
   * Get the calendar events collection reference
   */
  getCollection() {
    return adminDb.collection(this.collectionName);
  }

  /**
   * Convert event document to Google Calendar format
   */
  docToObject(doc) {
    if (!doc || !doc.exists) return null;

    const data = doc.data();

    // Convert to Google Calendar format
    const event = {
      id: doc.id,
      kind: 'calendar#event',
      etag: data.etag || `"${Date.now()}"`,
      status: data.status || 'confirmed',
      htmlLink: data.htmlLink || null,
      created: data.created || data.createdAt,
      updated: data.updated || data.updatedAt,
      summary: data.summary || data.title,
      description: data.description || '',
      location: data.location || '',
      colorId: data.colorId || '9', // Default to blueberry

      // Creator and organizer
      creator: {
        email: data.creator?.email || `${data.createdBy}@internal`,
        displayName: data.creator?.displayName || data.createdBy,
        self: data.creator?.self || true
      },
      organizer: {
        email: data.organizer?.email || `${data.createdBy}@internal`,
        displayName: data.organizer?.displayName || data.createdBy,
        self: data.organizer?.self || true
      },

      // Start and end times
      start: this.formatDateTime(data.start || data.startDateTime, data.timeZone),
      end: this.formatDateTime(data.end || data.endDateTime, data.timeZone),

      // Recurrence (RRULE format)
      recurrence: data.recurrence || null,

      // Attendees
      attendees: this.formatAttendees(data.attendees || []),

      // Reminders
      reminders: this.formatReminders(data.reminders || data.reminderMinutes),

      // Extended properties for custom data
      extendedProperties: {
        private: {
          tenantId: data.tenantId,
          clientId: data.clientId,
          eventType: data.eventType || 'default',
          linkedTaskId: data.linkedTaskId || null,
          linkedMeetingId: data.linkedMeetingId || null
        }
      },

      // Optional fields
      visibility: data.visibility || 'default',
      transparency: data.transparency || 'opaque', // opaque = busy, transparent = free
      sequence: data.sequence || 0,
      iCalUID: data.iCalUID || `${doc.id}@logam.app`,
      eventType: data.eventType || 'default'
    };

    return event;
  }

  /**
   * Format date/time in Google Calendar format (IST by default)
   */
  formatDateTime(dateTime, timeZone = null) {
    if (!dateTime) return null;

    const date = dateTime?.toDate?.() || new Date(dateTime);

    return {
      dateTime: date.toISOString(),
      timeZone: timeZone || CalendarEventRepository.DEFAULT_TIMEZONE
    };
  }

  /**
   * Format attendees in Google Calendar format
   */
  formatAttendees(attendees) {
    if (!Array.isArray(attendees) || attendees.length === 0) {
      return [];
    }

    return attendees.map(attendee => {
      if (typeof attendee === 'string') {
        return {
          email: attendee.includes('@') ? attendee : `${attendee}@internal`,
          responseStatus: 'needsAction',
          optional: false
        };
      }

      return {
        email: attendee.email || `${attendee.username}@internal`,
        displayName: attendee.displayName || attendee.username,
        responseStatus: attendee.responseStatus || 'needsAction', // needsAction, declined, tentative, accepted
        optional: attendee.optional || false,
        organizer: attendee.organizer || false,
        self: attendee.self || false,
        resource: attendee.resource || false,
        comment: attendee.comment || null
      };
    });
  }

  /**
   * Format reminders in Google Calendar format
   */
  formatReminders(reminders) {
    if (!reminders) {
      return {
        useDefault: true
      };
    }

    if (Array.isArray(reminders)) {
      // Convert minutes array to Google format
      return {
        useDefault: false,
        overrides: reminders.map(minutes => ({
          method: 'popup', // popup, email
          minutes: typeof minutes === 'number' ? minutes : 15
        }))
      };
    }

    // Already in Google format
    return reminders;
  }

  /**
   * Find calendar events by filters
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
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      } else {
        // Default: exclude cancelled events
        query = query.where('status', 'in', ['confirmed', 'tentative']);
      }

      const snapshot = await query.get();
      const events = [];

      snapshot.forEach(doc => {
        const event = this.docToObject(doc);

        // Apply date filters in memory
        let includeInResults = true;
        if (filters.timeMin || filters.timeMax) {
          const eventStart = new Date(event.start.dateTime);

          if (filters.timeMin && eventStart < new Date(filters.timeMin)) {
            includeInResults = false;
          }
          if (filters.timeMax && eventStart > new Date(filters.timeMax)) {
            includeInResults = false;
          }
        }

        if (includeInResults) {
          events.push(event);
        }
      });

      // Sort by start date
      events.sort((a, b) => {
        const aTime = new Date(a.start.dateTime);
        const bTime = new Date(b.start.dateTime);
        return aTime - bTime;
      });

      return events;
    } catch (error) {
      this.handleError(error, 'find calendar events');
    }
  }

  /**
   * Find event by ID
   */
  async findById(eventId, tenantId) {
    try {
      const doc = await this.getCollection().doc(eventId).get();

      if (!doc.exists) {
        return null;
      }

      const event = this.docToObject(doc);

      // Verify tenant ownership
      if (event.extendedProperties?.private?.tenantId !== tenantId) {
        return null;
      }

      return event;
    } catch (error) {
      this.handleError(error, 'find calendar event by ID');
    }
  }

  /**
   * Find events for a client
   */
  async findByClient(clientId, tenantId, filters = {}) {
    try {
      return await this.find({
        clientId,
        tenantId,
        ...filters
      });
    } catch (error) {
      this.handleError(error, 'find calendar events by client');
    }
  }

  /**
   * Create a calendar event (Google Calendar format)
   */
  async create(eventData, tenantId) {
    try {
      const {
        clientId,
        summary,
        description = '',
        location = '',
        start,
        end,
        attendees = [],
        reminders,
        colorId = '9',
        visibility = 'default',
        transparency = 'opaque',
        recurrence = null,
        eventType = 'default',
        linkedTaskId = null,
        linkedMeetingId = null,
        createdBy
      } = eventData;

      // Validate required fields
      if (!clientId || !summary || !start || !createdBy) {
        throw new Error('Missing required fields: clientId, summary, start, createdBy');
      }

      // Parse dates
      const startDate = new Date(start.dateTime || start);
      const endDate = end ? new Date(end.dateTime || end) : new Date(startDate.getTime() + 3600000); // +1 hour default

      // Validate date range
      if (startDate >= endDate) {
        throw new Error('End time must be after start time');
      }

      // Create event in Google Calendar format
      const now = admin.firestore.FieldValue.serverTimestamp();
      const newEvent = {
        // Google Calendar standard fields
        kind: 'calendar#event',
        etag: `"${Date.now()}"`,
        status: 'confirmed',
        summary: summary.trim(),
        description,
        location,
        colorId,
        visibility,
        transparency,
        sequence: 0,
        iCalUID: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@logam.app`,

        // Dates (IST by default)
        start: {
          dateTime: admin.firestore.Timestamp.fromDate(startDate),
          timeZone: start.timeZone || CalendarEventRepository.DEFAULT_TIMEZONE
        },
        end: {
          dateTime: admin.firestore.Timestamp.fromDate(endDate),
          timeZone: end?.timeZone || start.timeZone || CalendarEventRepository.DEFAULT_TIMEZONE
        },
        timeZone: start.timeZone || CalendarEventRepository.DEFAULT_TIMEZONE,

        // People
        creator: {
          email: `${createdBy}@internal`,
          displayName: createdBy,
          self: true
        },
        organizer: {
          email: `${createdBy}@internal`,
          displayName: createdBy,
          self: true
        },
        attendees: this.formatAttendees(attendees),

        // Reminders
        reminders: this.formatReminders(reminders),

        // Recurrence
        recurrence: recurrence ? (Array.isArray(recurrence) ? recurrence : [recurrence]) : null,

        // Multi-tenancy and custom fields
        tenantId,
        clientId,
        eventType,
        linkedTaskId,
        linkedMeetingId,
        createdBy,

        // Timestamps
        created: now,
        updated: now,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await this.getCollection().add(newEvent);

      return {
        ...newEvent,
        id: docRef.id,
        created: new Date(),
        updated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      this.handleError(error, 'create calendar event');
    }
  }

  /**
   * Update a calendar event
   */
  async update(eventId, updateData, tenantId) {
    try {
      const eventRef = this.getCollection().doc(eventId);
      const eventDoc = await eventRef.get();

      if (!eventDoc.exists) {
        throw new Error('Calendar event not found');
      }

      const eventData = eventDoc.data();

      // Verify tenant ownership
      if (eventData.tenantId !== tenantId) {
        throw new Error('Unauthorized: Event does not belong to this organization');
      }

      // Increment sequence number for updates
      const dataToUpdate = {
        updated: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sequence: (eventData.sequence || 0) + 1,
        etag: `"${Date.now()}"`
      };

      // Update allowed fields
      const allowedFields = [
        'summary', 'description', 'location', 'colorId',
        'visibility', 'transparency', 'attendees', 'reminders',
        'recurrence', 'eventType', 'linkedTaskId', 'linkedMeetingId'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          if (field === 'attendees') {
            dataToUpdate[field] = this.formatAttendees(updateData[field]);
          } else if (field === 'reminders') {
            dataToUpdate[field] = this.formatReminders(updateData[field]);
          } else {
            dataToUpdate[field] = updateData[field];
          }
        }
      });

      // Handle date/time updates (IST by default)
      if (updateData.start) {
        dataToUpdate.start = {
          dateTime: admin.firestore.Timestamp.fromDate(
            new Date(updateData.start.dateTime || updateData.start)
          ),
          timeZone: updateData.start.timeZone || CalendarEventRepository.DEFAULT_TIMEZONE
        };
      }
      if (updateData.end) {
        dataToUpdate.end = {
          dateTime: admin.firestore.Timestamp.fromDate(
            new Date(updateData.end.dateTime || updateData.end)
          ),
          timeZone: updateData.end.timeZone || CalendarEventRepository.DEFAULT_TIMEZONE
        };
      }

      await eventRef.update(dataToUpdate);

      return {
        id: eventId,
        ...eventData,
        ...dataToUpdate
      };
    } catch (error) {
      this.handleError(error, 'update calendar event');
    }
  }

  /**
   * Cancel a calendar event (Google Calendar style)
   */
  async cancel(eventId, username, tenantId) {
    try {
      const eventRef = this.getCollection().doc(eventId);
      const eventDoc = await eventRef.get();

      if (!eventDoc.exists) {
        throw new Error('Calendar event not found');
      }

      const eventData = eventDoc.data();

      // Verify tenant ownership
      if (eventData.tenantId !== tenantId) {
        throw new Error('Unauthorized: Event does not belong to this organization');
      }

      await eventRef.update({
        status: 'cancelled',
        updated: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sequence: (eventData.sequence || 0) + 1,
        etag: `"${Date.now()}"`,
        cancelledBy: username,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      this.handleError(error, 'cancel calendar event');
    }
  }

  /**
   * Delete a calendar event permanently
   */
  async delete(eventId, tenantId) {
    try {
      const eventRef = this.getCollection().doc(eventId);
      const eventDoc = await eventRef.get();

      if (!eventDoc.exists) {
        throw new Error('Calendar event not found');
      }

      const eventData = eventDoc.data();

      // Verify tenant ownership
      if (eventData.tenantId !== tenantId) {
        throw new Error('Unauthorized: Event does not belong to this organization');
      }

      await eventRef.delete();
    } catch (error) {
      this.handleError(error, 'delete calendar event');
    }
  }

  /**
   * Get upcoming events (Google Calendar instances endpoint style)
   */
  async getUpcoming(clientId, tenantId, maxResults = 10) {
    try {
      const events = await this.findByClient(clientId, tenantId, {
        timeMin: new Date().toISOString()
      });

      return events.slice(0, maxResults);
    } catch (error) {
      this.handleError(error, 'get upcoming calendar events');
    }
  }

  /**
   * Get events for today
   */
  async getToday(clientId, tenantId) {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const endOfDay = new Date(now.setHours(23, 59, 59, 999));

      return await this.findByClient(clientId, tenantId, {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString()
      });
    } catch (error) {
      this.handleError(error, 'get today calendar events');
    }
  }

  /**
   * Check if a date is an Indian holiday
   * @param {Date} date - Date to check
   * @returns {Object|null} Holiday info or null
   */
  static isIndianHoliday(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${month}-${day}`;

    for (const [key, holiday] of Object.entries(CalendarEventRepository.INDIAN_HOLIDAYS_2025)) {
      if (holiday.date === dateStr) {
        return { key, ...holiday };
      }
    }

    return null;
  }

  /**
   * Check if a date is a working day
   * @param {Date} date - Date to check
   * @returns {boolean}
   */
  static isWorkingDay(date) {
    const dayOfWeek = date.getDay();
    return CalendarEventRepository.WORKING_HOURS.workingDays.includes(dayOfWeek);
  }

  /**
   * Check if time is within working hours (IST)
   * @param {Date} date - Date/time to check
   * @returns {boolean}
   */
  static isWorkingHours(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const { start, end } = CalendarEventRepository.WORKING_HOURS;
    return timeStr >= start && timeStr <= end;
  }

  /**
   * Get all Indian holidays for the current year
   * @returns {Array} List of holiday events
   */
  static getAllIndianHolidays() {
    const year = new Date().getFullYear();
    const holidays = [];

    for (const [key, holiday] of Object.entries(CalendarEventRepository.INDIAN_HOLIDAYS_2025)) {
      const [month, day] = holiday.date.split('-');
      const holidayDate = new Date(year, parseInt(month) - 1, parseInt(day));

      holidays.push({
        key,
        name: holiday.name,
        type: holiday.type,
        date: holidayDate,
        summary: holiday.name,
        eventType: 'holiday',
        colorId: holiday.type === 'national' ? '11' : '6', // Red for national, Orange for festivals
        transparency: 'transparent' // Not busy - it's a holiday!
      });
    }

    return holidays;
  }

  /**
   * Create Indian holiday events for a client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @param {string} createdBy - Username
   * @returns {Promise<Array>} Created holiday events
   */
  async createIndianHolidayEvents(clientId, tenantId, createdBy) {
    try {
      const holidays = CalendarEventRepository.getAllIndianHolidays();
      const createdEvents = [];

      for (const holiday of holidays) {
        const startDate = new Date(holiday.date);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(holiday.date);
        endDate.setHours(23, 59, 59, 999);

        const eventData = {
          clientId,
          summary: `${holiday.name} (${holiday.type === 'national' ? 'National Holiday' : 'Festival'})`,
          description: `Indian ${holiday.type}: ${holiday.name}`,
          location: 'India',
          start: {
            dateTime: startDate,
            timeZone: CalendarEventRepository.DEFAULT_TIMEZONE
          },
          end: {
            dateTime: endDate,
            timeZone: CalendarEventRepository.DEFAULT_TIMEZONE
          },
          eventType: 'holiday',
          colorId: holiday.colorId,
          transparency: 'transparent',
          visibility: 'public',
          createdBy
        };

        const event = await this.create(eventData, tenantId);
        createdEvents.push(event);
      }

      return createdEvents;
    } catch (error) {
      this.handleError(error, 'create Indian holiday events');
    }
  }

  /**
   * Get upcoming Indian holidays
   * @param {number} months - Number of months ahead to check
   * @returns {Array} Upcoming holidays
   */
  static getUpcomingIndianHolidays(months = 6) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);

    const holidays = CalendarEventRepository.getAllIndianHolidays();

    return holidays.filter(holiday => {
      return holiday.date >= now && holiday.date <= futureDate;
    }).sort((a, b) => a.date - b.date);
  }
}

export default CalendarEventRepository;
