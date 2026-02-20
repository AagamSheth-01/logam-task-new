import { verifyTokenFromRequest } from '../../../../lib/auth';
import { getClientById, logActivity, getTasks } from '../../../../lib/firebaseService';
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
        await handleGetClientCalendar(req, res, clientId, user, tenantId);
        break;
      case 'POST':
        await handleCreateCalendarEvent(req, res, clientId, user, tenantId);
        break;
      case 'PUT':
        await handleUpdateCalendarEvent(req, res, clientId, user, tenantId);
        break;
      case 'DELETE':
        await handleDeleteCalendarEvent(req, res, clientId, user, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client calendar API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

// Get unified calendar data for a client
async function handleGetClientCalendar(req, res, clientId, user, tenantId) {
  try {
    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const { startDate, endDate, view = 'month' } = req.query;

    // Get all data sources in parallel
    const [meetings, customEvents, tasks] = await Promise.all([
      getClientMeetings(clientId, startDate, endDate, tenantId),
      getClientCustomEvents(clientId, startDate, endDate, tenantId),
      getClientTasks(clientId, startDate, endDate, tenantId)
    ]);

    // Transform data into unified calendar format
    const calendarEvents = [];

    // Add meetings
    meetings.forEach(meeting => {
      calendarEvents.push({
        id: `meeting_${meeting.id}`,
        title: meeting.title,
        description: meeting.description,
        start: meeting.startDateTime?.toDate?.() || new Date(meeting.startDateTime),
        end: meeting.endDateTime?.toDate?.() || new Date(meeting.endDateTime),
        type: 'meeting',
        subtype: meeting.meetingType,
        color: '#4285f4', // Google Blue
        url: meeting.meetUrl,
        attendees: meeting.attendees || [],
        location: meeting.location,
        status: meeting.status,
        metadata: {
          meetingId: meeting.id,
          agenda: meeting.agenda,
          isRecurring: meeting.isRecurring,
          reminderMinutes: meeting.reminderMinutes,
          createdBy: meeting.createdBy
        }
      });
    });

    // Add custom events
    customEvents.forEach(event => {
      calendarEvents.push({
        id: `event_${event.id}`,
        title: event.title,
        description: event.description,
        start: event.startDateTime?.toDate?.() || new Date(event.startDateTime),
        end: event.endDateTime?.toDate?.() || new Date(event.endDateTime),
        type: 'event',
        subtype: event.eventType,
        color: event.color || '#9c27b0', // Purple
        allDay: event.isAllDay,
        location: event.location,
        status: event.status,
        attendees: event.attendees || [],
        metadata: {
          eventId: event.id,
          isRecurring: event.isRecurring,
          reminderMinutes: event.reminderMinutes,
          linkedTaskId: event.linkedTaskId,
          linkedMeetingId: event.linkedMeetingId,
          createdBy: event.createdBy
        }
      });
    });

    // Add task deadlines
    tasks.forEach(task => {
      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        calendarEvents.push({
          id: `task_${task.id}`,
          title: `📋 ${task.task}`,
          description: `Task deadline: ${task.task}`,
          start: deadlineDate,
          end: deadlineDate,
          type: 'task',
          subtype: 'deadline',
          color: task.status === 'done' ? '#4caf50' : (task.priority === 'High' ? '#f44336' : '#ff9800'),
          allDay: true,
          status: task.status,
          priority: task.priority,
          metadata: {
            taskId: task.id,
            assignedTo: task.assigned_to,
            givenBy: task.given_by,
            clientName: task.client_name,
            completedDate: task.completed_date,
            timeSpent: task.time_spent
          }
        });
      }
    });

    // Sort events by start date
    calendarEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    // Calculate summary statistics
    const now = new Date();
    const summary = {
      totalEvents: calendarEvents.length,
      upcomingEvents: calendarEvents.filter(e => new Date(e.start) > now).length,
      todayEvents: calendarEvents.filter(e => {
        const eventDate = new Date(e.start);
        return eventDate.toDateString() === now.toDateString();
      }).length,
      meetings: meetings.length,
      customEvents: customEvents.length,
      taskDeadlines: tasks.filter(t => t.deadline).length,
      overdueTasks: tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'done').length
    };

    res.status(200).json({ 
      success: true, 
      events: calendarEvents,
      clientName: client.name,
      summary: summary,
      view: view
    });
  } catch (error) {
    console.error('Error getting client calendar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load client calendar' 
    });
  }
}

