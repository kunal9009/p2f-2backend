const mongoose = require('mongoose');

// ─── TASK STATUS PIPELINE ───
const TASK_STATUS = {
  NOT_STARTED:      'not_started',
  TODO:             'todo',
  UNDER_DISCUSSION: 'under_discussion',
  IN_PROGRESS:      'in_progress',
  TESTING:          'testing',
  COMPLETED:        'completed',
  ON_HOLD:          'on_hold',
  CANCELLED:        'cancelled',
};

// ─── TASK PRIORITY ───
const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// ─── PRODUCT / PANEL / DEPARTMENT ENUMS ───
const TASK_PRODUCTS    = ['wallpaper', 'wallart', 'p2f', 'entire-website'];
const TASK_PANELS      = ['backend', 'frontend'];
// Departments mirror the non-admin role names (see ROLES in constants.js).
// Used as the enum for `department` and `changeFromDepartment`.
const TASK_DEPARTMENTS = ['marketing', 'content', 'sales', 'product', 'it'];

// ─── COMMENT SUB-SCHEMA ───
const commentSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
}, { timestamps: true });

// ─── STATUS HISTORY SUB-SCHEMA ───
const statusHistorySchema = new mongoose.Schema({
  fromStatus: { type: String },
  toStatus: { type: String, required: true },
  changedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByName: { type: String },
  remark: { type: String, trim: true },
  changedAt: { type: Date, default: Date.now },
});

// ─── DEADLINE ROLLOVER SUB-SCHEMA ───
// One entry per auto-rollover. Reason is filled in by admin afterwards
// via PATCH /api/admin/tasks/:id/rollover-reason.
const deadlineRolloverSchema = new mongoose.Schema({
  from: { type: Date, required: true },
  to:   { type: Date, required: true },
  reason: { type: String, trim: true, default: '' },
  reasonById:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reasonByName: { type: String },
  reasonAt:     { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });

// ─── MAIN TASK SCHEMA ───
const taskSchema = new mongoose.Schema({
  taskId: { type: String, unique: true, sparse: true },

  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // Project / category (e.g. "MahattaART", "Website", "Mobile App")
  project: { type: String, default: 'MahattaART', trim: true },

  status: {
    type: String,
    enum: Object.values(TASK_STATUS),
    default: TASK_STATUS.TODO,
  },

  priority: {
    type: String,
    enum: Object.values(TASK_PRIORITY),
    default: TASK_PRIORITY.MEDIUM,
  },

  // Assignees (can have multiple)
  assignedTo: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    email: { type: String },
  }],

  // Developers (people actually doing the work)
  developers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    email: { type: String },
  }],

  assignedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedByName: { type: String },

  dueDate: { type: Date },
  reminderDate: { type: Date },   // Custom reminder date
  reminderSent: { type: Boolean, default: false },
  dueSoonReminderSent: { type: Boolean, default: false },
  overdueReminderSent: { type: Boolean, default: false },

  estimatedHours: { type: Number, min: 0 },
  actualHours: { type: Number, min: 0 },

  // ── New fields (Apr 2026) ──
  department: { type: String, enum: [...TASK_DEPARTMENTS, ''], lowercase: true, trim: true },
  ownerName:  { type: String, trim: true },
  // Change-request metadata: which department asked for the change and when.
  changeFromDepartment: { type: String, enum: [...TASK_DEPARTMENTS, ''], lowercase: true, trim: true },
  changeRequestDate:    { type: Date },
  // Product line + which side of the stack the task touches.
  product: { type: String, enum: TASK_PRODUCTS, lowercase: true, trim: true },
  panel:   { type: String, enum: TASK_PANELS,   lowercase: true, trim: true },

  tags: [{ type: String, trim: true }],

  comments: [commentSchema],
  statusHistory: [statusHistorySchema],
  deadlineRollovers: [deadlineRolloverSchema],

  emailNotificationsEnabled: { type: Boolean, default: true },

  completedAt: { type: Date },

  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String },
  updatedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ─── AUTO-GENERATE taskId ───
taskSchema.pre('save', async function (next) {
  if (this.isNew && !this.taskId) {
    const count = await mongoose.model('Task').countDocuments();
    this.taskId = `TKT-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.isModified('status') && this.status === TASK_STATUS.COMPLETED && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// ─── INDEXES ───
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ 'assignedTo.userId': 1, status: 1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
module.exports.TASK_STATUS = TASK_STATUS;
module.exports.TASK_PRIORITY = TASK_PRIORITY;
module.exports.TASK_PRODUCTS = TASK_PRODUCTS;
module.exports.TASK_PANELS = TASK_PANELS;
module.exports.TASK_DEPARTMENTS = TASK_DEPARTMENTS;
