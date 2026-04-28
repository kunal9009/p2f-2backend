const cron = require('node-cron');
const Task = require('../models/Task');
const { TASK_STATUS } = require('../models/Task');
const email = require('./emailService');

// ─── RUN ONCE AT STARTUP + EVERY HOUR (for reminders) ───
// Cron expression: "0 * * * *" = top of every hour
// Cron expression: "0 9 * * *" = 9 AM every day

function startScheduler() {
  // ── Daily at 9:00 AM: due-soon & overdue reminders ──
  cron.schedule('0 9 * * *', async () => {
    console.log('[TaskScheduler] Running daily reminder job...');
    await runDueSoonReminders();
    await runOverdueReminders();
  });

  // ── Every hour: custom reminder dates ──
  cron.schedule('0 * * * *', async () => {
    await runCustomReminders();
  });

  // ── Daily at 00:05: deadline rollover ──
  // If a task's deadline has passed and the status hasn't been moved to a
  // terminal state (completed / cancelled), push the deadline forward by
  // one day. The original deadline is recorded in deadlineRollovers[] so an
  // admin can later attach a reason via PATCH /:id/rollover-reason.
  cron.schedule('5 0 * * *', async () => {
    console.log('[TaskScheduler] Running daily deadline rollover...');
    await runDeadlineRollover();
  });

  console.log('[TaskScheduler] Scheduler started (reminders + nightly deadline rollover).');
}

// ─── DEADLINE ROLLOVER ───
async function runDeadlineRollover() {
  try {
    const now = new Date();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const tasks = await Task.find({
      status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] },
      dueDate: { $lt: todayStart },
    });

    for (const task of tasks) {
      const oldDue = task.dueDate;
      const newDue = new Date(oldDue.getTime() + 24 * 60 * 60 * 1000);
      task.deadlineRollovers = task.deadlineRollovers || [];
      task.deadlineRollovers.push({ from: oldDue, to: newDue, reason: '' });
      task.dueDate = newDue;
      // Reset overdue email flag so the next overdue alert can fire on the
      // new date if the task lapses again.
      task.overdueReminderSent = false;
      await task.save();
    }

    if (tasks.length) {
      console.log(`[TaskScheduler] Rolled over ${tasks.length} task deadline(s).`);
    }
  } catch (err) {
    console.error('[TaskScheduler] Rollover job error:', err.message);
  }
}

// ─── DUE SOON: tasks due within the next 24 hours ───
async function runDueSoonReminders() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await Task.find({
      status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] },
      dueDate: { $gte: now, $lte: in24h },
      dueSoonReminderSent: false,
      emailNotificationsEnabled: true,
      'assignedTo.0': { $exists: true },
    });

    for (const task of tasks) {
      await email.sendDueSoonReminder(task);
      task.dueSoonReminderSent = true;
      await task.save();
    }

    if (tasks.length) console.log(`[TaskScheduler] Due-soon reminders sent for ${tasks.length} task(s).`);
  } catch (err) {
    console.error('[TaskScheduler] Due-soon job error:', err.message);
  }
}

// ─── OVERDUE: tasks past due date, not completed ───
async function runOverdueReminders() {
  try {
    const now = new Date();

    const tasks = await Task.find({
      status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] },
      dueDate: { $lt: now },
      overdueReminderSent: false,
      emailNotificationsEnabled: true,
      'assignedTo.0': { $exists: true },
    });

    for (const task of tasks) {
      await email.sendOverdueReminder(task);
      task.overdueReminderSent = true;
      await task.save();
    }

    if (tasks.length) console.log(`[TaskScheduler] Overdue reminders sent for ${tasks.length} task(s).`);
  } catch (err) {
    console.error('[TaskScheduler] Overdue job error:', err.message);
  }
}

// ─── CUSTOM REMINDER DATES ───
async function runCustomReminders() {
  try {
    const now = new Date();
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);

    const tasks = await Task.find({
      status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] },
      reminderDate: { $gte: now, $lte: in1h },
      reminderSent: false,
      emailNotificationsEnabled: true,
      'assignedTo.0': { $exists: true },
    });

    for (const task of tasks) {
      await email.sendCustomReminder(task);
      task.reminderSent = true;
      await task.save();
    }

    if (tasks.length) console.log(`[TaskScheduler] Custom reminders sent for ${tasks.length} task(s).`);
  } catch (err) {
    console.error('[TaskScheduler] Custom reminder job error:', err.message);
  }
}

module.exports = { startScheduler };
