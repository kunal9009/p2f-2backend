const { calculatePrices, calculatePaperCost, calculateSizePricing } = require('../../utils/pricingCalculator');
const Paper = require('../../models/Paper');

/**
 * POST /api/admin/pricing/calculate
 * Body: { rate, companyMarginPct, mrpPct, displayPct, maxDisplayPct }
 * Returns calculated prices for a given rate + markup percentages.
 */
exports.calculate = async (req, res) => {
  try {
    const { rate, companyMarginPct, mrpPct, displayPct, maxDisplayPct } = req.body;
    if (rate === undefined) {
      return res.status(400).json({ success: false, message: '`rate` is required' });
    }

    const result = calculatePrices(Number(rate), {
      companyMarginPct: Number(companyMarginPct) || 0,
      mrpPct: Number(mrpPct) || 0,
      displayPct: Number(displayPct) || 0,
      maxDisplayPct: Number(maxDisplayPct) || 0,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/pricing/paper-cost
 * Body: { rollPrice, rollHeightInches, rollWidthInches, inkCostPerSqIn, printCostPerSqIn }
 * Returns cost breakdown per sq inch for a paper roll.
 */
exports.paperCost = async (req, res) => {
  try {
    const { rollPrice, rollHeightInches, rollWidthInches, inkCostPerSqIn, printCostPerSqIn } = req.body;
    const result = calculatePaperCost(
      Number(rollPrice),
      Number(rollHeightInches),
      Number(rollWidthInches),
      Number(inkCostPerSqIn) || 0,
      Number(printCostPerSqIn) || 0
    );
    if (!result) {
      return res.status(400).json({ success: false, message: 'Roll dimensions cannot be zero' });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/pricing/size-grid
 * Body: { totalCostPerSqIn, sizes: ['12x18','24x36',...], markups: { companyMarginPct, mrpPct, displayPct, maxDisplayPct } }
 * Returns a pricing grid for multiple sizes.
 */
exports.sizeGrid = async (req, res) => {
  try {
    const { totalCostPerSqIn, sizes, markups } = req.body;
    if (!totalCostPerSqIn || !sizes || !Array.isArray(sizes)) {
      return res.status(400).json({ success: false, message: '`totalCostPerSqIn` and `sizes` array required' });
    }

    const grid = sizes.map((sizeStr) => {
      const parts = String(sizeStr).toLowerCase().split(/[x×]/);
      const w = parseFloat(parts[0]) || 0;
      const h = parseFloat(parts[1]) || 0;
      return calculateSizePricing(w, h, Number(totalCostPerSqIn), markups || {});
    });

    res.json({ success: true, data: grid });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/pricing/paper/:paperId/apply
 * Recalculates and saves all pricing rows for a Paper document.
 * Body: { markups: { wallart: {...}, frame: {...}, wallpaper: {...} } }
 */
exports.applyToPaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.paperId);
    if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

    const { markups = {} } = req.body;

    const totalCostPerSqIn = paper.totalCostPerSqInch ||
      (paper.costPerSqInch || 0) + (paper.inkCostPerSqInch || 0) + (paper.printCostPerSqInch || 0);

    // Recalculate wallart pricing
    if (paper.wallartPricing && paper.wallartPricing.length && markups.wallart) {
      paper.wallartPricing = paper.wallartPricing.map((row) => {
        const parts = String(row.size).toLowerCase().split(/[x×]/);
        const w = parseFloat(parts[0]) || 0;
        const h = parseFloat(parts[1]) || 0;
        const sqIn = w * h;
        const rate = Math.round(sqIn * totalCostPerSqIn * 100) / 100;
        const prices = calculatePrices(rate, markups.wallart);
        return { ...row, rate: prices.rate, companyMargin: prices.companyMargin, mrp: prices.mrp, displayPrice: prices.displayPrice, maxDisplayPrice: prices.maxDisplayPrice };
      });
    }

    // Recalculate frame (P2F) pricing
    if (paper.framePricing && paper.framePricing.length && markups.frame) {
      paper.framePricing = paper.framePricing.map((row) => {
        const parts = String(row.size).toLowerCase().split(/[x×]/);
        const w = parseFloat(parts[0]) || 0;
        const h = parseFloat(parts[1]) || 0;
        const sqIn = w * h;
        const rate = Math.round(sqIn * totalCostPerSqIn * 100) / 100;
        const prices = calculatePrices(rate, markups.frame);
        return { ...row, rate: prices.rate, companyMargin: prices.companyMargin, mrp: prices.mrp, displayPrice: prices.displayPrice, maxDisplayPrice: prices.maxDisplayPrice };
      });
    }

    // Recalculate wallpaper pricing (per sqft)
    if (paper.wallpaperPricing && paper.wallpaperPricing.length && markups.wallpaper) {
      const sqFtRate = totalCostPerSqIn * 144; // 1 sqft = 144 sqin
      paper.wallpaperPricing = paper.wallpaperPricing.map((row) => {
        const prices = calculatePrices(sqFtRate, markups.wallpaper);
        return { ...row, ratePerSqFt: prices.rate, companyMargin: prices.companyMargin, mrp: prices.mrp, displayPrice: prices.displayPrice, maxDisplayPrice: prices.maxDisplayPrice };
      });
    }

    paper.markModified('wallartPricing');
    paper.markModified('framePricing');
    paper.markModified('wallpaperPricing');
    await paper.save();

    res.json({ success: true, data: paper });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
