const router = require('express').Router();
const orderController = require('../../controllers/admin/orderController');
const { protect, adminOrWarehouse } = require('../../middleware/auth');

router.use(protect, adminOrWarehouse);

router.get('/', orderController.list);
router.get('/:id', orderController.getById);
router.post('/', orderController.create);
router.put('/:id', orderController.update);
router.patch('/:id/status', orderController.updateStatus);
router.patch('/:id/assign-vendor', orderController.assignVendor);
router.patch('/:id/payment', orderController.updatePayment);

module.exports = router;
