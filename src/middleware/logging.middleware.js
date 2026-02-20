/**
 * Logging Middleware
 * Logs API requests and responses
 */

/**
 * Request logger
 * Logs incoming requests
 */
export const logRequest = (req, res, next) => {
  const startTime = Date.now();

  // Log request details
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
    query: req.query,
    body: sanitizeBody(req.body),
    user: req.user?.username || 'anonymous'
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  if (next) next();
};

/**
 * Sanitize request body for logging
 * Removes sensitive fields
 */
const sanitizeBody = (body) => {
  if (!body) return {};

  const sanitized = { ...body };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
};

/**
 * Activity logger
 * Logs user activities to database
 */
export const logActivity = async (req, action, details = '') => {
  try {
    const { adminDb } = await import('../../lib/firebase-admin.js');
    const admin = await import('firebase-admin');

    await adminDb.collection('activity_log').add({
      tenantId: req.user?.tenantId || null,
      action,
      username: req.user?.username || 'anonymous',
      userId: req.user?.id || null,
      details,
      timestamp: admin.default.firestore.FieldValue.serverTimestamp(),
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

/**
 * Error logger
 * Logs errors to database
 */
export const logError = async (req, error, context = {}) => {
  try {
    const { adminDb } = await import('../../lib/firebase-admin.js');
    const admin = await import('firebase-admin');

    await adminDb.collection('error_log').add({
      tenantId: req.user?.tenantId || null,
      username: req.user?.username || 'anonymous',
      userId: req.user?.id || null,
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : null,
        name: error.name
      },
      context: {
        url: req.url,
        method: req.method,
        ...context
      },
      timestamp: admin.default.firestore.FieldValue.serverTimestamp(),
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
    });
  } catch (err) {
    console.error('Failed to log error:', err);
  }
};

export default {
  logRequest,
  logActivity,
  logError
};
