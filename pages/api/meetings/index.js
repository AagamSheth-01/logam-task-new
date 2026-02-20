import { verifyTokenFromRequest } from '../../../lib/auth';
import { getMeetings, addMeeting } from '../../../lib/firebaseService';

export default async function handler(req, res) {
  // Verify authentication
  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: authResult.message || 'Unauthorized' });
  }

  // Multi-tenancy: Extract tenantId from authenticated request
  const { user, tenantId } = authResult;

  try {
    switch (req.method) {
      case 'GET':
        await handleGetMeetings(req, res, user, tenantId);
        break;
      case 'POST':
        await handleCreateMeeting(req, res, user, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Meeting API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

async function handleGetMeetings(req, res, user, tenantId) {
  try {
    const { clientId, date, type, status } = req.query;

    const filters = { tenantId };
    if (clientId) filters.clientId = clientId;
    if (date) filters.date = date;
    if (type) filters.type = type;
    if (status) filters.status = status;

    const meetings = await getMeetings(filters);
    
    res.status(200).json({ 
      success: true, 
      meetings: meetings,
      total: meetings.length
    });
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load meetings' 
    });
  }
}

async function handleCreateMeeting(req, res, user, tenantId) {
  try {
    // Validate required fields
    const { title, date, startTime, clientId } = req.body;

    if (!title || !date || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Meeting title, date, and start time are required'
      });
    }

    // Validate date format
    const meetingDate = new Date(date);
    if (isNaN(meetingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date'
      });
    }

    // Check if meeting date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (meetingDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Meeting date cannot be in the past'
      });
    }

    // Prepare meeting data
    const meetingData = {
      title: title.trim(),
      description: req.body.description?.trim() || '',
      clientId: clientId || '',
      clientName: req.body.clientName?.trim() || '',
      date: date,
      startTime: startTime,
      endTime: req.body.endTime || '',
      type: req.body.type || 'video',
      location: req.body.location?.trim() || '',
      meetingLink: req.body.meetingLink?.trim() || '',
      agenda: req.body.agenda?.trim() || '',
      attendees: req.body.attendees || [],
      priority: req.body.priority || 'Medium',
      status: 'scheduled',
      notes: req.body.notes?.trim() || '',
      createdBy: user.username
    };

    const newMeeting = await addMeeting(meetingData, tenantId);
    
    res.status(201).json({ 
      success: true, 
      meeting: newMeeting,
      message: 'Meeting scheduled successfully' 
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to schedule meeting' 
    });
  }
}