# Enhanced Notification System Documentation

## Overview

The notification system has been completely overhauled to provide powerful, real-time, multi-channel notifications with smart features like priority levels, batching, action buttons, and escalation.

## Features Implemented

### 1. **Priority Levels**
- **CRITICAL** (Red): Immediate attention, sound, vibration, requires interaction
- **HIGH** (Orange): Important, sound, minimal batching
- **MEDIUM** (Blue): Normal, optional sound, batching allowed
- **LOW** (Gray): Informational, no sound, batched

### 2. **Multi-Channel Notifications**
- ✅ In-app real-time notifications (Server-Sent Events)
- ✅ Browser push notifications (desktop/mobile)
- ✅ Email notifications
- ✅ Service Worker for background notifications

### 3. **Smart Batching**
- Groups similar notifications to avoid spam
- Low priority: batched every 10 seconds
- Medium priority: batched every 5 seconds
- High/Critical: shown immediately

### 4. **Action Buttons**
Quick actions directly from notifications:
- **View Task** - Navigate to task details
- **Mark Done** - Complete task immediately
- **Snooze 1h** - Remind later
- **View Attendance** - Check attendance details

### 5. **Notification Triggers**

#### Task Notifications
- **Task Assignment** (Medium/High priority)
  - Triggers: When admin assigns a task
  - Recipient: Assigned user
  - Actions: View Task, Mark Done

- **Task Completion** (Medium priority)
  - Triggers: When user completes a task
  - Recipient: Task assigner
  - Actions: View Task

- **Task Status Change** (Low priority)
  - Triggers: When task status changes
  - Recipient: Task assigner
  - Actions: View Task

#### Deadline Reminders (Escalation System)
- **3 Days Before** (Low priority)
- **24 Hours Before** (Medium priority)
- **3 Hours Before** (High priority)
- **1 Hour Before** (Critical priority)
- **15 Minutes Before** (Critical priority)

#### Attendance Notifications
- **Attendance Submitted** (Low priority)
  - Triggers: When user marks attendance
  - Recipient: All admins
  - Actions: View Attendance

- **Attendance Approved** (Medium priority)
  - Triggers: When admin approves
  - Recipient: User who submitted
  - Actions: View Attendance

- **Attendance Rejected** (High priority)
  - Triggers: When admin rejects
  - Recipient: User who submitted
  - Actions: View Attendance
  - Shows rejection reason if provided

## Architecture

### Components

1. **NotificationService** (`lib/notificationService.js`)
   - Core notification logic
   - Priority handling
   - Smart batching
   - Sound management

2. **DeadlineScheduler** (`lib/notificationService.js`)
   - Manages deadline reminders
   - Escalation logic
   - Auto-scheduling

3. **NotificationSystem Component** (`components/NotificationSystem.js`)
   - UI for notification center
   - Settings panel
   - Real-time updates via SSE
   - Service worker message handling

4. **Service Worker** (`public/sw.js`)
   - Background notifications
   - Action button handlers
   - Offline support
   - Push notification management

5. **SSE Stream** (`pages/api/notifications/stream.js`)
   - Real-time notification delivery
   - Firebase listeners
   - Connection management
   - Heartbeat system

## API Integration

### Task Creation
File: `pages/api/tasks/index.js`
- Sends notification to assigned user
- Sends email notification
- Broadcasts via SSE

### Task Update
File: `pages/api/tasks/[id].js`
- Detects status changes
- Sends completion notifications
- Sends status change notifications

### Attendance Submission
File: `pages/api/attendance/index.js`
- Notifies admins when submitted
- Low priority notification

### Attendance Approval/Rejection
File: `pages/api/attendance/[id].js`
- Notifies user of approval
- High priority for rejections
- Includes rejection reason

### Deadline Reminders
File: `pages/api/reminders/check.js`
- Checks for upcoming deadlines
- Sends escalating reminders
- Should be called via cron job

## Configuration

### User Preferences (Saved in localStorage)
```javascript
{
  taskAssignments: true,      // Task assignment notifications
  taskCompletions: true,      // Task completion notifications
  taskComments: true,         // Comment notifications
  deadlineReminders: true,    // Deadline reminder notifications
  attendanceAlerts: true,     // Attendance notifications
  sessionWarnings: true,      // Session timeout warnings
  sound: true,                // Sound effects
  desktop: true,              // Desktop notifications
  batching: true,             // Group similar notifications
  email: false                // Email notifications (future)
}
```

### Notification Data Structure
```javascript
{
  type: 'task_assigned',           // Notification type
  title: 'New Task Assigned',      // Notification title
  message: 'Description',          // Notification body
  timestamp: '2025-11-07T...',     // ISO timestamp
  priority: 'medium',              // Priority level
  data: {                          // Custom data
    taskId: 'abc123',
    assignedBy: 'admin',
    ...
  }
}
```

## Testing Guide

### 1. Test Task Assignment Notification
```bash
# As admin, create a new task
# Expected: User receives notification immediately
# Channels: In-app, Desktop, Email
```

### 2. Test Task Completion Notification
```bash
# As user, mark a task as done
# Expected: Task assigner receives notification
# Channels: In-app, Desktop, Email
```

