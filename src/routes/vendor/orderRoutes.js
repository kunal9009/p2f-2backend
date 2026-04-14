const router = require('express').Router();
const orderController = require('../../controllers/vendor/orderController');
const { protect, vendorOnly } = require('../../middleware/auth');

router.use(protect, vendorOnly);

router.get('/stats', orderController.getStats);
router.get('/', orderController.list);
router.get('/:id', orderController.getById);
router.patch('/:id/status', orderController.updateStatus);
router.patch('/:id/production-cost', orderController.updateProductionCost);

module.exports = router;
