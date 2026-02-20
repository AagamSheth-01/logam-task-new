// Fixed Meeting API with Simple Meet Link Generation
import { verifyTokenFromRequest } from '../../../../lib/auth';
import { getClientById, logActivity } from '../../../../lib/firebaseService';
import { adminDb } from '../../../../lib/firebase-admin';
import admin from 'firebase-admin';

export default async function handler(req, res) {
  // Verify authentication
  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: authResult.message || 'Unauthorized' });
  }

  // Multi-tenancy: Extract tenantId from authenticated request
  const { user, tenantId } = authResult;
  const { id: clientId } = req.query;

  if (!clientId) {
    return res.status(400).json({ success: false, message: 'Client ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetClientMeetings(req, res, clientId, user, tenantId);
        break;
      case 'POST':
        await handleCreateMeeting(req, res, clientId, user, tenantId);
        break;
      case 'PUT':
        await handleUpdateMeeting(req, res, clientId, user, tenantId);
        break;
      case 'DELETE':
        await handleDeleteMeeting(req, res, clientId, user, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client meetings API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

// Get all meetings for a client
async function handleGetClientMeetings(req, res, clientId, user, tenantId) {
  try {
    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const { status, startDate, endDate } = req.query;

    let meetingsQuery = adminDb
      .collection('client_meetings')
      .where('tenantId', '==', tenantId)
      .where('clientId', '==', clientId);

    if (status && status !== 'all') {
      meetingsQuery = meetingsQuery.where('status', '==', status);
    }

    const meetingsSnapshot = await meetingsQuery.get();
    
    console.log(`📅 Found ${meetingsSnapshot.docs.length} meetings for client ${clientId}`);
    
    const meetings = [];
    meetingsSnapshot.forEach(doc => {
      const meetingData = doc.data();
      
      // Apply date filters in memory
      let includeInResults = true;
      if (startDate || endDate) {
        const meetingDate = new Date(meetingData.startDateTime?.toDate?.() || meetingData.startDateTime);
        if (startDate && meetingDate < new Date(startDate)) {
          includeInResults = false;
        }
        if (endDate && meetingDate > new Date(endDate)) {
          includeInResults = false;
        }
      }

      if (includeInResults) {
        meetings.push({
          id: doc.id,
          title: meetingData.title || 'Untitled Meeting',
          description: meetingData.description || '',
          meetingType: meetingData.meetingType || 'google_meet',
          meetUrl: meetingData.meetUrl || '',
          meetingLinks: meetingData.meetingLinks || {},
          startDateTime: meetingData.startDateTime,
          endDateTime: meetingData.endDateTime,
          timezone: meetingData.timezone || 'UTC',
          attendees: meetingData.attendees || [],
          agenda: meetingData.agenda || '',
          location: meetingData.location || 'Virtual',
          status: meetingData.status || 'scheduled',
          createdBy: meetingData.createdBy,
          createdAt: meetingData.createdAt,
          updatedAt: meetingData.updatedAt
        });
      }
    });

    // Sort meetings by start date
    meetings.sort((a, b) => {
      const aTime = a.startDateTime?.toDate?.() || new Date(a.startDateTime);
      const bTime = b.startDateTime?.toDate?.() || new Date(b.startDateTime);
      return aTime - bTime;
    });

    res.status(200).json({ 
      success: true, 
      meetings,
      clientName: client.name,
      total: meetings.length
    });
  } catch (error) {
    console.error('Error getting client meetings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load client meetings' 
    });
  }
}

// Create a new meeting
async function handleCreateMeeting(req, res, clientId, user, tenantId) {
  try {
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      timezone = 'UTC',
      attendees = [],
      agenda = '',
      location = 'Virtual',
      createGoogleMeet = true
    } = req.body;

    console.log('📅 Creating meeting with data:', {
      title,
      startDateTime,
      endDateTime,
      clientId,
      createGoogleMeet
    });

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Validate required fields
    if (!title || !startDateTime || !endDateTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, start date/time, and end date/time are required' 
      });
    }

    // Validate date range
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    if (startDate >= endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date/time must be after start date/time' 
      });
    }

    // Validate future date
    const now = new Date();
    if (startDate < now) {
      return res.status(400).json({ 
        success: false, 
        message: 'Meeting cannot be scheduled in the past' 
      });
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

    // Generate Meet URL if requested
    let meetUrl = null;
    let meetingLinks = {};
    
    if (createGoogleMeet) {
      meetingLinks = generateMeetingLinks(title, startDateTime, endDateTime);
      meetUrl = meetingLinks.googleMeet; // Keep for backward compatibility
    }

    // Create meeting record
    const meetingData = {
      tenantId: tenantId,
      clientId: clientId,
      title: title.trim(),
      description: description || '',
      meetingType: createGoogleMeet ? 'google_meet' : 'custom',
      meetUrl: meetUrl,
      meetingLinks: meetingLinks,
      startDateTime: admin.firestore.Timestamp.fromDate(startDate),
      endDateTime: admin.firestore.Timestamp.fromDate(endDate),
      timezone: timezone,
      attendees: validatedAttendees,
      agenda: agenda,
      location: location,
      status: 'scheduled',
      createdBy: user.username,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const meetingDoc = await adminDb.collection('client_meetings').add(meetingData);

    // Log activity
    await logActivity({
      action: 'meeting_created',
      clientId: clientId,
      userId: user.username,
      details: {
        meetingId: meetingDoc.id,
        title: title,
        startDateTime: startDateTime,
        attendeeCount: validatedAttendees.length,
        hasGoogleMeet: !!meetUrl,
        clientName: client.name
      }
    }, tenantId);

    console.log('✅ Meeting created successfully:', meetingDoc.id);

    res.status(201).json({ 
      success: true, 
      message: 'Meeting created successfully',
      meeting: {
        id: meetingDoc.id,
        ...meetingData,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create meeting',
      error: error.message
    });
  }
}

// Update a meeting
async function handleUpdateMeeting(req, res, clientId, user, tenantId) {
  try {
    const { meetingId } = req.query;
    const updateData = req.body;

    if (!meetingId) {
      return res.status(400).json({ success: false, message: 'Meeting ID is required' });
    }

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Get existing meeting
    const meetingDoc = await adminDb.collection('client_meetings').doc(meetingId);
    const meetingSnapshot = await meetingDoc.get();
    
    if (!meetingSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meetingData = meetingSnapshot.data();

    // Check permissions
    if (meetingData.createdBy !== user.username && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this meeting' });
    }

    // Prepare update data
    const dataToUpdate = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update the meeting
    await meetingDoc.update(dataToUpdate);

    // Log activity
    await logActivity({
      action: 'meeting_updated',
      clientId: clientId,
      userId: user.username,
      details: {
        meetingId: meetingId,
        title: dataToUpdate.title || meetingData.title,
        updatedFields: Object.keys(dataToUpdate).filter(key => key !== 'updatedAt'),
        clientName: client.name
      }
    }, tenantId);

    res.status(200).json({ 
      success: true, 
      message: 'Meeting updated successfully' 
    });

  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update meeting' 
    });
  }
}

