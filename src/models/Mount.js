const mongoose = require('mongoose');

// Per-size pricing for mount (backing board)
const mountSizePricingSchema = new mongoose.Schema({
  size: { type: String, required: true },
  rate: { type: Number, default: 0 },
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },
}, { _id: false });

const mountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, trim: true },

  material: { type: String, trim: true },        // e.g. Foam Board, Mat Board
  thickness: { type: Number },                    // mm
  color: { type: String, trim: true },
  isAcidFree: { type: Boolean, default: false },

  // P2F only
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Pricing per size
  pricing: [mountSizePricingSchema],

  // Images
  images: [{ type: String }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Mount', mountSchema);
