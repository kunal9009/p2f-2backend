const Task = require('../../models/Task');
const { TASK_STATUS, TASK_PRIORITY } = require('../../models/Task');
const User = require('../../models/User');
const emailService = require('../../utils/emailService');

// Tasks that have only admin user(s) in assignedTo — or no assignees at
// all — count as "unassigned" for the Pending Tasks view, since the
// admin hasn't actually handed them off to a developer yet.
async function buildUnassignedClause() {
  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  const adminIds = admins.map(a => a._id);
  return {
    $or: [
      { assignedTo: { $size: 0 } },
      { assignedTo: { $exists: false } },
      // Every entry in assignedTo has userId in adminIds → no developer
      // is on the task yet. $not + $elemMatch for "no element where
      // userId is NOT in admin set".
      { assignedTo: { $not: { $elemMatch: { userId: { $nin: adminIds } } } } },
    ],
  };
}

// ─── HELPER: build task filter from query params ───
function buildFilter(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.project) filter.project = { $regex: query.project, $options: 'i' };
  if (query.assignedTo) filter['assignedTo.userId'] = query.assignedTo;
  if (query.tag) filter.tags = query.tag;
  if (query.department) filter.department = query.department;
  if (query.product) filter.product = query.product;

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { taskId: { $regex: query.search, $options: 'i' } },
    ];
  }

  // Date range filters
  if (query.dueBefore) filter.dueDate = { ...filter.dueDate, $lte: new Date(query.dueBefore) };
  if (query.dueAfter)  filter.dueDate = { ...filter.dueDate, $gte: new Date(query.dueAfter) };

  // Show only unassigned tasks (no entries in assignedTo). The actual
  // clause — which also treats admin-only assignment as unassigned — is
  // applied in the list/exportCsv controllers via buildUnassignedClause()
  // because it needs an async DB lookup for admin user ids.

  if (query.overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] };
  }

  if (query.dueToday === 'true') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    filter.dueDate = { $gte: start, $lte: end };
  }

  return filter;
}

