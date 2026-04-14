const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  gstNo: { type: String, trim: true },
  panNo: { type: String, trim: true },

  // What materials this vendor supplies
  supplyCategories: [{ type: String }], // e.g. ['Paper', 'Canvas', 'Frame']

  // Payment terms
  paymentTerms: { type: String },
  leadTimeDays: { type: Number },

  // Link to user account (if vendor has login)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
