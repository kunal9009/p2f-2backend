const router = require('express').Router();
const reportController = require('../../controllers/admin/reportController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get('/revenue', reportController.revenue);
router.get('/orders', reportController.orders);
router.get('/gst', reportController.gst);
router.get('/vendor-performance', reportController.vendorPerformance);

module.exports = router;
