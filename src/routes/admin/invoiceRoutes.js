const router = require('express').Router();
const invoiceController = require('../../controllers/admin/invoiceController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get('/', invoiceController.list);
router.get('/:id', invoiceController.getById);
router.post('/generate/:orderId', invoiceController.generate);

module.exports = router;
