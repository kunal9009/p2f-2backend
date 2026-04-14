const router = require('express').Router();
const pricingController = require('../../controllers/admin/pricingController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

// Generic price calculator (rate + markups → all price tiers)
router.post('/calculate', pricingController.calculate);

// Paper roll cost breakdown
router.post('/paper-cost', pricingController.paperCost);

// Pricing grid for multiple sizes at once
router.post('/size-grid', pricingController.sizeGrid);

// Apply calculated pricing back to a saved Paper document
router.post('/paper/:paperId/apply', pricingController.applyToPaper);

module.exports = router;
