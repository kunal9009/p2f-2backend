const router = require('express').Router();
const customerController = require('../../controllers/admin/customerController');
const { protect, adminOrWarehouse } = require('../../middleware/auth');

router.use(protect, adminOrWarehouse);

router.get('/', customerController.list);
router.get('/:id', customerController.getById);
router.get('/:id/orders', customerController.getOrders);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.patch('/:id/reactivate', customerController.reactivate);
router.delete('/:id', customerController.remove);

module.exports = router;
