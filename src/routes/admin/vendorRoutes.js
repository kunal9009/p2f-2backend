const router = require('express').Router();
const vendorController = require('../../controllers/admin/vendorController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get('/', vendorController.list);
router.get('/:id', vendorController.getById);
router.get('/:id/orders', vendorController.getOrders);
router.post('/', vendorController.create);
router.put('/:id', vendorController.update);
router.patch('/:id/reactivate', vendorController.reactivate);
router.delete('/:id', vendorController.remove);

module.exports = router;
