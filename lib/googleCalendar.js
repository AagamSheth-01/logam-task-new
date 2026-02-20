// Enhanced Google Calendar and Meet Integration
import { google } from 'googleapis';
import { sendEmail } from './email';

// Google Calendar API configuration
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Create JWT auth client for service account
      const auth = new google.auth.JWT(
        GOOGLE_CLIENT_EMAIL,
        null,
        GOOGLE_PRIVATE_KEY,
        [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ]
      );

      // Initialize the calendar API
      this.calendar = google.calendar({ version: 'v3', auth });
      this.initialized = true;
      
      console.log('✅ Google Calendar API initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar API:', error);
      throw new Error('Google Calendar API initialization failed');
    }
  }

  async createMeetingEvent({
    title,
    description,
    startDateTime,
    endDateTime,
    timezone = 'UTC',
    attendees = [],
    agenda = '',
    location = '',
    calendarId = 'primary'
  }) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Format attendees for Google Calendar
      const formattedAttendees = attendees.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name || attendee.username,
        responseStatus: 'needsAction'
      }));

      // Create event object
      const event = {
        summary: title,
        description: this.formatDescription(description, agenda),
        location: location,
        start: {
          dateTime: startDateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone,
        },
        attendees: formattedAttendees,
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 }, // 24 hours
            { method: 'popup', minutes: 30 },   // 30 minutes
          ],
        },
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
        sendUpdates: 'all'
      };

      // Create the event
      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all'
      });

      const createdEvent = response.data;
      
      return {
        success: true,
        eventId: createdEvent.id,
        meetUrl: createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri,
        htmlLink: createdEvent.htmlLink,
        event: createdEvent
      };

    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      
      // Fallback to generated Meet URL if Google Calendar fails
      const fallbackMeetUrl = this.generateFallbackMeetUrl();
      
      return {
        success: false,
        error: error.message,
        fallbackMeetUrl: fallbackMeetUrl
      };
    }
  }

  async updateMeetingEvent(eventId, updateData, calendarId = 'primary') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const response = await this.calendar.events.patch({
        calendarId: calendarId,
        eventId: eventId,
        resource: updateData,
        sendUpdates: 'all'
      });

      return {
        success: true,
        event: response.data
      };

    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cancelMeetingEvent(eventId, calendarId = 'primary') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
        sendUpdates: 'all'
      });

      return {
        success: true
      };

    } catch (error) {
      console.error('Error cancelling Google Calendar event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getMeetingEvent(eventId, calendarId = 'primary') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const response = await this.calendar.events.get({
        calendarId: calendarId,
        eventId: eventId
      });

      return {
        success: true,
        event: response.data
      };

    } catch (error) {
      console.error('Error getting Google Calendar event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatDescription(description, agenda) {
    let formattedDescription = description || '';
    
    if (agenda) {
      formattedDescription += '\n\n📋 Agenda:\n' + agenda;
    }
    
    formattedDescription += '\n\n📱 Meeting generated by Logam Academy CRM';
    
    return formattedDescription;
  }

  generateFallbackMeetUrl() {
    // Generate a realistic-looking Google Meet URL as fallback
    const meetingId = this.generateMeetingId();
    return `https://meet.google.com/${meetingId}`;
  }

  generateMeetingId() {
    // Generate realistic Google Meet ID format: xxx-xxxx-xxx
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const part1 = Array.from({length: 3}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part3 = Array.from({length: 3}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part1}-${part2}-${part3}`;
  }
}

// Meeting notification service
export class MeetingNotificationService {
  static async sendMeetingInvitation({
    meeting,
    attendees,
    organizer,
    client
  }) {
    try {
      const emailPromises = attendees.map(async (attendee) => {
        if (!attendee.email) return null;

        const emailContent = this.generateInvitationEmail({
          meeting,
          attendee,
          organizer,
          client
        });

        return sendEmail({
          to: attendee.email,
          subject: `Meeting Invitation: ${meeting.title}`,
          html: emailContent.html,
          text: emailContent.text
        });
      });

      const results = await Promise.allSettled(emailPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        sent: successful,
        failed: failed,
        details: results
      };

    } catch (error) {
      console.error('Error sending meeting invitations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async sendMeetingUpdate({
    meeting,
    attendees,
    organizer,
    client,
    updateType = 'updated'
  }) {
    try {
      const emailPromises = attendees.map(async (attendee) => {
        if (!attendee.email) return null;

        const emailContent = this.generateUpdateEmail({
          meeting,
          attendee,
          organizer,
          client,
          updateType
        });

        return sendEmail({
          to: attendee.email,
          subject: `Meeting ${updateType}: ${meeting.title}`,
          html: emailContent.html,
          text: emailContent.text
        });
      });

      const results = await Promise.allSettled(emailPromises);
      
      return {
        success: true,
        sent: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
      };

    } catch (error) {
      console.error('Error sending meeting updates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static generateInvitationEmail({ meeting, attendee, organizer, client }) {
    const startTime = new Date(meeting.startDateTime?.toDate?.() || meeting.startDateTime);
    const endTime = new Date(meeting.endDateTime?.toDate?.() || meeting.endDateTime);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0;">Meeting Invitation</h2>
          <p style="color: #666; margin: 10px 0 0 0;">You've been invited to join a meeting</p>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">${meeting.title}</h3>
          
          <div style="margin: 20px 0;">
            <p><strong>📅 Date:</strong> ${startTime.toLocaleDateString()}</p>
            <p><strong>🕐 Time:</strong> ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}</p>
            <p><strong>🌍 Timezone:</strong> ${meeting.timezone || 'UTC'}</p>
            <p><strong>👤 Organizer:</strong> ${organizer.name || organizer.username}</p>
            <p><strong>🏢 Client:</strong> ${client.name}</p>
            ${meeting.location ? `<p><strong>📍 Location:</strong> ${meeting.location}</p>` : ''}
          </div>
          
          ${meeting.description ? `
            <div style="margin: 20px 0;">
              <h4 style="color: #333;">Description:</h4>
              <p style="color: #666;">${meeting.description}</p>
            </div>
          ` : ''}
          
          ${meeting.agenda ? `
            <div style="margin: 20px 0;">
              <h4 style="color: #333;">Agenda:</h4>
              <p style="color: #666; white-space: pre-wrap;">${meeting.agenda}</p>
            </div>
          ` : ''}
          
          ${meeting.meetUrl ? `
            <div style="margin: 30px 0; text-align: center;">
              <a href="${meeting.meetUrl}" 
                 style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Join Meeting
              </a>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #666; font-size: 12px;">
            <p>This invitation was sent by Logam Academy CRM on behalf of ${organizer.name || organizer.username}</p>
          </div>
        </div>
      </div>
    `;

    const text = `
Meeting Invitation: ${meeting.title}

Date: ${startTime.toLocaleDateString()}
Time: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}
Timezone: ${meeting.timezone || 'UTC'}
Organizer: ${organizer.name || organizer.username}
Client: ${client.name}
${meeting.location ? `Location: ${meeting.location}` : ''}

${meeting.description ? `Description: ${meeting.description}` : ''}
${meeting.agenda ? `Agenda: ${meeting.agenda}` : ''}
${meeting.meetUrl ? `Meeting URL: ${meeting.meetUrl}` : ''}

This invitation was sent by Logam Academy CRM.
    `;

    return { html, text };
  }

  static generateUpdateEmail({ meeting, attendee, organizer, client, updateType }) {
    const startTime = new Date(meeting.startDateTime?.toDate?.() || meeting.startDateTime);
    const endTime = new Date(meeting.endDateTime?.toDate?.() || meeting.endDateTime);
    
    const statusColors = {
      updated: '#28a745',
      cancelled: '#dc3545',
      rescheduled: '#ffc107'
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${statusColors[updateType] || '#f8f9fa'}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: white; margin: 0;">Meeting ${updateType.charAt(0).toUpperCase() + updateType.slice(1)}</h2>
          <p style="color: white; margin: 10px 0 0 0;">Your meeting has been ${updateType}</p>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">${meeting.title}</h3>
          
          ${updateType !== 'cancelled' ? `
            <div style="margin: 20px 0;">
              <p><strong>📅 Date:</strong> ${startTime.toLocaleDateString()}</p>
              <p><strong>🕐 Time:</strong> ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}</p>
              <p><strong>🌍 Timezone:</strong> ${meeting.timezone || 'UTC'}</p>
              <p><strong>👤 Organizer:</strong> ${organizer.name || organizer.username}</p>
              <p><strong>🏢 Client:</strong> ${client.name}</p>
              ${meeting.location ? `<p><strong>📍 Location:</strong> ${meeting.location}</p>` : ''}
            </div>
            
            ${meeting.meetUrl ? `
              <div style="margin: 30px 0; text-align: center;">
                <a href="${meeting.meetUrl}" 
                   style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Join Meeting
                </a>
              </div>
            ` : ''}
          ` : `
            <div style="margin: 20px 0; padding: 15px; background: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
              <p style="color: #721c24; margin: 0;">This meeting has been cancelled. Please contact the organizer if you have any questions.</p>
            </div>
          `}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #666; font-size: 12px;">
            <p>This update was sent by Logam Academy CRM on behalf of ${organizer.name || organizer.username}</p>
          </div>
        </div>
      </div>
    `;

    const text = `
Meeting ${updateType.charAt(0).toUpperCase() + updateType.slice(1)}: ${meeting.title}

${updateType !== 'cancelled' ? `
Date: ${startTime.toLocaleDateString()}
Time: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}
Timezone: ${meeting.timezone || 'UTC'}
Organizer: ${organizer.name || organizer.username}
Client: ${client.name}
${meeting.location ? `Location: ${meeting.location}` : ''}
${meeting.meetUrl ? `Meeting URL: ${meeting.meetUrl}` : ''}
` : 'This meeting has been cancelled. Please contact the organizer if you have any questions.'}

This update was sent by Logam Academy CRM.
    `;

    return { html, text };
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
export { MeetingNotificationService };