// Create a custom calendar event
async function handleCreateCalendarEvent(req, res, clientId, user, tenantId) {
  try {
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      eventType = 'reminder',
      isAllDay = false,
      location = '',
      attendees = [],
      color = '#9c27b0',
      reminderMinutes = [15],
      linkedTaskId = null,
      linkedMeetingId = null
    } = req.body;

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Validate required fields
    if (!title || !startDateTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and start date/time are required' 
      });
    }

    // Validate event type
    const validEventTypes = ['meeting', 'deadline', 'milestone', 'reminder', 'review'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}` 
      });
    }

    // Validate date range for non-all-day events
    if (!isAllDay && endDateTime) {
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);
      if (startDate >= endDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'End date/time must be after start date/time' 
        });
      }
    }

    // Create event data
    const eventData = {
      tenantId: tenantId,
      clientId: clientId,
      title: title,
      description: description || '',
      eventType: eventType,
      startDateTime: admin.firestore.Timestamp.fromDate(new Date(startDateTime)),
      endDateTime: endDateTime ? admin.firestore.Timestamp.fromDate(new Date(endDateTime)) : null,
      isAllDay: isAllDay,
      location: location,
      attendees: attendees,
      color: color,
      isRecurring: false,
      recurringPattern: null,
      reminderMinutes: reminderMinutes,
      status: 'active',
      linkedTaskId: linkedTaskId,
      linkedMeetingId: linkedMeetingId,
      createdBy: user.username,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const eventDoc = await adminDb.collection('client_calendar_events').add(eventData);

    // Log activity
    await logActivity({
      action: 'calendar_event_created',
      clientId: clientId,
      userId: user.username,
      details: {
        eventId: eventDoc.id,
        title: title,
        eventType: eventType,
        startDateTime: startDateTime,
        clientName: client.name
      }
    }, tenantId);

    res.status(201).json({ 
      success: true, 
      message: 'Calendar event created successfully',
      event: {
        id: eventDoc.id,
        title: title,
        description: description,
        eventType: eventType,
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        isAllDay: isAllDay,
        color: color,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create calendar event',
      error: error.message
    });
  }
}

// Update a calendar event
async function handleUpdateCalendarEvent(req, res, clientId, user, tenantId) {
  try {
    const { eventId } = req.query;
    const updateData = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required for update'
      });
    }

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Get event
    const eventDoc = await adminDb.collection('client_calendar_events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const eventData = eventDoc.data();

    // Verify event belongs to this client and tenant
    if (eventData.clientId !== clientId || eventData.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: 'Event does not belong to this client' });
    }

    // Prepare update data
    const dataToUpdate = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update allowed fields
    if (updateData.title !== undefined) dataToUpdate.title = updateData.title;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.eventType !== undefined) dataToUpdate.eventType = updateData.eventType;
    if (updateData.location !== undefined) dataToUpdate.location = updateData.location;
    if (updateData.attendees !== undefined) dataToUpdate.attendees = updateData.attendees;
    if (updateData.color !== undefined) dataToUpdate.color = updateData.color;
    if (updateData.isAllDay !== undefined) dataToUpdate.isAllDay = updateData.isAllDay;
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
    if (updateData.reminderMinutes !== undefined) dataToUpdate.reminderMinutes = updateData.reminderMinutes;
    if (updateData.linkedTaskId !== undefined) dataToUpdate.linkedTaskId = updateData.linkedTaskId;
    if (updateData.linkedMeetingId !== undefined) dataToUpdate.linkedMeetingId = updateData.linkedMeetingId;

    // Handle date/time updates
    if (updateData.startDateTime !== undefined) {
      dataToUpdate.startDateTime = admin.firestore.Timestamp.fromDate(new Date(updateData.startDateTime));
    }
    if (updateData.endDateTime !== undefined) {
      dataToUpdate.endDateTime = updateData.endDateTime ? 
        admin.firestore.Timestamp.fromDate(new Date(updateData.endDateTime)) : null;
    }

    // Update the event
    await eventDoc.ref.update(dataToUpdate);

    // Log activity
    await logActivity({
      action: 'calendar_event_updated',
      clientId: clientId,
      userId: user.username,
      details: {
        eventId: eventId,
        title: dataToUpdate.title || eventData.title,
        updatedFields: Object.keys(dataToUpdate).filter(key => key !== 'updatedAt'),
        clientName: client.name
      }
    }, tenantId);

    res.status(200).json({ 
      success: true, 
      message: 'Calendar event updated successfully' 
    });

  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update calendar event' 
    });
  }
}

// Delete a calendar event
async function handleDeleteCalendarEvent(req, res, clientId, user, tenantId) {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required for deletion'
      });
    }

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Get event
    const eventDoc = await adminDb.collection('client_calendar_events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const eventData = eventDoc.data();

    // Verify event belongs to this client and tenant
    if (eventData.clientId !== clientId || eventData.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: 'Event does not belong to this client' });
    }

    // Delete the event (soft delete)
    await eventDoc.ref.update({
      status: 'deleted',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: user.username
    });

    // Log activity
    await logActivity({
      action: 'calendar_event_deleted',
      clientId: clientId,
      userId: user.username,
      details: {
        eventId: eventId,
        title: eventData.title,
        eventType: eventData.eventType,
        clientName: client.name
      }
    }, tenantId);

    res.status(200).json({ 
      success: true, 
      message: 'Calendar event deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete calendar event' 
    });
  }
}

// Helper functions
async function getClientMeetings(clientId, startDate, endDate, tenantId) {
  try {
    let meetingsQuery = adminDb
      .collection('client_meetings')
      .where('tenantId', '==', tenantId)
      .where('clientId', '==', clientId)
      .where('status', '!=', 'cancelled');

    const meetingsSnapshot = await meetingsQuery.get();
    const meetings = [];
    
    meetingsSnapshot.forEach(doc => {
      const meetingData = doc.data();
      
      // Apply date filters in memory
      if (startDate || endDate) {
        const meetingDate = new Date(meetingData.startDateTime?.toDate?.() || meetingData.startDateTime);
        if (startDate && meetingDate < new Date(startDate)) return;
        if (endDate && meetingDate > new Date(endDate)) return;
      }
      
      meetings.push({
        id: doc.id,
        ...meetingData
      });
    });
    
    return meetings;
  } catch (error) {
    console.error('Error getting client meetings:', error);
    return [];
  }
}

async function getClientCustomEvents(clientId, startDate, endDate, tenantId) {
  try {
    let eventsQuery = adminDb
      .collection('client_calendar_events')
      .where('tenantId', '==', tenantId)
      .where('clientId', '==', clientId)
      .where('status', '==', 'active');

    const eventsSnapshot = await eventsQuery.get();
    const events = [];
    
    eventsSnapshot.forEach(doc => {
      const eventData = doc.data();
      
      // Apply date filters in memory
      if (startDate || endDate) {
        const eventDate = new Date(eventData.startDateTime?.toDate?.() || eventData.startDateTime);
        if (startDate && eventDate < new Date(startDate)) return;
        if (endDate && eventDate > new Date(endDate)) return;
      }
      
      events.push({
        id: doc.id,
        ...eventData
      });
    });
    
    return events;
  } catch (error) {
    console.error('Error getting client custom events:', error);
    return [];
  }
}

async function getClientTasks(clientId, startDate, endDate, tenantId) {
  try {
    // Get client first to get the client name
    const client = await getClientById(clientId, tenantId);
    if (!client) return [];

    // Get all tasks and filter by client name
    const allTasks = await getTasks({ tenantId });
    const clientTasks = allTasks.filter(task =>
      task.client_name === client.name &&
      task.deadline // Only include tasks with deadlines
    );
    
    // Apply date filters if provided
    if (startDate || endDate) {
      return clientTasks.filter(task => {
        const taskDate = new Date(task.deadline);
        if (startDate && taskDate < new Date(startDate)) return false;
        if (endDate && taskDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    return clientTasks;
  } catch (error) {
    console.error('Error getting client tasks:', error);
    return [];
  }
}