/**
 * WhatsApp Notification Service
 * Sends WFH attendance notifications to Anas bhai
 */

/**
 * Send WhatsApp message for WFH attendance
 * Uses WhatsApp Business API or web.whatsapp.com link
 */
export const sendWFHAttendanceNotification = async (employeeData) => {
  try {
    const { username, workType, clockIn, clockOut, date, status } = employeeData;

    // Only send for WFH attendance
    if (workType !== 'wfh') {
      return { success: false, reason: 'Not a WFH attendance' };
    }

    // Anas bhai's WhatsApp number (replace with actual number)
    const ANAS_WHATSAPP_NUMBER = process.env.ANAS_WHATSAPP_NUMBER || '+919876543210';

    // Create message content
    const messageType = clockOut ? 'Clock Out' : 'Clock In';
    const time = clockOut || clockIn;
    const dateFormatted = new Date(date).toLocaleDateString('en-IN');

    const message = formatWFHMessage({
      employee: username,
      messageType,
      time,
      date: dateFormatted,
      status
    });

    // Method 1: Try WhatsApp Business API (if configured)
    if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      const apiResult = await sendViaWhatsAppAPI(ANAS_WHATSAPP_NUMBER, message);
      if (apiResult.success) {
        return apiResult;
      }
    }

    // Method 2: Fallback to web.whatsapp.com link (opens in browser)
    const webWhatsAppResult = await generateWhatsAppWebLink(ANAS_WHATSAPP_NUMBER, message);

    return {
      success: true,
      method: 'web_link',
      url: webWhatsAppResult.url,
      message: 'WhatsApp web link generated successfully',
      data: {
        employee: username,
        messageType,
        time,
        date: dateFormatted
      }
    };

  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Format WFH attendance message for WhatsApp
 */
const formatWFHMessage = ({ employee, messageType, time, date, status }) => {
  const emoji = messageType === 'Clock In' ? '🟢' : '🔴';
  const statusEmoji = status === 'present' ? '✅' : status === 'half-day' ? '🟡' : '❌';

  return `${emoji} *WFH ${messageType} Alert*

👤 *Employee:* ${employee}
🕒 *Time:* ${time}
📅 *Date:* ${date}
🏠 *Work Mode:* Work From Home
${statusEmoji} *Status:* ${status}

_Automated notification from Logam Task Manager_`;
};

/**
 * Send via WhatsApp Business API
 */
const sendViaWhatsAppAPI = async (phoneNumber, message) => {
  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber.replace('+', ''),
        type: 'text',
        text: {
          body: message
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        method: 'api',
        messageId: result.messages[0].id,
        message: 'WhatsApp message sent successfully via API'
      };
    } else {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }
  } catch (error) {
    console.warn('WhatsApp API failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate WhatsApp web link as fallback
 */
const generateWhatsAppWebLink = async (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

  const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

  // Optional: Auto-open the link if in browser environment
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // Only in development mode for testing
    console.log('WhatsApp link generated:', url);
  }

  return { url, success: true };
};

/**
 * Send bulk WFH notifications (for multiple employees)
 */
export const sendBulkWFHNotifications = async (employeeDataList) => {
  const results = [];

  for (const employeeData of employeeDataList) {
    if (employeeData.workType === 'wfh') {
      const result = await sendWFHAttendanceNotification(employeeData);
      results.push({
        employee: employeeData.username,
        ...result
      });

      // Add small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    success: true,
    totalProcessed: results.length,
    results
  };
};

/**
 * Send daily WFH summary to Anas bhai
 */
export const sendDailyWFHSummary = async (date, wfhEmployees) => {
  try {
    const ANAS_WHATSAPP_NUMBER = process.env.ANAS_WHATSAPP_NUMBER || '+919876543210';

    const dateFormatted = new Date(date).toLocaleDateString('en-IN');
    const totalWFH = wfhEmployees.length;

    let message = `📊 *Daily WFH Summary*\n📅 *Date:* ${dateFormatted}\n👥 *Total WFH Employees:* ${totalWFH}\n\n`;

    if (totalWFH > 0) {
      message += '*WFH Employees Today:*\n';
      wfhEmployees.forEach((employee, index) => {
        const status = employee.status === 'present' ? '✅' : employee.status === 'half-day' ? '🟡' : '❌';
        const clockInfo = employee.clockIn ?
          (employee.clockOut ? `${employee.clockIn} - ${employee.clockOut}` : `${employee.clockIn} (In Progress)`) :
          'Not clocked in';

        message += `${index + 1}. ${status} *${employee.username}*\n   ⏰ ${clockInfo}\n`;
      });
    } else {
      message += '🏢 *No WFH employees today*\n';
    }

    message += '\n_Daily summary from Logam Task Manager_';

    // Send the summary
    if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      const apiResult = await sendViaWhatsAppAPI(ANAS_WHATSAPP_NUMBER, message);
      if (apiResult.success) {
        return apiResult;
      }
    }

    // Fallback to web link
    const webResult = await generateWhatsAppWebLink(ANAS_WHATSAPP_NUMBER, message);
    return {
      success: true,
      method: 'web_link',
      url: webResult.url,
      message: 'Daily WFH summary link generated'
    };

  } catch (error) {
    console.error('Error sending daily WFH summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Configure WhatsApp settings
 */
export const configureWhatsAppSettings = (settings) => {
  // Store settings in environment or database
  const config = {
    anasWhatsAppNumber: settings.anasWhatsAppNumber || process.env.ANAS_WHATSAPP_NUMBER,
    enableWFHNotifications: settings.enableWFHNotifications !== false,
    enableDailySummary: settings.enableDailySummary !== false,
    summaryTime: settings.summaryTime || '18:00', // 6 PM
    apiToken: settings.apiToken || process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: settings.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID
  };

  return config;
};

/**
 * Test WhatsApp connection
 */
export const testWhatsAppConnection = async () => {
  try {
    const testMessage = '🧪 *Test Message*\nWhatsApp integration is working correctly!\n\n_Test from Logam Task Manager_';
    const ANAS_WHATSAPP_NUMBER = process.env.ANAS_WHATSAPP_NUMBER || '+919876543210';

    if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      const result = await sendViaWhatsAppAPI(ANAS_WHATSAPP_NUMBER, testMessage);
      return {
        success: result.success,
        method: 'api',
        message: result.success ? 'WhatsApp API test successful' : 'WhatsApp API test failed'
      };
    } else {
      const webResult = await generateWhatsAppWebLink(ANAS_WHATSAPP_NUMBER, testMessage);
      return {
        success: true,
        method: 'web_link',
        url: webResult.url,
        message: 'WhatsApp web link generated for testing'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  sendWFHAttendanceNotification,
  sendBulkWFHNotifications,
  sendDailyWFHSummary,
  configureWhatsAppSettings,
  testWhatsAppConnection
};