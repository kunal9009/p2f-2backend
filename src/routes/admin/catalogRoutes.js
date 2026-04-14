const router = require('express').Router();
const catalogController = require('../../controllers/admin/catalogController');
const { protect, adminOrWarehouse } = require('../../middleware/auth');

router.use(protect, adminOrWarehouse);

// GET /api/admin/catalog/wallart          — all components with pricing
// GET /api/admin/catalog/p2f              — all components with pricing
// GET /api/admin/catalog/wallpaper        — paper with wallpaper pricing tiers
// Query: ?size=12x18 to filter pricing rows to one size
router.get('/:type', catalogController.getCatalog);

// GET /api/admin/catalog/wallart/sizes  — list all available sizes
router.get('/:type/sizes', catalogController.getAvailableSizes);

module.exports = router;
