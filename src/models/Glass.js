const mongoose = require('mongoose');
const { GLASS_CATEGORIES } = require('../config/constants');

// Per-size pricing for glass
const glassSizePricingSchema = new mongoose.Schema({
  size: { type: String, required: true },
  rate: { type: Number, default: 0 },
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },
}, { _id: false });

const glassSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, trim: true },

  category: { type: String, enum: GLASS_CATEGORIES },  // Matte, Glossy, Acrylic Glass, Regular Glass, Luster
  thickness: { type: Number },                           // mm
  isAntiReflective: { type: Boolean, default: false },
  isUVProtected: { type: Boolean, default: false },

  // Shared between WallArt + P2F
  productType: [{ type: String, enum: ['Wall Art', 'Print & Frame'] }],

  // Size restrictions
  minSize: { type: String },
  maxSize: { type: String },

  // Vendor
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Pricing per size
  pricing: [glassSizePricingSchema],

  // Images
  images: [{ type: String }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Glass', glassSchema);
