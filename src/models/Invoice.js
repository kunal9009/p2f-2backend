const mongoose = require('mongoose');
const { GST_DEFAULTS } = require('../config/constants');

// Invoice line item
const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  hsnCode: { type: String, default: GST_DEFAULTS.HSN_PRINTED_MATTER },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  taxableAmount: { type: Number, default: 0 },
  cgstRate: { type: Number, default: GST_DEFAULTS.CGST },
  cgstAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: GST_DEFAULTS.SGST },
  sgstAmount: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  // Invoice identity
  invoiceNumber: { type: String, required: true, unique: true },  // e.g. INV-2025-0001
  invoiceDate: { type: Date, default: Date.now },

  // Link to order
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

  // Customer details (snapshot)
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String },
  customerGst: { type: String },
  billingAddress: {
    fullName: String, phone: String, address: String,
    city: String, state: String, pincode: String, country: String,
  },
  shippingAddress: {
    fullName: String, phone: String, address: String,
    city: String, state: String, pincode: String, country: String,
  },

  // Seller details
  sellerName: { type: String, default: 'MahattaART' },
  sellerGst: { type: String },
  sellerAddress: {
    address: String, city: String, state: String, pincode: String,
  },

  // Line items
  items: [invoiceItemSchema],

  // Totals
  subtotal: { type: Number, default: 0 },
  totalCgst: { type: Number, default: 0 },
  totalSgst: { type: Number, default: 0 },
  totalIgst: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  shippingCharge: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  // Tax type: intra-state (CGST+SGST) or inter-state (IGST)
  isInterState: { type: Boolean, default: false },

  // Payment reference
  paymentStatus: { type: String },
  paymentMethod: { type: String },

  // PDF path
  pdfUrl: { type: String },

  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.index({ orderId: 1 });
// invoiceNumber already has unique:true index defined on the field

module.exports = mongoose.model('Invoice', invoiceSchema);
