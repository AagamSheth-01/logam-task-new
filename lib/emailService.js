// lib/emailService.js - Email service for sending password reset emails
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
if (!process.env.EMAIL_HOST) {
  dotenv.config({ path: '.env.local' });
}

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App password for Gmail
    },
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (to, resetToken, username) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email credentials not configured. Check EMAIL_USER and EMAIL_PASS in .env.local');
      throw new Error('Email service not configured');
    }

    const transporter = createTransporter();

    // Generate reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Email HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Logam Task Manager</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

            <!-- Header -->
            <div style="background-color: #000000; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Logam Task Manager</h1>
              <p style="color: #e5e5e5; margin: 10px 0 0 0; font-size: 14px;">Professional Edition</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">Password Reset Request</h2>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${username}</strong>,
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We received a request to reset your password for your Logam Task Manager account. Click the button below to create a new password:
              </p>

              <!-- Reset Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Or copy and paste this link into your browser:
              </p>

              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin: 10px 0 20px 0; word-break: break-all;">
                <code style="color: #333333; font-size: 13px;">${resetUrl}</code>
              </div>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 10px 0;">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
              </p>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                This is an automated message from Logam Task Manager.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Logam Academy. All rights reserved.
              </p>
            </div>
          </div>

          <!-- Security Notice -->
          <div style="max-width: 600px; margin: 20px auto; text-align: center;">
            <p style="color: #999999; font-size: 12px; line-height: 1.5;">
              For security reasons, never share your password or reset link with anyone.
            </p>
          </div>
        </body>
      </html>
    `;

    // Plain text version
    const textContent = `
Password Reset Request

Hello ${username},

We received a request to reset your password for your Logam Task Manager account.

To reset your password, click the following link or copy and paste it into your browser:
${resetUrl}

Important: This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
This is an automated message from Logam Task Manager.
© ${new Date().getFullYear()} Logam Academy. All rights reserved.

For security reasons, never share your password or reset link with anyone.
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"Logam Task Manager" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Password Reset Request - Logam Task Manager',
      text: textContent,
      html: htmlContent,
    });

    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};

// Send welcome email (optional - for new users)
export const sendWelcomeEmail = async (to, username) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not configured');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Logam Task Manager</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #000000; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Welcome to Logam Task Manager!</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #000000;">Hello ${username},</h2>
              <p style="color: #333333; font-size: 16px; line-height: 1.6;">
                Your account has been successfully created. You can now log in and start managing your tasks efficiently.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold;">
                  Go to Login
                </a>
              </div>
            </div>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Logam Academy. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Logam Task Manager" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Welcome to Logam Task Manager',
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, message: error.message };
  }
};

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return { success: false, message: 'Email credentials not configured' };
    }

    const transporter = createTransporter();
    await transporter.verify();

    return { success: true, message: 'Email service is configured correctly' };
  } catch (error) {
    return { success: false, message: 'Email service configuration error: ' + error.message };
  }
};

export default {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  verifyEmailConfig
};
