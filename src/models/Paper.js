const mongoose = require('mongoose');
const { PAPER_CATEGORIES, QUALITY_TIERS, WALLART_TIERS, WALLPAPER_TIERS, PRODUCT_TYPES } = require('../config/constants');

// ─── WALLART PRICING (Star / Platinum / Gold / Silver per size) ───
const wallartPricingSchema = new mongoose.Schema({
  size: { type: String, required: true },       // e.g. '12×18', '24×36'
  tier: { type: String, enum: WALLART_TIERS, required: true },
  rate: { type: Number, default: 0 },
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },
}, { _id: false });

// ─── FRAME (P2F) PRICING (Company Margin / MRP / Display per size) ───
const framePricingSchema = new mongoose.Schema({
  size: { type: String, required: true },
  rate: { type: Number, default: 0 },
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },
}, { _id: false });

// ─── WALLPAPER PRICING (Standard / Premium / Exclusive per sqft) ───
const wallpaperPricingSchema = new mongoose.Schema({
  tier: { type: String, enum: WALLPAPER_TIERS, required: true },
  ratePerSqFt: { type: Number, default: 0 },
  companyMargin: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  displayPrice: { type: Number, default: 0 },
  maxDisplayPrice: { type: Number, default: 0 },
}, { _id: false });

const paperSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, trim: true },

  // Classification
  category: { type: String, enum: PAPER_CATEGORIES },              // Matte, Satin, Glossy, Canvas, Lustre
  quality: { type: String, enum: QUALITY_TIERS },                   // Standard, Premium, Exclusive
  productType: [{ type: String, enum: Object.values(PRODUCT_TYPES) }], // Which product types this paper serves

  // Roll specifications
  rollPrice: { type: Number, default: 0 },
  rollHeight: {
    meters: { type: Number, default: 0 },
    inches: { type: Number, default: 0 },
  },
  rollWidth: {
    meters: { type: Number, default: 0 },
    inches: { type: Number, default: 0 },
  },
  costPerSqInch: { type: Number, default: 0 },
  inkCostPerSqInch: { type: Number, default: 0 },
  printCostPerSqInch: { type: Number, default: 0 },

  // Vendor who supplies this paper
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Three pricing sections (populated based on productType)
  wallartPricing: [wallartPricingSchema],
  framePricing: [framePricingSchema],
  wallpaperPricing: [wallpaperPricingSchema],

  // Images (up to 5 slots as shown in admin panel)
  images: [{ type: String }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Paper', paperSchema);
