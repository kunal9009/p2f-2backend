const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, PANEL_SECTION_IDS } = require('../config/constants');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true,
    select: false   // 🔴 important (hidden by default)
  },

  phone: { type: String, trim: true },

  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.WAREHOUSE,
  },

  // Sidebar/section visibility for non-admin users.
  //   permissionsRestricted=false → see all non-admin sections (default)
  //   permissionsRestricted=true  → only sections listed in `permissions`
  // Admins ignore both fields and always see everything.
  permissionsRestricted: { type: Boolean, default: false },
  permissions: {
    type: [{ type: String, enum: PANEL_SECTION_IDS }],
    default: [],
  },

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },

  isActive: { type: Boolean, default: true },

}, { timestamps: true });


// 🔐 Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});


// 🔐 Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};


module.exports = mongoose.model('User', userSchema);
