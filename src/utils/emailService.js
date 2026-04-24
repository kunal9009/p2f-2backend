const nodemailer = require('nodemailer');

// ─── TRANSPORTER FACTORY ───
// Created lazily so the app boots even when EMAIL_* vars aren't set.
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn('[EmailService] EMAIL_HOST / EMAIL_USER / EMAIL_PASS not configured — emails will be skipped.');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return _transporter;
}

// ─── COMMON SEND HELPER ───
async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) return; // silently skip when not configured

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  try {
    await transporter.sendMail({ from, to, subject, html });
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err.message);
  }
}

// ─── SHARED EMAIL WRAPPER ───
function baseTemplate(title, bodyHtml) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .header { background: #1a1a2e; color: #fff; padding: 24px 32px; }
      .header h1 { margin: 0; font-size: 22px; }
      .header span { font-size: 13px; opacity: 0.7; }
      .body { padding: 28px 32px; color: #333; line-height: 1.6; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
      .badge-todo       { background: #e2e8f0; color: #475569; }
      .badge-in_progress{ background: #dbeafe; color: #1d4ed8; }
      .badge-testing    { background: #fef9c3; color: #92400e; }
      .badge-completed  { background: #dcfce7; color: #166534; }
      .badge-on_hold    { background: #f3e8ff; color: #6b21a8; }
      .badge-cancelled  { background: #fee2e2; color: #991b1b; }
      .badge-critical   { background: #fee2e2; color: #991b1b; }
      .badge-high       { background: #ffedd5; color: #9a3412; }
      .badge-medium     { background: #fef9c3; color: #92400e; }
      .badge-low        { background: #dcfce7; color: #166534; }
      .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .info-table td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
      .info-table td:first-child { color: #888; width: 140px; }
      .footer { background: #f8f8f8; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
      .btn { display: inline-block; margin-top: 16px; padding: 10px 24px; background: #1a1a2e; color: #fff; border-radius: 6px; text-decoration: none; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>MahattaART — Task Manager</h1>
        <span>${title}</span>
      </div>
      <div class="body">${bodyHtml}</div>
      <div class="footer">MahattaART Internal Task Management &bull; Do not reply to this email</div>
    </div>
  </body>
  </html>`;
}

// ─── TASK ASSIGNED ───
async function sendTaskAssigned(task, assigneeEmail, assigneeName) {
  const due = task.dueDate ? new Date(task.dueDate).toDateString() : 'No due date';
  const html = baseTemplate('New Task Assigned', `
    <p>Hi <strong>${assigneeName}</strong>,</p>
    <p>A new task has been assigned to you by <strong>${task.assignedByName || 'Admin'}</strong>.</p>
    <table class="info-table">
      <tr><td>Task ID</td><td><strong>${task.taskId}</strong></td></tr>
      <tr><td>Title</td><td><strong>${task.title}</strong></td></tr>
      <tr><td>Project</td><td>${task.project}</td></tr>
      <tr><td>Priority</td><td><span class="badge badge-${task.priority}">${task.priority.toUpperCase()}</span></td></tr>
      <tr><td>Status</td><td><span class="badge badge-${task.status}">${task.status.replace('_', ' ').toUpperCase()}</span></td></tr>
      <tr><td>Due Date</td><td>${due}</td></tr>
      ${task.estimatedHours ? `<tr><td>Est. Hours</td><td>${task.estimatedHours}h</td></tr>` : ''}
    </table>
    ${task.description ? `<p><strong>Description:</strong><br/>${task.description}</p>` : ''}
    <p>Please log in to the admin panel to view the full task details and begin working on it.</p>
  `);
  await sendMail({ to: assigneeEmail, subject: `[${task.taskId}] New Task Assigned: ${task.title}`, html });
}

// ─── STATUS CHANGED ───
async function sendStatusChanged(task, changedByName) {
  const recipients = task.assignedTo.map(a => a.email).filter(Boolean);
  if (!recipients.length) return;

  const html = baseTemplate('Task Status Updated', `
    <p>The status of a task assigned to you has been updated.</p>
    <table class="info-table">
      <tr><td>Task ID</td><td><strong>${task.taskId}</strong></td></tr>
      <tr><td>Title</td><td><strong>${task.title}</strong></td></tr>
      <tr><td>Project</td><td>${task.project}</td></tr>
      <tr><td>New Status</td><td><span class="badge badge-${task.status}">${task.status.replace('_', ' ').toUpperCase()}</span></td></tr>
      <tr><td>Changed By</td><td>${changedByName}</td></tr>
      <tr><td>Date</td><td>${new Date().toDateString()}</td></tr>
    </table>
  `);

  for (const email of recipients) {
    await sendMail({ to: email, subject: `[${task.taskId}] Status Updated → ${task.status.replace('_', ' ').toUpperCase()}`, html });
  }
}

// ─── NEW COMMENT ───
async function sendCommentNotification(task, comment, recipientEmails) {
  const emails = recipientEmails.filter(Boolean);
  if (!emails.length) return;

  const html = baseTemplate('New Comment on Task', `
    <p>A new comment has been added to a task.</p>
    <table class="info-table">
      <tr><td>Task ID</td><td><strong>${task.taskId}</strong></td></tr>
      <tr><td>Title</td><td><strong>${task.title}</strong></td></tr>
      <tr><td>Project</td><td>${task.project}</td></tr>
      <tr><td>Comment By</td><td>${comment.authorName}</td></tr>
      <tr><td>Date</td><td>${new Date().toDateString()}</td></tr>
    </table>
    <p><strong>Comment:</strong></p>
    <blockquote style="border-left: 4px solid #1a1a2e; margin: 8px 0; padding: 8px 16px; background: #f8f8f8; border-radius: 0 4px 4px 0;">
      ${comment.text}
    </blockquote>
  `);

  for (const email of emails) {
    await sendMail({ to: email, subject: `[${task.taskId}] New Comment: ${task.title}`, html });
  }
}

// ─── DUE SOON REMINDER (24h before due) ───
async function sendDueSoonReminder(task) {
  const recipients = task.assignedTo.map(a => ({ email: a.email, name: a.name })).filter(a => a.email);
  if (!recipients.length) return;

  const due = task.dueDate ? new Date(task.dueDate).toDateString() : '';
  const html = baseTemplate('Task Due Tomorrow', `
    <p>This is a reminder that the following task is due <strong>tomorrow</strong>.</p>
    <table class="info-table">
      <tr><td>Task ID</td><td><strong>${task.taskId}</strong></td></tr>
      <tr><td>Title</td><td><strong>${task.title}</strong></td></tr>
      <tr><td>Project</td><td>${task.project}</td></tr>
      <tr><td>Priority</td><td><span class="badge badge-${task.priority}">${task.priority.toUpperCase()}</span></td></tr>
      <tr><td>Status</td><td><span class="badge badge-${task.status}">${task.status.replace('_', ' ').toUpperCase()}</span></td></tr>
      <tr><td>Due Date</td><td><strong>${due}</strong></td></tr>
    </table>
    <p>Please ensure the task is completed or update its status if needed.</p>
  `);

  for (const r of recipients) {
    await sendMail({ to: r.email, subject: `⏰ [${task.taskId}] Due Tomorrow: ${task.title}`, html });
  }
}

// ─── OVERDUE REMINDER ───
async function sendOverdueReminder(task) {
  const recipients = task.assignedTo.map(a => ({ email: a.email, name: a.name })).filter(a => a.email);
  if (!recipients.length) return;

  const due = task.dueDate ? new Date(task.dueDate).toDateString() : '';
  const html = baseTemplate('Task Overdue', `
    <p style="color:#dc2626;font-weight:bold;">⚠️ The following task is now overdue!</p>
    <table class="info-table">
      <tr><td>Task ID</td><td><strong>${task.taskId}</strong></td></tr>
      <tr><td>Title</td><td><strong>${task.title}</strong></td></tr>
      <tr><td>Project</td><td>${task.project}</td></tr>
      <tr><td>Priority</td><td><span class="badge badge-${task.priority}">${task.priority.toUpperCase()}</span></td></tr>
      <tr><td>Status</td><td><span class="badge badge-${task.status}">${task.status.replace('_', ' ').toUpperCase()}</span></td></tr>
      <tr><td>Was Due</td><td><strong>${due}</strong></td></tr>
    </table>
    <p>Please update the task status or contact your team lead immediately.</p>
  `);

  for (const r of recipients) {
    await sendMail({ to: r.email, subject: `🚨 [${task.taskId}] OVERDUE: ${task.title}`, html });
  }
}

// ─── CUSTOM REMINDER DATE ───
async function sendCustomReminder(task) {
  const recipients = task.assignedTo.map(a => ({ email: a.email, name: a.name })).filter(a => a.email);
  if (!recipients.length) return;

  const due = task.dueDate ? new Date(task.dueDate).toDateString() : 'Not set';
  const html = baseTemplate('Task Reminder', `
    <p>This is a scheduled reminder for the following task.</p>
    <table class="info-table">
      <tr><td>Task ID</td><td><strong>${task.taskId}</strong></td></tr>
      <tr><td>Title</td><td><strong>${task.title}</strong></td></tr>
      <tr><td>Project</td><td>${task.project}</td></tr>
      <tr><td>Priority</td><td><span class="badge badge-${task.priority}">${task.priority.toUpperCase()}</span></td></tr>
      <tr><td>Status</td><td><span class="badge badge-${task.status}">${task.status.replace('_', ' ').toUpperCase()}</span></td></tr>
      <tr><td>Due Date</td><td>${due}</td></tr>
    </table>
    ${task.description ? `<p><strong>Description:</strong><br/>${task.description}</p>` : ''}
  `);

  for (const r of recipients) {
    await sendMail({ to: r.email, subject: `🔔 [${task.taskId}] Reminder: ${task.title}`, html });
  }
}

module.exports = {
  sendTaskAssigned,
  sendStatusChanged,
  sendCommentNotification,
  sendDueSoonReminder,
  sendOverdueReminder,
  sendCustomReminder,
};
