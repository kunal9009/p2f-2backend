const router = require('express').Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const { protect, adminOrWarehouse } = require('../../middleware/auth');

router.use(protect, adminOrWarehouse);

router.get('/stats', dashboardController.getStats);
router.get('/recent-orders', dashboardController.recentOrders);

module.exports = router;
