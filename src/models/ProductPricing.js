const mongoose = require('mongoose');
const { PRODUCT_TYPES, PRICE_TYPES } = require('../config/constants');

// Generic product → type → price mapping
// This model stores the final computed price for a complete product configuration
const productPricingSchema = new mongoose.Schema({
  // Product type
  productType: { type: String, enum: Object.values(PRODUCT_TYPES), required: true },

  // Configuration key (size + component IDs hashed or concatenated)
  size: { type: String, required: true },

  // Component references (whichever are applicable)
  paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper' },
  frameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Frame' },
  canvasId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canvas' },
  glassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Glass' },
  mountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mount' },
  frameMaterialId: { type: mongoose.Schema.Types.ObjectId, ref: 'FrameMaterial' },
  mouldingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Moulding' },

  // Price type
  priceType: { type: String, enum: PRICE_TYPES },   // Display, MRP, Company Margin

  // Computed prices
  baseRate: { type: Number, default: 0 },
  markupPercent: { type: Number, default: 0 },
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productPricingSchema.index({ productType: 1, size: 1 });

module.exports = mongoose.model('ProductPricing', productPricingSchema);
