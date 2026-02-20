/**
 * WhatsApp Settings API
 * Configure WhatsApp notifications for WFH attendance
 */

import { requireAuth } from '../../../lib/auth';
import { configureWhatsAppSettings, testWhatsAppConnection } from '../../../lib/whatsappService';

async function handler(req, res) {
  const { method } = req;
  const { role } = req.user;

  // Only admins can configure WhatsApp settings
  if (role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  try {
    switch (method) {
      case 'GET':
        return await getWhatsAppSettings(req, res);
      case 'POST':
        return await updateWhatsAppSettings(req, res);
      case 'PUT':
        return await testConnection(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} Not Allowed`
        });
    }
  } catch (error) {
    console.error('WhatsApp settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * Get current WhatsApp settings
 */
async function getWhatsAppSettings(req, res) {
  const settings = {
    anasWhatsAppNumber: process.env.ANAS_WHATSAPP_NUMBER || '',
    enableWFHNotifications: process.env.ENABLE_WFH_NOTIFICATIONS !== 'false',
    enableDailySummary: process.env.ENABLE_DAILY_SUMMARY !== 'false',
    summaryTime: process.env.DAILY_SUMMARY_TIME || '18:00',
    hasApiToken: !!process.env.WHATSAPP_API_TOKEN,
    hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
    integrationMethod: (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) ? 'api' : 'web_link'
  };

  return res.json({
    success: true,
    data: settings
  });
}

/**
 * Update WhatsApp settings
 */
async function updateWhatsAppSettings(req, res) {
  const {
    anasWhatsAppNumber,
    enableWFHNotifications,
    enableDailySummary,
    summaryTime,
    apiToken,
    phoneNumberId
  } = req.body;

  // Validate phone number format
  if (anasWhatsAppNumber && !/^\+?[1-9]\d{1,14}$/.test(anasWhatsAppNumber.replace(/[^0-9+]/g, ''))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format. Use international format (+91xxxxxxxxxx)'
    });
  }

  // Validate time format
  if (summaryTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(summaryTime)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid time format. Use HH:MM format'
    });
  }

  try {
    // Configure settings (in production, save to database)
    const updatedSettings = configureWhatsAppSettings({
      anasWhatsAppNumber,
      enableWFHNotifications,
      enableDailySummary,
      summaryTime,
      apiToken,
      phoneNumberId
    });

    // In production environment, you might want to save these to database
    // For now, we'll just validate and return the configuration

    return res.json({
      success: true,
      message: 'WhatsApp settings updated successfully',
      data: {
        anasWhatsAppNumber: updatedSettings.anasWhatsAppNumber,
        enableWFHNotifications: updatedSettings.enableWFHNotifications,
        enableDailySummary: updatedSettings.enableDailySummary,
        summaryTime: updatedSettings.summaryTime,
        hasApiToken: !!updatedSettings.apiToken,
        hasPhoneNumberId: !!updatedSettings.phoneNumberId,
        integrationMethod: (updatedSettings.apiToken && updatedSettings.phoneNumberId) ? 'api' : 'web_link'
      }
    });

  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
}

/**
 * Test WhatsApp connection
 */
async function testConnection(req, res) {
  try {
    const result = await testWhatsAppConnection();

    if (result.success) {
      return res.json({
        success: true,
        message: 'WhatsApp connection test successful',
        data: {
          method: result.method,
          url: result.url || null,
          messageId: result.messageId || null
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'WhatsApp connection test failed',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to test connection',
      error: error.message
    });
  }
}

export default requireAuth(handler);