### 3. Test Deadline Reminders
```bash
# Call the reminder check API (should be automated via cron)
curl -X POST http://localhost:3000/api/reminders/check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: Users with upcoming deadlines receive notifications
# Priority escalates as deadline approaches
```

### 4. Test Attendance Notifications
```bash
# As user, mark attendance
# Expected: All admins receive notification

# As admin, approve/reject attendance
# Expected: User receives notification
```

### 5. Test Service Worker Actions
```bash
# Click "Mark Done" button on notification
# Expected: Task marked as done without opening app

# Click "View Task" button
# Expected: App opens to task details
```

### 6. Test Smart Batching
```bash
# Create multiple low-priority notifications quickly
# Expected: Notifications are grouped and shown together
```

## Setup Instructions

### 1. Enable Notifications in Browser
- Click the bell icon in the app
- Grant notification permission when prompted

### 2. Configure Preferences
- Click settings icon in notification center
- Toggle notification types and channels
- Enable/disable sound and batching

### 3. Set Up Cron Job for Deadline Reminders
Add to your deployment platform (Vercel, Netlify, etc.):
```bash
# Run every 15 minutes
*/15 * * * * curl -X POST https://yourapp.com/api/reminders/check \
  -H "Authorization: Bearer SYSTEM_TOKEN"
```

Or use Vercel Cron:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/reminders/check",
    "schedule": "*/15 * * * *"
  }]
}
```

### 4. Service Worker Registration
Already configured in `_app.js` or `_document.js`:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## Troubleshooting

### Notifications Not Showing
1. Check browser notification permission
2. Verify SSE connection in Network tab
3. Check console for errors
4. Ensure preferences are enabled

### Service Worker Not Working
1. Check if SW is registered: Chrome DevTools > Application > Service Workers
2. Verify SW scope includes notification pages
3. Try unregistering and re-registering SW

### Deadline Reminders Not Sent
1. Verify cron job is configured
2. Check API logs for errors
3. Ensure tasks have valid deadlines
4. Verify user authentication in cron request

### Actions Not Working
1. Check if clicking notification focuses window
2. Verify service worker message handler
3. Check browser console for errors
4. Ensure action handlers are defined

## Future Enhancements

### Planned Features
- [ ] Push notification subscriptions (Web Push API)
- [ ] Notification history persistence (database)
- [ ] Advanced filtering and search
- [ ] Notification digest (daily/weekly summaries)
- [ ] Custom notification sounds
- [ ] Do Not Disturb mode
- [ ] Mobile app integration
- [ ] Notification analytics
- [ ] Template system for custom notifications
- [ ] User-to-user notifications

### Optimization Opportunities
- [ ] Add database caching for notifications
- [ ] Implement notification rate limiting
- [ ] Add notification expiry system
- [ ] Optimize SSE reconnection logic
- [ ] Add notification delivery confirmation
- [ ] Implement retry logic for failed notifications

## Performance Considerations

1. **SSE Connection Management**
   - Auto-reconnect after 5 seconds on error
   - Heartbeat every 30 seconds
   - Stale connection cleanup after 5 minutes

2. **Notification Batching**
   - Reduces notification spam
   - Improves performance for multiple events
   - Configurable per user

3. **Memory Management**
   - Keep only last 50 notifications in memory
   - Clear old notifications automatically
   - Efficient event listener cleanup

## Security Considerations

1. **Authentication**
   - All notification APIs require valid JWT token
   - SSE stream validates user identity
   - Action handlers verify permissions

2. **Data Privacy**
   - Notifications filtered by user permissions
   - Private notes not included in notifications
   - Sensitive data not stored in browser notifications

3. **Rate Limiting**
   - Prevent notification spam
   - Batch similar notifications
   - Limit notification frequency per user

## Browser Support

- ✅ Chrome/Edge (v90+)
- ✅ Firefox (v88+)
- ✅ Safari (v14+)
- ⚠️ Mobile browsers (limited action support)
- ❌ IE11 (not supported)

## Dependencies

- Server-Sent Events (native)
- Service Worker API (native)
- Notification API (native)
- Lucide React (icons)
- Firebase (backend)

## Files Modified/Created

### New Files
- `lib/notificationService.js` - Core notification service
- `pages/api/reminders/check.js` - Deadline reminder checker
- `NOTIFICATION_SYSTEM.md` - This documentation

### Modified Files
- `components/NotificationSystem.js` - Enhanced with new features
- `hooks/useNotifications.js` - Updated import path
- `pages/api/tasks/index.js` - Added task assignment notifications
- `pages/api/tasks/[id].js` - Added task update notifications
- `pages/api/attendance/index.js` - Added attendance submission notifications
- `pages/api/attendance/[id].js` - Added attendance approval notifications
- `pages/api/notifications/stream.js` - Already had SSE support
- `public/sw.js` - Enhanced with action handlers

## Support

For issues or questions about the notification system:
1. Check console logs for errors
2. Verify browser compatibility
3. Test in incognito mode (to rule out extension conflicts)
4. Check network tab for SSE connection status

---

**Last Updated:** November 7, 2025
**Version:** 2.0
**Status:** Production Ready ✅
