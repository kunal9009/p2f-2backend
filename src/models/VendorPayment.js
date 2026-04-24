const mongoose = require('mongoose');

/**
 * VendorPayment — tracks amounts owed to and paid to production vendors (Vikas).
 *
 * Flow:
 *   1. Admin logs production cost on an order (totalProductionCost field on Order).
 *   2. When ready to pay Vikas, admin creates a VendorPayment record.
 *   3. Vikas can view his payment history.
 */
const vendorPaymentSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

  // Payment can cover one or many orders
  orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],

  // Payment details
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Bank Transfer', 'Cheque', 'Cash', 'UPI', 'Other'], default: 'Bank Transfer' },
  referenceNumber: { type: String, trim: true },   // UTR / cheque number
  paymentDate: { type: Date, default: Date.now },

  status: { type: String, enum: ['Pending', 'Paid', 'Disputed'], default: 'Pending' },

  notes: { type: String },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

vendorPaymentSchema.index({ vendorId: 1, status: 1 });
vendorPaymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('VendorPayment', vendorPaymentSchema);
