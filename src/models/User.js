const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, trim: true },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.WAREHOUSE,
  },
  // If role=vendor, link to Vendor profile
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
