import nodemailer from 'nodemailer';

// Create email transporter (FIXED: createTransport not createTransporter)
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

// Send email function
export const sendEmail = async (to, subject, text, html = null) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'Logam Task Manager Pro',
        address: process.env.EMAIL_USER,
      },
      to: to,
      subject: subject,
      text: text,
      html: html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📊 Logam Task Manager Pro</h1>
          </div>
          <div style="padding: 30px; background-color: #f8fafc;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${text.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
            <p>This email was sent from Logam Task Manager Pro</p>
            <p>© ${new Date().getFullYear()} Logam Task Manager. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// UPDATED: Send task assignment notification with client name support
export const sendTaskAssignmentEmail = async (userEmail, username, task, assignedBy, deadline, priority, clientName = null) => {
  const subject = '🆕 New Task Assigned - Logam Task Manager';
  
  // UPDATED: Include client information in text email
  const clientInfo = clientName ? `\n🏢 Client: ${clientName}` : '';
  
  const text = `Hi ${username},

You have been assigned a new task:

📝 Task: ${task}
👤 Assigned by: ${assignedBy}${clientInfo}
📅 Deadline: ${deadline}
🎯 Priority: ${priority}

Please log into the Task Manager to view more details and manage your tasks.

Best regards,
Logam Task Manager Pro Team`;

  // UPDATED: Include client information in HTML email
  const clientRow = clientName ? `
    <tr>
      <td style="padding: 8px 0; color: #374151; font-weight: 600;">🏢 Client:</td>
      <td style="padding: 8px 0; color: #1f2937;">${clientName}</td>
    </tr>
  ` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📊 Logam Task Manager Pro</h1>
        <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">New Task Assignment</p>
      </div>
      
      <div style="padding: 30px; background-color: #f8fafc;">
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${username}! 👋</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You have been assigned a new task. Here are the details:
          </p>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 120px;">📝 Task:</td>
                <td style="padding: 8px 0; color: #1f2937;">${task}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">👤 Assigned by:</td>
                <td style="padding: 8px 0; color: #1f2937;">${assignedBy}</td>
              </tr>
              ${clientRow}
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">📅 Deadline:</td>
                <td style="padding: 8px 0; color: #1f2937;">${deadline}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">🎯 Priority:</td>
                <td style="padding: 8px 0;">
                  <span style="background: ${priority === 'High' ? '#fee2e2; color: #dc2626' : priority === 'Medium' ? '#fef3c7; color: #d97706' : '#dcfce7; color: #16a34a'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    ${priority}
                  </span>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="http://localhost:3000" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              Open Task Manager
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            Please log into the Task Manager to view more details and manage your tasks.
          </p>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
        <p>This email was sent from Logam Task Manager Pro</p>
        <p>© ${new Date().getFullYear()} Logam Task Manager. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail(userEmail, subject, text, html);
};

// UPDATED: Send task completion notification with client name support
export const sendTaskCompletionEmail = async (assignerEmail, assignerName, taskName, completedBy, clientName = null) => {
  const subject = '✅ Task Completed - Logam Task Manager';
  
  // UPDATED: Include client information in text email
  const clientInfo = clientName ? `\n🏢 Client: ${clientName}` : '';
  
  const text = `Hi ${assignerName},

Great news! A task you assigned has been completed.

📝 Task: ${taskName}${clientInfo}
✅ Completed by: ${completedBy}
🕐 Completed on: ${new Date().toLocaleDateString()}

You can view the task details in the Task Manager.

Best regards,
Logam Task Manager Pro Team`;

  // UPDATED: Include client information in HTML email
  const clientRow = clientName ? `
    <tr>
      <td style="padding: 8px 0; color: #374151; font-weight: 600;">🏢 Client:</td>
      <td style="padding: 8px 0; color: #1f2937;">${clientName}</td>
    </tr>
  ` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📊 Logam Task Manager Pro</h1>
        <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Task Completed</p>
      </div>
      
      <div style="padding: 30px; background-color: #f8fafc;">
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${assignerName}! 👋</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Great news! A task you assigned has been completed.
          </p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 140px;">📝 Task:</td>
                <td style="padding: 8px 0; color: #1f2937;">${taskName}</td>
              </tr>
              ${clientRow}
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">✅ Completed by:</td>
                <td style="padding: 8px 0; color: #1f2937;">${completedBy}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">🕐 Completed on:</td>
                <td style="padding: 8px 0; color: #1f2937;">${new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="http://localhost:3000/admin" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              View Task Details
            </a>
          </div>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
        <p>This email was sent from Logam Task Manager Pro</p>
        <p>© ${new Date().getFullYear()} Logam Task Manager. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail(assignerEmail, subject, text, html);
};

// UPDATED: Send overdue task reminder with client name support
export const sendOverdueTaskReminder = async (userEmail, username, overdueTasks) => {
  const subject = '⚠️ Overdue Tasks Reminder - Logam Task Manager';
  
  // UPDATED: Include client information in task list
  const taskList = overdueTasks.map(task => {
    const clientInfo = task.client_name ? ` (Client: ${task.client_name})` : '';
    return `• ${task.task}${clientInfo} (Due: ${task.deadline})`;
  }).join('\n');
  
  const text = `Hi ${username},

You have ${overdueTasks.length} overdue task(s) that need your attention:

${taskList}

Please log into the Task Manager to update these tasks.

Best regards,
Logam Task Manager Pro Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📊 Logam Task Manager Pro</h1>
        <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Overdue Tasks Reminder</p>
      </div>
      
      <div style="padding: 30px; background-color: #f8fafc;">
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${username}! ⚠️</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You have <strong>${overdueTasks.length}</strong> overdue task(s) that need your attention:
          </p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            ${overdueTasks.map(task => {
              const clientInfo = task.client_name ? `<div style="font-size: 12px; color: #a16207; margin-top: 2px;">🏢 Client: ${task.client_name}</div>` : '';
              return `
                <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #fde68a;">
                  <div style="font-weight: 600; color: #92400e;">${task.task}</div>
                  ${clientInfo}
                  <div style="font-size: 14px; color: #d97706; margin-top: 4px;">Due: ${task.deadline}</div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="http://localhost:3000/dashboard" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              Update Tasks
            </a>
          </div>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
        <p>This email was sent from Logam Task Manager Pro</p>
        <p>© ${new Date().getFullYear()} Logam Task Manager. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail(userEmail, subject, text, html);
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('Email configuration error:', error);
    return { success: false, error: error.message };
  }
};