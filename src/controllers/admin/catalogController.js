const Paper = require('../../models/Paper');
const Frame = require('../../models/Frame');
const Canvas = require('../../models/Canvas');
const Glass = require('../../models/Glass');
const Mount = require('../../models/Mount');
const FrameMaterial = require('../../models/FrameMaterial');
const Moulding = require('../../models/Moulding');

/**
 * Returns the full component catalog for a given product type.
 * This drives the order-creation UI — frontend picks components and sees pricing.
 *
 * GET /api/admin/catalog/wallart
 * GET /api/admin/catalog/p2f
 * GET /api/admin/catalog/wallpaper
 */

const activeFilter = { isActive: true };

// ─── WALL ART catalog ───
// Components: Paper (wallartPricing), Canvas, Glass, Moulding
const wallartCatalog = async (size) => {
  const paperFilter = { ...activeFilter, productType: 'Wall Art' };
  const [papers, canvases, glasses, mouldings] = await Promise.all([
    Paper.find(paperFilter).select('name displayName category quality rollPrice wallartPricing images vendorId'),
    Canvas.find(activeFilter).select('name displayName barMaterial wrapType pricing images'),
    Glass.find({ ...activeFilter, productType: 'Wall Art' }).select('name displayName category thickness pricing images'),
    Moulding.find(activeFilter).select('name displayName profile material color pricing images'),
  ]);

  // Filter pricing rows to requested size if provided
  const filterSize = (rows) => size ? rows.filter((r) => r.size === size) : rows;

  return {
    productType: 'Wall Art',
    papers: papers.map((p) => ({ ...p.toObject(), wallartPricing: filterSize(p.wallartPricing) })),
    canvases: canvases.map((c) => ({ ...c.toObject(), pricing: filterSize(c.pricing) })),
    glasses: glasses.map((g) => ({ ...g.toObject(), pricing: filterSize(g.pricing) })),
    mouldings: mouldings.map((m) => ({ ...m.toObject(), pricing: filterSize(m.pricing) })),
  };
};

// ─── PRINT & FRAME (P2F) catalog ───
// Components: Paper (framePricing), Frame, Glass, Mount, FrameMaterial
const p2fCatalog = async (size) => {
  const paperFilter = { ...activeFilter, productType: 'Print & Frame' };
  const [papers, frames, glasses, mounts, frameMaterials] = await Promise.all([
    Paper.find(paperFilter).select('name displayName category quality rollPrice framePricing images vendorId'),
    Frame.find(activeFilter).select('name displayName style material color width depth pricing images'),
    Glass.find({ ...activeFilter, productType: 'Print & Frame' }).select('name displayName category thickness pricing images'),
    Mount.find(activeFilter).select('name displayName material thickness color pricing images'),
    FrameMaterial.find(activeFilter).select('name displayName material thickness finish pricing images'),
  ]);

  const filterSize = (rows) => size ? rows.filter((r) => r.size === size) : rows;

  return {
    productType: 'Print & Frame',
    papers: papers.map((p) => ({ ...p.toObject(), framePricing: filterSize(p.framePricing) })),
    frames: frames.map((f) => ({ ...f.toObject(), pricing: filterSize(f.pricing) })),
    glasses: glasses.map((g) => ({ ...g.toObject(), pricing: filterSize(g.pricing) })),
    mounts: mounts.map((m) => ({ ...m.toObject(), pricing: filterSize(m.pricing) })),
    frameMaterials: frameMaterials.map((fm) => ({ ...fm.toObject(), pricing: filterSize(fm.pricing) })),
  };
};

// ─── WALLPAPER catalog ───
// Components: Paper (wallpaperPricing — per sqft)
const wallpaperCatalog = async (tier) => {
  const papers = await Paper.find({ ...activeFilter, productType: 'Wall Paper' })
    .select('name displayName category quality rollPrice wallpaperPricing images vendorId');

  const filterTier = (rows) => tier ? rows.filter((r) => r.tier === tier) : rows;

  return {
    productType: 'Wall Paper',
    papers: papers.map((p) => ({ ...p.toObject(), wallpaperPricing: filterTier(p.wallpaperPricing) })),
  };
};

// ─────────────────────────────────────────────
// GET /api/admin/catalog/:type
// :type = wallart | p2f | wallpaper
// Query: ?size=12x18  (optional — filter pricing rows to one size)
//        ?tier=Premium (wallpaper only — filter by pricing tier)
// ─────────────────────────────────────────────
exports.getCatalog = async (req, res) => {
  try {
    const type = req.params.type.toLowerCase().replace(/[-_\s]/g, '');
    const { size, tier } = req.query;

    let data;
    if (type === 'wallart') {
      data = await wallartCatalog(size);
    } else if (type === 'p2f' || type === 'printandframe' || type === 'printframe') {
      data = await p2fCatalog(size);
    } else if (type === 'wallpaper') {
      data = await wallpaperCatalog(tier);
    } else {
      return res.status(400).json({ success: false, message: `Unknown catalog type: ${req.params.type}. Use: wallart, p2f, wallpaper` });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/catalog/:type/sizes
// Returns the union of all available sizes across all active components for that product type
// ─────────────────────────────────────────────
exports.getAvailableSizes = async (req, res) => {
  try {
    const type = req.params.type.toLowerCase().replace(/[-_\s]/g, '');
    let sizeSet = new Set();

    if (type === 'wallart') {
      const papers = await Paper.find({ isActive: true, productType: 'Wall Art' }).select('wallartPricing');
      papers.forEach((p) => p.wallartPricing.forEach((row) => sizeSet.add(row.size)));
    } else if (type === 'p2f' || type === 'printandframe') {
      const papers = await Paper.find({ isActive: true, productType: 'Print & Frame' }).select('framePricing');
      papers.forEach((p) => p.framePricing.forEach((row) => sizeSet.add(row.size)));
    } else if (type === 'wallpaper') {
      const papers = await Paper.find({ isActive: true, productType: 'Wall Paper' }).select('wallpaperPricing');
      papers.forEach((p) => p.wallpaperPricing.forEach((row) => sizeSet.add(row.tier)));
    } else {
      return res.status(400).json({ success: false, message: `Unknown type: ${req.params.type}` });
    }

    res.json({ success: true, data: Array.from(sizeSet).sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