// ─── GET /api/admin/tasks ───
exports.list = async (req, res) => {
  try {
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip  = (page - 1) * limit;
    const sort  = req.query.sort || '-createdAt';

    const filter = buildFilter(req.query);

    // Tasks awaiting admin approval are hidden from the All Tasks list.
    // They surface only in admin's My Tasks → Pending Approval view.
    filter.pendingApproval = { $ne: true };

    // Apply the unassigned filter (Pending Tasks view). A task counts
    // as unassigned when assignedTo is empty OR every entry in it is an
    // admin user — admin holding a task isn't a real assignment yet.
    if (req.query.unassigned === 'true') {
      filter.$and = (filter.$and || []).concat([await buildUnassignedClause()]);
    }

    // "assignedToOrUnassigned=<userId>" — used by admin's My Tasks to
    // include both tasks Kunal is on AND unassigned tasks (so he can see
    // what still needs to be assigned).
    if (req.query.assignedToOrUnassigned) {
      const unassignedClause = await buildUnassignedClause();
      filter.$and = (filter.$and || []).concat([{
        $or: [
          { 'assignedTo.userId': req.query.assignedToOrUnassigned },
          ...unassignedClause.$or,
        ],
      }]);
    }

    // Developer / product users only see tasks an admin has assigned to
    // them — they don't get visibility into the rest of the board.
    if (req.user.role === 'developer' || req.user.role === 'product') {
      filter['assignedTo.userId'] = req.user.id;
    }

    // Non-admin "department" users (marketing/content/sales) browsing the
    // unassigned (Pending Tasks) view are scoped to their own department.
    if (req.query.unassigned === 'true' && req.user.role !== 'admin') {
      const deptRoles = ['marketing', 'content', 'sales', 'product', 'it'];
      if (deptRoles.includes(req.user.role)) {
        filter.department = req.user.role;
      }
    }

    // All Tasks and My Tasks are mutually exclusive for admin: a task the
    // admin is already an assignee of belongs in My Tasks, not the team
    // list. We skip this exclusion when the admin explicitly filters by
    // assignee (so the assignee dropdown still works) or asked for the
    // assignedToOrUnassigned variant.
    if (
      req.user.role === 'admin' &&
      !filter['assignedTo.userId'] &&
      !req.query.assignedToOrUnassigned
    ) {
      filter['assignedTo.userId'] = { $ne: req.user.id };
    }

    // Per-user panel scope: a non-admin user with the tasks-frontend or
    // tasks-backend permission only sees tasks matching that panel. If both
    // are granted (or permissionsRestricted is off / they're admin), no
    // panel filter is applied.
    if (req.user.role !== 'admin' && req.user.permissionsRestricted) {
      const perms = req.user.permissions || [];
      const hasFrontend = perms.includes('tasks-frontend');
      const hasBackend  = perms.includes('tasks-backend');
      if (hasFrontend && !hasBackend)      filter.panel = 'frontend';
      else if (hasBackend && !hasFrontend) filter.panel = 'backend';
      // both → no filter; neither → still no filter (the 'tasks' permission
      // already handled visibility of the page itself).
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sort).skip(skip).limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/kanban ───
// Returns tasks grouped by status for a Kanban board view
exports.kanban = async (req, res) => {
  try {
    const project = req.query.project;
    const matchFilter = { pendingApproval: { $ne: true } };
    if (project) matchFilter.project = { $regex: project, $options: 'i' };

    // Developer / product users only see their own assigned tasks on the board.
    if (req.user.role === 'developer' || req.user.role === 'product') {
      matchFilter['assignedTo.userId'] = req.user.id;
    }

    const allTasks = await Task.find(matchFilter).sort({ priority: -1, dueDate: 1 });

    // Priority sort order for display
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    const columns = Object.values(TASK_STATUS).map(status => ({
      status,
      label: status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      tasks: allTasks
        .filter(t => t.status === status)
        .sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)),
      count: allTasks.filter(t => t.status === status).length,
    }));

    res.json({ success: true, data: columns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/dashboard ───
// Stats for visual dashboard
exports.dashboard = async (req, res) => {
  try {
    const now        = new Date();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const weekEnd    = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Optional date-range filter (used by Reports page)
    const baseFilter = { pendingApproval: { $ne: true } };
    if (req.query.dueAfter)  baseFilter.dueDate = { ...baseFilter.dueDate, $gte: new Date(req.query.dueAfter) };
    if (req.query.dueBefore) baseFilter.dueDate = { ...baseFilter.dueDate, $lte: new Date(req.query.dueBefore) };

    // Developer / product users: scope every aggregate + count to their
    // assigned tasks only — they see their own dashboard, not the global one.
    if (req.user.role === 'developer' || req.user.role === 'product') {
      baseFilter['assignedTo.userId'] = req.user.id;
    }

    const matchStage = Object.keys(baseFilter).length ? [{ $match: baseFilter }] : [];

    const [
      statusBreakdown,
      priorityBreakdown,
      projectBreakdown,
      assigneeBreakdown,
      overdueCount,
      dueTodayCount,
      dueThisWeekCount,
      totalTasks,
      completedTasks,
      recentlyCompleted,
    ] = await Promise.all([
      // Tasks by status
      Task.aggregate([
        ...matchStage,
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Tasks by priority
      Task.aggregate([
        ...matchStage,
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Tasks by project
      Task.aggregate([
        ...matchStage,
        { $group: { _id: '$project', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Tasks by assignee (top 10)
      Task.aggregate([
        ...matchStage,
        { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: '$assignedTo.userId',
            name: { $first: '$assignedTo.name' },
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.COMPLETED] }, 1, 0] },
            },
            overdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ['$dueDate', now] },
                      { $ne: ['$status', TASK_STATUS.COMPLETED] },
                      { $ne: ['$status', TASK_STATUS.CANCELLED] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),

      // Overdue tasks (not completed/cancelled, past due date)
      Task.countDocuments({
        ...baseFilter,
        status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] },
        dueDate: { ...(baseFilter.dueDate || {}), $lt: now },
      }),

      // Due today
      Task.countDocuments({
        ...baseFilter,
        status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] },
        dueDate: { $gte: todayStart, $lte: todayEnd },
      }),

      // Due this week
      Task.countDocuments({
        ...baseFilter,
        status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED] },
        dueDate: { $gte: now, $lte: weekEnd },
      }),

      Task.countDocuments({ ...baseFilter }),
      Task.countDocuments({ ...baseFilter, status: TASK_STATUS.COMPLETED }),

      // Recently completed (last 7 days)
      Task.find({
        ...baseFilter,
        status: TASK_STATUS.COMPLETED,
        completedAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      }).sort('-completedAt').limit(5).select('taskId title completedAt assignedTo project'),
    ]);

    // Currently ongoing tasks (status = in_progress)
    const ongoingTasks = await Task.find({
      ...baseFilter,
      status: TASK_STATUS.IN_PROGRESS,
    }).sort({ dueDate: 1, priority: -1 }).limit(15)
      .select('taskId title status priority dueDate assignedTo project department');

    // Upcoming tasks: status=todo and dueDate >= today (or no due date but
    // not overdue), sorted by dueDate ASC. Respects baseFilter date range.
    const upcomingTasks = await Task.find({
      ...baseFilter,
      status: TASK_STATUS.TODO,
      $or: [
        { dueDate: { $gte: todayStart } },
        { dueDate: { $exists: false } },
        { dueDate: null },
      ],
    }).sort({ dueDate: 1, priority: -1 }).limit(15)
      .select('taskId title status priority dueDate assignedTo project department');

    // Weekly activity (last 4 weeks)
    const weeklyActivity = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            week: { $week: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          created: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.COMPLETED] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      success: true,
      data: {
        summary: {
          total: totalTasks,
          completed: completedTasks,
          overdue: overdueCount,
          dueToday: dueTodayCount,
          dueThisWeek: dueThisWeekCount,
          completionRate,
        },
        statusBreakdown: statusBreakdown.map(s => ({
          status: s._id,
          label: s._id.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          count: s.count,
        })),
        priorityBreakdown: priorityBreakdown.map(p => ({
          priority: p._id,
          count: p.count,
        })),
        projectBreakdown: projectBreakdown.map(p => ({
          project: p._id || 'Unassigned',
          count: p.count,
        })),
        assigneeBreakdown,
        weeklyActivity,
        recentlyCompleted,
        ongoingTasks,
        upcomingTasks,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/my ───
// Tasks assigned to the logged-in user
exports.myTasks = async (req, res) => {
  try {
    const filter = {
      'assignedTo.userId': req.user.id,
      pendingApproval: { $ne: true },
    };
    if (req.query.status) filter.status = req.query.status;

    const tasks = await Task.find(filter).sort({ dueDate: 1, priority: -1 });
    res.json({ success: true, data: tasks, total: tasks.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/pending-approval ───
// Admin-only. Tasks submitted by a department user that haven't been
// reviewed yet. Surfaced in MyTasks → "Pending Approval" section.
exports.pendingApproval = async (req, res) => {
  try {
    const tasks = await Task.find({ pendingApproval: true }).sort('-createdAt');
    res.json({ success: true, data: tasks, total: tasks.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/:id ───
exports.getById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/tasks ───
exports.create = async (req, res) => {
  try {
    const {
      title, description, project, status, priority,
      assignedTo, developers, dueDate, reminderDate,
      estimatedHours, tags, emailNotificationsEnabled,
      department, ownerName, changeFromDepartment, changeRequestDate,
      product, panel,
    } = req.body;

    const task = await Task.create({
      title,
      description,
      project: project || 'MahattaART',
      status: status || TASK_STATUS.TODO,
      priority: priority || TASK_PRIORITY.MEDIUM,
      assignedTo: assignedTo || [],
      developers: developers || [],
      assignedById: req.user.id,
      assignedByName: req.user.name,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      reminderDate: reminderDate ? new Date(reminderDate) : undefined,
      estimatedHours,
      tags: tags || [],
      emailNotificationsEnabled: emailNotificationsEnabled !== false,
      department,
      ownerName,
      changeFromDepartment,
      changeRequestDate: changeRequestDate ? new Date(changeRequestDate) : undefined,
      product,
      panel,
      // Non-admin submissions are no longer gated behind a Pending
      // Approval queue — they're created immediately with no assignee
      // and naturally land in the Pending Tasks view (where admin and
      // dept users can pick them up). Admin assigning a developer
      // promotes the task to All Tasks.
      pendingApproval: false,
      createdById: req.user.id,
      createdByName: req.user.name,
      statusHistory: [{
        toStatus: status || TASK_STATUS.TODO,
        changedById: req.user.id,
        changedByName: req.user.name,
        remark: 'Task created',
      }],
    });

    // Send assignment emails
    if (task.emailNotificationsEnabled && task.assignedTo.length) {
      for (const assignee of task.assignedTo) {
        if (assignee.email) {
          await emailService.sendTaskAssigned(task, assignee.email, assignee.name);
        }
      }
    }

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/tasks/:id ───
exports.update = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const allowedFields = [
      'title', 'description', 'project', 'priority',
      'dueDate', 'reminderDate', 'estimatedHours', 'actualHours',
      'tags', 'emailNotificationsEnabled',
      'department', 'ownerName', 'changeFromDepartment', 'changeRequestDate',
      'product', 'panel',
    ];

    // Track if assignees changed
    const prevAssignees = task.assignedTo.map(a => String(a.userId));
    const wasPending    = !!task.pendingApproval;

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    // Admin reviewing a pending submission clears the approval flag. This
    // is what surfaces the task into the All Tasks list / Kanban / dashboard.
    if (wasPending && req.user.role === 'admin') {
      task.pendingApproval = false;
      task.statusHistory.push({
        fromStatus: task.status,
        toStatus: task.status,
        changedById: req.user.id,
        changedByName: req.user.name,
        remark: 'Task approved by admin',
      });
    }

    // Update assignees
    if (req.body.assignedTo !== undefined) {
      task.assignedTo = req.body.assignedTo;
      task.assignedById = req.user.id;
      task.assignedByName = req.user.name;

      // Notify newly added assignees
      if (task.emailNotificationsEnabled) {
        const newAssignees = task.assignedTo.filter(
          a => !prevAssignees.includes(String(a.userId)) && a.email
        );
        for (const assignee of newAssignees) {
          await emailService.sendTaskAssigned(task, assignee.email, assignee.name);
        }
      }
    }

    // Update developers
    if (req.body.developers !== undefined) {
      task.developers = req.body.developers;
    }

    // Reset reminder flags if dates changed
    if (req.body.reminderDate) task.reminderSent = false;
    if (req.body.dueDate) {
      task.dueSoonReminderSent = false;
      task.overdueReminderSent = false;
    }

    task.updatedById = req.user.id;
    await task.save();

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/admin/tasks/:id/status ───
exports.updateStatus = async (req, res) => {
  try {
    const { status, remark } = req.body;

    if (!Object.values(TASK_STATUS).includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Admin can update any task; non-admin must be one of the assignees.
    if (req.user.role !== 'admin') {
      const isAssignee = (task.assignedTo || []).some(
        a => String(a.userId) === String(req.user.id)
      );
      if (!isAssignee) {
        return res.status(403).json({
          success: false,
          message: 'Only admin or assigned users can change this task\'s status',
        });
      }
    }

    const prevStatus = task.status;
    task.status = status;
    task.statusHistory.push({
      fromStatus: prevStatus,
      toStatus: status,
      changedById: req.user.id,
      changedByName: req.user.name,
      remark: remark || '',
    });
    task.updatedById = req.user.id;

    // Reset overdue flag if moved back to active
    if ([TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS, TASK_STATUS.TESTING].includes(status)) {
      task.overdueReminderSent = false;
    }

    await task.save();

    // Notify assignees of status change
    if (task.emailNotificationsEnabled && prevStatus !== status) {
      await emailService.sendStatusChanged(task, req.user.name);
    }

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/tasks/:id/comments ───
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Admin can comment on anything. Non-admins must be assigned to the
    // task (so an assigned developer can add notes / questions but a random
    // dept user can't comment on tasks they're not part of).
    if (req.user.role !== 'admin') {
      const isAssignee = (task.assignedTo || []).some(
        a => String(a.userId) === String(req.user.id)
      );
      if (!isAssignee) {
        return res.status(403).json({
          success: false,
          message: 'Only admin or assigned users can comment on this task',
        });
      }
    }

    const comment = {
      text: text.trim(),
      authorId: req.user.id,
      authorName: req.user.name,
    };

    task.comments.push(comment);
    await task.save();

    const addedComment = task.comments[task.comments.length - 1];

    // Notify assignees (except the commenter)
    if (task.emailNotificationsEnabled) {
      const recipients = task.assignedTo
        .filter(a => String(a.userId) !== String(req.user.id) && a.email)
        .map(a => a.email);
      await emailService.sendCommentNotification(task, addedComment, recipients);
    }

    res.status(201).json({ success: true, data: addedComment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/admin/tasks/:id/comments/:commentId ───
exports.deleteComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    // Only author or admin can delete
    if (String(comment.authorId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    comment.deleteOne();
    await task.save();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/admin/tasks/:id ───
exports.remove = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: `Task ${task.taskId} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/export ───
// CSV export of filtered tasks
exports.exportCsv = async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    if (req.query.unassigned === 'true') {
      filter.$and = (filter.$and || []).concat([await buildUnassignedClause()]);
    }
    const tasks  = await Task.find(filter).sort('-createdAt').limit(5000);

    const headers = [
      'Task ID', 'Title', 'Project', 'Status', 'Priority',
      'Assigned To', 'Due Date', 'Created At', 'Completed At',
      'Estimated Hours', 'Actual Hours', 'Tags',
    ];

    const rows = tasks.map(t => [
      t.taskId,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.project,
      t.status,
      t.priority,
      t.assignedTo.map(a => a.name).join(' | '),
      t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
      t.createdAt.toISOString().split('T')[0],
      t.completedAt ? t.completedAt.toISOString().split('T')[0] : '',
      t.estimatedHours || '',
      t.actualHours || '',
      (t.tags || []).join(' | '),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/activity ───
// Global activity feed: recent status changes + comments across all tasks
exports.activity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Pull tasks that had activity since the cutoff
    const tasks = await Task.find({
      pendingApproval: { $ne: true },
      $or: [
        { 'statusHistory.changedAt': { $gte: since } },
        { 'comments.createdAt': { $gte: since } },
      ],
    }).select('taskId title project status assignedTo statusHistory comments');

    // Flatten into a single event list
    const events = [];

    for (const task of tasks) {
      for (const h of task.statusHistory) {
        if (new Date(h.changedAt) >= since) {
          events.push({
            type: 'status_change',
            taskId: task.taskId,
            taskDbId: task._id,
            title: task.title,
            project: task.project,
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            actor: h.changedByName || 'System',
            remark: h.remark || '',
            timestamp: h.changedAt,
          });
        }
      }
      for (const c of task.comments) {
        if (new Date(c.createdAt) >= since) {
          events.push({
            type: 'comment',
            taskId: task.taskId,
            taskDbId: task._id,
            title: task.title,
            project: task.project,
            actor: c.authorName,
            text: c.text,
            timestamp: c.createdAt,
          });
        }
      }
    }

    // Sort newest first and cap
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const sliced = events.slice(0, limit);

    res.json({ success: true, data: sliced, total: events.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/tasks/test-email ───
exports.testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'email is required' });

    const nodemailer = require('nodemailer');
    const host = process.env.EMAIL_HOST;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);

    if (!host || !user || !pass) {
      return res.status(503).json({
        success: false,
        message: 'EMAIL_HOST / EMAIL_USER / EMAIL_PASS not configured in .env',
      });
    }

    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || user,
      to: email,
      subject: 'MahattaART Task Manager — Test Email ✅',
      html: `<div style="font-family:Arial,sans-serif;padding:32px;max-width:500px">
        <h2 style="color:#1a1a2e">Email notifications are working!</h2>
        <p>This is a test email from your MahattaART Task Manager.</p>
        <p style="color:#64748b;font-size:13px">Sent at ${new Date().toLocaleString()}</p>
      </div>`,
    });

    res.json({ success: true, message: 'Test email sent to ' + email });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/search ───
exports.search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, data: [] });

    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    // Search across title, description, taskId, tags, and comment text
    const tasks = await Task.find({
      pendingApproval: { $ne: true },
      $or: [
        { title:       { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { taskId:      { $regex: q, $options: 'i' } },
        { tags:        { $regex: q, $options: 'i' } },
        { project:     { $regex: q, $options: 'i' } },
        { 'comments.text': { $regex: q, $options: 'i' } },
      ],
    })
      .sort('-updatedAt')
      .limit(limit)
      .select('taskId title status priority project assignedTo dueDate tags updatedAt comments');

    // Annotate each result with which field matched
    const results = tasks.map(t => {
      const obj = t.toObject();
      const ql  = q.toLowerCase();
      let matchIn = 'title';
      if (t.taskId?.toLowerCase().includes(ql))          matchIn = 'taskId';
      else if (t.project?.toLowerCase().includes(ql))    matchIn = 'project';
      else if (t.tags?.some(tag => tag.toLowerCase().includes(ql))) matchIn = 'tag';
      else if (t.description?.toLowerCase().includes(ql)) matchIn = 'description';
      else if (t.comments?.some(c => c.text?.toLowerCase().includes(ql))) matchIn = 'comment';
      obj.matchIn = matchIn;
      // Snippet: first comment that matched
      if (matchIn === 'comment') {
        const mc = t.comments.find(c => c.text?.toLowerCase().includes(ql));
        if (mc) obj.matchSnippet = mc.text.slice(0, 120);
      }
      return obj;
    });

    res.json({ success: true, data: results, query: q });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/projects ───
exports.projects = async (req, res) => {
  try {
    const projects = await Task.distinct('project', { project: { $nin: [null, ''] } });
    res.json({ success: true, data: projects.sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/tags ───
exports.tags = async (req, res) => {
  try {
    const tags = await Task.distinct('tags', { tags: { $nin: [null, ''] } });
    res.json({ success: true, data: tags.sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/tasks/scheduler-status ───
exports.schedulerStatus = async (req, res) => {
  try {
    const now  = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h  = new Date(now.getTime() + 60 * 60 * 1000);
    const activeStatuses = { $nin: ['completed', 'cancelled'] };

    const [dueSoon, overdue, customReminder, overdueTotal] = await Promise.all([
      Task.countDocuments({
        status: activeStatuses,
        dueDate: { $gte: now, $lte: in24h },
        dueSoonReminderSent: false,
        emailNotificationsEnabled: true,
        'assignedTo.0': { $exists: true },
      }),
      Task.countDocuments({
        status: activeStatuses,
        dueDate: { $lt: now },
        overdueReminderSent: false,
        emailNotificationsEnabled: true,
        'assignedTo.0': { $exists: true },
      }),
      Task.countDocuments({
        status: activeStatuses,
        reminderDate: { $gte: now, $lte: in1h },
        reminderSent: false,
        emailNotificationsEnabled: true,
        'assignedTo.0': { $exists: true },
      }),
      Task.countDocuments({
        status: activeStatuses,
        dueDate: { $lt: now },
      }),
    ]);

    const emailConfigured = !!(
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
    );

    res.json({
      success: true,
      data: {
        emailConfigured,
        serverUptime: Math.floor(process.uptime()),
        jobs: [
          {
            id: 'due_soon',
            icon: '🔁',
            name: 'Due-Soon Alert',
            schedule: 'Daily at 9:00 AM',
            description: 'Notifies assignees of tasks due within 24 hours',
            pendingCount: dueSoon,
            active: true,
          },
          {
            id: 'overdue',
            icon: '🚨',
            name: 'Overdue Reminder',
            schedule: 'Daily at 9:00 AM',
            description: 'Notifies assignees of overdue tasks',
            pendingCount: overdue,
            active: true,
          },
          {
            id: 'custom',
            icon: '🔔',
            name: 'Custom Reminders',
            schedule: 'Every hour',
            description: 'Sends reminders on custom reminder dates',
            pendingCount: customReminder,
            active: true,
          },
        ],
        liveStats: {
          overdueTotal,
          dueSoonTotal: dueSoon,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/admin/tasks/:id/rollover-reason ───
// Set the reason on the most recent deadline rollover entry. Admin-only.
exports.setRolloverReason = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'reason is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const last = task.deadlineRollovers && task.deadlineRollovers.length
      ? task.deadlineRollovers[task.deadlineRollovers.length - 1]
      : null;
    if (!last) {
      return res.status(400).json({ success: false, message: 'No rollovers on this task' });
    }

    last.reason       = String(reason).trim();
    last.reasonById   = req.user.id;
    last.reasonByName = req.user.name;
    last.reasonAt     = new Date();
    await task.save();

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/tasks/:id/attachments ───
// Upload one or more files (images, PDFs) and attach them to a task.
// Uses the existing multer 'upload.array' middleware on the route. The
// allowlist (jpeg/png/gif/webp/pdf, 10 MB) is enforced there.
exports.addAttachments = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    for (const f of files) {
      task.attachments.push({
        filename:       f.filename,
        originalName:   f.originalname,
        mimetype:       f.mimetype,
        size:           f.size,
        url:            '/uploads/' + f.filename,
        uploadedById:   req.user.id,
        uploadedByName: req.user.name,
      });
    }
    await task.save();

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/admin/tasks/:id/attachments/:attId ───
// Remove an attachment from the task. Admin-only. The on-disk file is
// also unlinked (best effort).
exports.removeAttachment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const att = task.attachments.id(req.params.attId);
    if (!att) return res.status(404).json({ success: false, message: 'Attachment not found' });

    const filename = att.filename;
    att.deleteOne();
    await task.save();

    if (filename) {
      const fs   = require('fs');
      const path = require('path');
      const dir  = process.env.UPLOAD_DIR || 'uploads';
      fs.unlink(path.join(dir, filename), () => { /* ignore */ });
    }

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
