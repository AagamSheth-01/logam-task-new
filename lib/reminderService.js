class ReminderService {
  constructor() {
    this.reminderInterval = null;
    this.isInitialized = false;
    this.defaultReminderTime = { hours: 17, minutes: 30 }; // 5:30 PM
    this.checkInterval = 60000; // Check every minute
  }

  // Initialize the reminder service
  init(user) {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.user = user;
    this.requestNotificationPermission();
    this.startReminderScheduler();
    this.isInitialized = true;
    
    console.log('Reminder service initialized for user:', user?.username);
  }

  // Request notification permission from the browser
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Start the reminder scheduler
  startReminderScheduler() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
    }

    // Check every minute for reminder time
    this.reminderInterval = setInterval(() => {
      this.checkReminderTime();
    }, this.checkInterval);

    console.log('Reminder scheduler started');
  }

  // Check if it's time to send reminder
  checkReminderTime() {
    const now = new Date();
    const userSettings = this.getUserReminderSettings();
    
    // Skip if reminders are disabled
    if (!userSettings.enabled) {
      return;
    }

    const reminderTime = userSettings.time || this.defaultReminderTime;
    
    // Check if current time matches reminder time (within 1 minute)
    if (now.getHours() === reminderTime.hours && now.getMinutes() === reminderTime.minutes) {
      // Check if we already sent reminder today
      if (!this.hasReminderBeenSentToday()) {
        this.sendDailyTaskReminder();
        this.markReminderSentToday();
      }
    }
  }

  // Send the daily task reminder notification
  async sendDailyTaskReminder() {
    const hasPermission = await this.requestNotificationPermission();
    
    if (!hasPermission) {
      console.warn('Notification permission denied');
      return;
    }

    const title = '📝 Daily Task Log Reminder';
    const body = `Hi ${this.user?.username || 'there'}! It's time to log your daily tasks. Don't forget to update your progress!`;
    const icon = '/icons/Logam Academy LOGO 512x512.png';

    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: 'daily-task-reminder',
        requireInteraction: true, // Keep notification visible until user interacts
        actions: [
          {
            action: 'log-tasks',
            title: 'Log Tasks Now'
          },
          {
            action: 'remind-later',
            title: 'Remind in 30 min'
          }
        ]
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        // Navigate to daily tasks section
        if (window.location.pathname !== '/dashboard') {
          window.location.href = '/dashboard';
        }
        // Switch to daily tasks tab if function exists
        if (window.switchToTab) {
          window.switchToTab('daily-tasks');
        }
        notification.close();
      };

      // Auto-close after 30 seconds if no interaction
      setTimeout(() => {
        notification.close();
      }, 30000);

      console.log('Daily task reminder sent');

      // Also play a reminder sound if enabled
      this.playReminderSound();

    } catch (error) {
      console.error('Failed to send reminder notification:', error);
    }
  }

  // Play reminder sound
  playReminderSound() {
    const userSettings = this.getUserReminderSettings();
    
    if (!userSettings.soundEnabled) {
      return;
    }

    try {
      // Create audio element for reminder sound
      const audio = new Audio();
      
      // Use a gentle reminder tone (you can replace with custom sound file)
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBSOH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUgwLTKXh8bllHgg2jdT0z4IzBSF2xe/glEILElyx5+iuWBUIQ5zd8sFuIAUrhM/z24w+CRZiturqpVIOC0ml4PK8aB4GM4nU9NB+LwUme8rx3I4+CRZduuvpqVEODEqj4vG9aiAFLoXO8N2OQAoUXrPn6KpUEwlFmtz0wHEjBS2EzvPaiDwIGGG56+mjTgwOUarg8L5uIgU6jdXzz3wvBSZ6yfDdkz8LElyx6OWrVhMJRZzd9L9wJAUvhM/y2Yc8CBhfte7pp1EODERI'; // Basic beep sound
      
      audio.volume = userSettings.soundVolume || 0.5;
      audio.play().catch(e => console.log('Could not play reminder sound:', e));
      
    } catch (error) {
      console.log('Reminder sound not available:', error);
    }
  }

  // Check if reminder has been sent today
  hasReminderBeenSentToday() {
    if (typeof window === 'undefined') return false;
    
    const today = new Date().toDateString();
    const lastReminderDate = localStorage.getItem(`last_reminder_${this.user?.username}`);
    
    return lastReminderDate === today;
  }

  // Mark reminder as sent for today
  markReminderSentToday() {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toDateString();
    localStorage.setItem(`last_reminder_${this.user?.username}`, today);
  }

  // Get user reminder settings
  getUserReminderSettings() {
    if (typeof window === 'undefined') {
      return {
        enabled: true,
        time: this.defaultReminderTime,
        soundEnabled: true,
        soundVolume: 0.5
      };
    }
    
    const savedSettings = localStorage.getItem(`reminder_settings_${this.user?.username}`);
    
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (error) {
        console.error('Failed to parse reminder settings:', error);
      }
    }
    
    // Default settings
    return {
      enabled: true,
      time: this.defaultReminderTime,
      soundEnabled: true,
      soundVolume: 0.5
    };
  }

  // Update user reminder settings
  updateReminderSettings(settings) {
    if (typeof window === 'undefined') return;
    
    const currentSettings = this.getUserReminderSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    
    localStorage.setItem(
      `reminder_settings_${this.user?.username}`, 
      JSON.stringify(updatedSettings)
    );
    
    console.log('Reminder settings updated:', updatedSettings);
    
    // Restart scheduler if time changed
    if (settings.time || settings.enabled !== undefined) {
      this.startReminderScheduler();
    }
  }

  // Manually trigger reminder (for testing)
  triggerTestReminder() {
    console.log('Triggering test reminder...');
    this.sendDailyTaskReminder();
  }

  // Snooze reminder for specified minutes
  snoozeReminder(minutes = 30) {
    console.log(`Snoozing reminder for ${minutes} minutes`);
    
    setTimeout(() => {
      this.sendDailyTaskReminder();
    }, minutes * 60 * 1000);
  }

  // Get next reminder time
  getNextReminderTime() {
    const userSettings = this.getUserReminderSettings();
    if (!userSettings.enabled) {
      return null;
    }
    
    const reminderTime = userSettings.time || this.defaultReminderTime;
    const now = new Date();
    const nextReminder = new Date();
    
    nextReminder.setHours(reminderTime.hours);
    nextReminder.setMinutes(reminderTime.minutes);
    nextReminder.setSeconds(0);
    
    // If time has passed today, set for tomorrow
    if (nextReminder <= now) {
      nextReminder.setDate(nextReminder.getDate() + 1);
    }
    
    return nextReminder;
  }

  // Cleanup
  destroy() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
    this.isInitialized = false;
    console.log('Reminder service destroyed');
  }

  // Enable daily reminders
  enableReminders() {
    this.updateReminderSettings({ enabled: true });
  }

  // Disable daily reminders
  disableReminders() {
    this.updateReminderSettings({ enabled: false });
  }

  // Set reminder time
  setReminderTime(hours, minutes) {
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error('Invalid time format. Hours: 0-23, Minutes: 0-59');
    }
    
    this.updateReminderSettings({ 
      time: { hours, minutes } 
    });
  }

  // Get reminder status
  getStatus() {
    return {
      initialized: this.isInitialized,
      user: this.user?.username,
      settings: this.getUserReminderSettings(),
      nextReminder: this.getNextReminderTime(),
      hasPermission: typeof window !== 'undefined' && Notification.permission === 'granted',
      lastReminderSent: typeof window !== 'undefined' ? 
        localStorage.getItem(`last_reminder_${this.user?.username}`) : null
    };
  }
}

// Export singleton instance
export default new ReminderService();