// Delete/Cancel a meeting
async function handleDeleteMeeting(req, res, clientId, user, tenantId) {
  try {
    const { meetingId } = req.query;

    if (!meetingId) {
      return res.status(400).json({ success: false, message: 'Meeting ID is required' });
    }

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Get existing meeting
    const meetingDoc = await adminDb.collection('client_meetings').doc(meetingId);
    const meetingSnapshot = await meetingDoc.get();
    
    if (!meetingSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meetingData = meetingSnapshot.data();

    // Check permissions
    if (meetingData.createdBy !== user.username && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this meeting' });
    }

    // Update meeting status to cancelled
    await meetingDoc.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: user.username,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log activity
    await logActivity({
      action: 'meeting_cancelled',
      clientId: clientId,
      userId: user.username,
      details: {
        meetingId: meetingId,
        title: meetingData.title,
        clientName: client.name
      }
    }, tenantId);

    res.status(200).json({ 
      success: true, 
      message: 'Meeting cancelled successfully' 
    });

  } catch (error) {
    console.error('Error cancelling meeting:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel meeting' 
    });
  }
}

// Helper function to generate simple Meet link
function generateMeetingLinks(title, startDateTime, endDateTime) {
  const encodedTitle = encodeURIComponent(title);
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  
  // Format dates for Google Calendar
  const formatGoogleDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const startFormatted = formatGoogleDate(startDate);
  const endFormatted = formatGoogleDate(endDate);
  
  return {
    // Google Meet - Direct link (users can create their own)
    googleMeet: 'https://meet.google.com/new',
    
    // Google Calendar event creation link
    googleCalendar: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${startFormatted}/${endFormatted}&location=https://meet.google.com/new&sf=true&output=xml`,
    
    // Alternative video conferencing options
    zoom: 'https://zoom.us/start/videomeeting',
    teams: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_placeholder',
    
    // Generic meeting room (for internal use)
    internal: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/meeting/${generateMeetingId()}`,
    
    // Instructions for manual setup
    instructions: 'Please create a Google Meet link manually by visiting meet.google.com/new and share the link with attendees.'
  };
}

function generateMeetingId() {
  // Generate a unique meeting ID for internal use
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = 12;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}