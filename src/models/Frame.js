const mongoose = require('mongoose');
const { FRAME_STYLES, FRAME_MATERIALS } = require('../config/constants');

// Per-size pricing for frames
const frameSizePricingSchema = new mongoose.Schema({
  size: { type: String, required: true },       // e.g. '8×10', '12×18'
  rate: { type: Number, default: 0 },
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },
}, { _id: false });

const frameSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, trim: true },

  style: { type: String, enum: FRAME_STYLES },         // Classic, Modern, Rustic, Gallery, Minimalist
  material: { type: String, enum: FRAME_MATERIALS },    // Wood, MDF, Metal, Composite
  color: { type: String, trim: true },
  width: { type: Number },                              // Frame border width in mm
  depth: { type: Number },                              // Frame depth in mm

  // Restrictions / compatibility
  minSize: { type: String },
  maxSize: { type: String },

  // Vendor who supplies this frame
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Pricing per size
  pricing: [frameSizePricingSchema],

  // Images (up to 5 slots)
  images: [{ type: String }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Frame', frameSchema);
