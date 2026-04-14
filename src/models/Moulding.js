const mongoose = require('mongoose');

// Per-unit pricing for moulding (decorative trim)
const mouldingSizePricingSchema = new mongoose.Schema({
  size: { type: String, required: true },
  ratePerUnit: { type: Number, default: 0 },     // Per running inch/foot
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },
}, { _id: false });

const mouldingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, trim: true },

  profile: { type: String, trim: true },           // e.g. Flat, Scoop, Round
  material: { type: String, trim: true },           // e.g. Wood, PS (Polystyrene)
  width: { type: Number },                          // mm
  color: { type: String, trim: true },
  finish: { type: String, trim: true },             // e.g. Matte, Glossy, Distressed

  // WallArt only
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Pricing per size
  pricing: [mouldingSizePricingSchema],

  // Images
  images: [{ type: String }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Moulding', mouldingSchema);
