const mongoose = require('mongoose');

// Per-size pricing for canvas (stretcher bars)
const canvasSizePricingSchema = new mongoose.Schema({
  size: { type: String, required: true },       // e.g. '12×18', '24×36'
  rate: { type: Number, default: 0 },
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },
}, { _id: false });

const canvasSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, trim: true },

  // Stretcher bar specs
  barMaterial: { type: String, trim: true },       // e.g. Pine, Hardwood
  barThickness: { type: Number },                   // mm
  wrapType: { type: String, enum: ['Gallery', 'Standard', 'Mirror'] },

  // Dimensions reference
  dimensions: {
    widthInches: { type: Number, default: 0 },
    heightInches: { type: Number, default: 0 },
  },

  // Vendor
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Pricing per size
  pricing: [canvasSizePricingSchema],

  // Images (up to 5 slots)
  images: [{ type: String }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Canvas', canvasSchema);
