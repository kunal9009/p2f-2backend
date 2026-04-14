const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  fullName: { type: String },
  phone: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  country: { type: String, default: 'India' },
}, { _id: false });

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true }, // e.g. MA0028409
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  companyName: { type: String }, // B2B
  gstNo: { type: String },
  panNo: { type: String },
  customerType: { type: String, enum: ['B2C', 'B2B'], default: 'B2C' },
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
