const mongoose = require('mongoose');

// Per-size pricing for frame material (backing substrate)
const fmSizePricingSchema = new mongoose.Schema({
  size: { type: String, required: true },
  // Dimensions in multiple units as shown in admin panel
  widthMeters: { type: Number, default: 0 },
  heightMeters: { type: Number, default: 0 },
  widthFeet: { type: Number, default: 0 },
  heightFeet: { type: Number, default: 0 },
  widthInches: { type: Number, default: 0 },
  heightInches: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },
}, { _id: false });

const frameMaterialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, trim: true },

  material: { type: String, trim: true },        // e.g. MDF, Hardboard, Sunboard
  thickness: { type: Number },                    // mm
  finish: { type: String, trim: true },

  // P2F only
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Pricing per size with multi-unit dimensions
  pricing: [fmSizePricingSchema],

  // Images
  images: [{ type: String }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('FrameMaterial', frameMaterialSchema);
