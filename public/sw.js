// Service Worker for background notifications
const CACHE_NAME = 'task-manager-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/admin',
  '/icons/Logam Academy LOGO 512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  let notification = {
    title: 'Logam Task Manager',
    body: 'New notification',
    type: 'system',
    priority: 'medium',
    data: {}
  };

  // Parse notification data
  if (event.data) {
    try {
      notification = event.data.json();
    } catch (error) {
      notification.body = event.data.text();
    }
  }

  // Get appropriate icon based on notification type
  const iconMap = {
    'task_assigned': '/icons/task-assigned.png',
    'task_completed': '/icons/task-completed.png',
    'deadline_reminder': '/icons/deadline.png',
    'deadline_critical': '/icons/deadline-critical.png',
    'attendance_submitted': '/icons/attendance.png',
    'attendance_approved': '/icons/success.png',
    'attendance_rejected': '/icons/error.png',
    'error': '/icons/error.png',
    'success': '/icons/success.png'
  };

  // Define actions based on notification type
  let actions = [];
  if (notification.type === 'task_assigned' || notification.type === 'deadline_reminder' || notification.type === 'deadline_critical') {
    actions = [
      {
        action: 'view-task',
        title: 'View Task',
        icon: '/icons/view.png'
      },
      {
        action: 'mark-done',
        title: 'Mark Done',
        icon: '/icons/check.png'
      },
      {
        action: 'snooze',
        title: 'Snooze 1h',
        icon: '/icons/snooze.png'
      }
    ];
  } else if (notification.type === 'task_completed') {
    actions = [
      {
        action: 'view-task',
        title: 'View Details',
        icon: '/icons/view.png'
      }
    ];
  } else if (notification.type === 'attendance_submitted' || notification.type === 'attendance_approved' || notification.type === 'attendance_rejected') {
    actions = [
      {
        action: 'view-attendance',
        title: 'View Attendance',
        icon: '/icons/view.png'
      }
    ];
  } else {
    actions = [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      }
    ];
  }

  // Determine vibration pattern based on priority
  let vibrate = [100, 50, 100];
  if (notification.priority === 'critical') {
    vibrate = [200, 100, 200, 100, 200];
  } else if (notification.priority === 'high') {
    vibrate = [200, 100, 200];
  }

  // Determine if notification requires interaction based on priority
  const requireInteraction = notification.priority === 'critical';

  const options = {
    body: notification.message || notification.body,
    icon: iconMap[notification.type] || '/icons/Logam Academy LOGO 512x512.png',
    badge: '/icons/badge.png',
    vibrate: vibrate,
    requireInteraction: requireInteraction,
    tag: notification.type, // Group similar notifications
    renotify: notification.priority === 'critical', // Renotify for critical
    data: {
      dateOfArrival: Date.now(),
      notificationType: notification.type,
      priority: notification.priority,
      ...notification.data
    },
    actions: actions.slice(0, 2) // Maximum 2 actions in most browsers
  };

  event.waitUntil(
    self.registration.showNotification(notification.title || 'Logam Task Manager', options)
  );
});

// Notification click event with action handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // Handle different actions
  if (action === 'view-task' || action === 'view') {
    const taskId = notificationData.taskId;
    const url = taskId ? `/dashboard?tab=tasks&taskId=${taskId}` : '/dashboard?tab=tasks';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/dashboard') && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: 'view-task',
              data: notificationData
            });
            return client.focus();
          }
        }
        // No window open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  } else if (action === 'mark-done') {
    // Send message to app to mark task as done
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].postMessage({
            type: 'NOTIFICATION_ACTION',
            action: 'mark-done',
            data: notificationData
          });
        } else {
          // Open app with action parameter
          return clients.openWindow(`/dashboard?action=mark-done&taskId=${notificationData.taskId}`);
        }
      })
    );
  } else if (action === 'snooze') {
    // Send message to app to snooze notification
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].postMessage({
            type: 'NOTIFICATION_ACTION',
            action: 'snooze',
            data: notificationData
          });
        }
      })
    );
  } else if (action === 'view-attendance') {
    const attendanceId = notificationData.attendanceId;
    const url = attendanceId ? `/dashboard?tab=attendance&attendanceId=${attendanceId}` : '/dashboard?tab=attendance';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/dashboard') && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: 'view-attendance',
              data: notificationData
            });
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  } else {
    // Default action - open the app to dashboard
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/dashboard');
        }
      })
    );
  }
});

// Background sync for offline task creation
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any pending tasks that were created while offline
  console.log('Background sync triggered');
}