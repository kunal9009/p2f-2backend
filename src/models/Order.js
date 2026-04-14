const mongoose = require('mongoose');
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  SHIPPING_STATUS,
  PRODUCT_TYPES,
  P2F_VARIANTS,
} = require('../config/constants');

// ─── STATUS HISTORY (audit trail) ───
const statusHistorySchema = new mongoose.Schema({
  fromStatus: { type: String },
  toStatus: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByRole: { type: String },
  remark: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

// ─── ORDER ITEM (line items within an order) ───
const orderItemSchema = new mongoose.Schema({
  // Product references
  productType: { type: String, enum: Object.values(PRODUCT_TYPES) },
  p2fVariant: { type: String, enum: Object.values(P2F_VARIANTS) },

  // Sub-product references (which components make up this item)
  paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper' },
  frameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Frame' },
  canvasId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canvas' },
  glassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Glass' },
  mountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mount' },
  frameMaterialId: { type: mongoose.Schema.Types.ObjectId, ref: 'FrameMaterial' },
  mouldingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Moulding' },

  // Product details (denormalized for order snapshot)
  productName: { type: String },
  sku: { type: String },
  size: { type: String },
  quantity: { type: Number, default: 1, min: 1 },

  // Pricing
  unitPrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  productionCost: { type: Number, default: 0 },   // Vikas logs this

  // Image uploaded by customer / admin
  designImage: { type: String },                    // URL/path to the print-ready image
  thumbnailImage: { type: String },

  // Item-level notes
  notes: { type: String },
});

// ─── MAIN ORDER SCHEMA ───
const orderSchema = new mongoose.Schema({
  // Order identity
  orderId: { type: String, required: true, unique: true },    // e.g. ORD-20250410-001
  source: { type: String, enum: ['Admin', 'Website', 'Amazon', 'Flipkart', 'Other'], default: 'Admin' },

  // Customer
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String },
  customerEmail: { type: String },
  customerPhone: { type: String },

  // Addresses (snapshot at order time)
  billingAddress: {
    fullName: String, phone: String, address: String,
    city: String, state: String, pincode: String, country: { type: String, default: 'India' },
  },
  shippingAddress: {
    fullName: String, phone: String, address: String,
    city: String, state: String, pincode: String, country: { type: String, default: 'India' },
  },

  // Line items
  items: [orderItemSchema],

  // Status pipeline (Vikas's 10-stage + 2 cancellation)
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.ORDER_RECEIVED,
  },
  statusHistory: [statusHistorySchema],

  // Payment
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
  },
  paymentMethod: { type: String },
  paidAmount: { type: Number, default: 0 },

  // Shipping
  shippingStatus: {
    type: String,
    enum: Object.values(SHIPPING_STATUS),
    default: SHIPPING_STATUS.NOT_SHIPPED,
  },
  shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },

  // Pricing summary
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  shippingCharge: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },

  // Production cost (sum from Vikas)
  totalProductionCost: { type: Number, default: 0 },

  // Assigned vendor (Vikas)
  assignedVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Invoice reference
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },

  // Remarks / internal notes
  adminNotes: { type: String },
  vendorNotes: { type: String },

  // Cancellation
  cancelReason: { type: String },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
}, { timestamps: true });

// Index for common queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ assignedVendorId: 1, status: 1 });
orderSchema.index({ customerId: 1 });
// orderId already has unique:true index defined on the field

module.exports = mongoose.model('Order', orderSchema);
