const router = require('express').Router();
const vendorPaymentController = require('../../controllers/admin/vendorPaymentController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get('/', vendorPaymentController.list);
router.get('/ledger/:vendorId', vendorPaymentController.ledger);
router.get('/:id', vendorPaymentController.getById);
router.post('/', vendorPaymentController.create);
router.patch('/:id/status', vendorPaymentController.updateStatus);

module.exports = router;
