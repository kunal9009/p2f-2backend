const router = require('express').Router();
const orderController = require('../../controllers/vendor/orderController');
const { protect, vendorOnly } = require('../../middleware/auth');

router.use(protect, vendorOnly);

router.get('/stats', orderController.getStats);
router.get('/', orderController.list);
router.get('/:id', orderController.getById);
router.patch('/:id/status', orderController.updateStatus);
router.patch('/:id/production-cost', orderController.updateProductionCost);
// Vendor can also upload a design image for an item (e.g. when customer sends directly to Vikas)
router.post('/:id/items/:itemId/design', require('../../middleware/upload').single('design'), orderController.uploadDesignImage);

module.exports = router;
