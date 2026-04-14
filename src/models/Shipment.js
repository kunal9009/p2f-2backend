const mongoose = require('mongoose');
const { SHIPPING_PROVIDERS, SHIPPING_MODES, SHIPPING_STATUS } = require('../config/constants');

const shipmentSchema = new mongoose.Schema({
  // Link to order
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

  // Courier details
  provider: { type: String, enum: SHIPPING_PROVIDERS },
  mode: { type: String, enum: SHIPPING_MODES },
  awbNumber: { type: String, trim: true },           // Air Waybill / tracking number
  trackingUrl: { type: String },

  // Package dimensions
  packageWeight: { type: Number },                    // kg
  packageLength: { type: Number },                    // cm
  packageWidth: { type: Number },                     // cm
  packageHeight: { type: Number },                    // cm
  volumetricWeight: { type: Number },                 // calculated

  // Shipping cost
  courierRate: { type: Number, default: 0 },
  codCharges: { type: Number, default: 0 },
  insuranceCharges: { type: Number, default: 0 },
  totalShippingCost: { type: Number, default: 0 },

  // Status
  status: {
    type: String,
    enum: Object.values(SHIPPING_STATUS),
    default: SHIPPING_STATUS.NOT_SHIPPED,
  },

  // Dates
  shippedAt: { type: Date },
  estimatedDelivery: { type: Date },
  deliveredAt: { type: Date },

  // Pickup address (vendor/warehouse)
  pickupAddress: {
    name: String, phone: String, address: String,
    city: String, state: String, pincode: String,
  },

  // Created by (Vikas creates shipments)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  remarks: { type: String },
}, { timestamps: true });

shipmentSchema.index({ orderId: 1 });
shipmentSchema.index({ awbNumber: 1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
