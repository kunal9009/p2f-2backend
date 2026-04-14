const router = require('express').Router();
const orderController = require('../../controllers/admin/orderController');
const { protect, adminOrWarehouse } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.use(protect, adminOrWarehouse);

// Order CRUD
router.get('/', orderController.list);
router.get('/:id', orderController.getById);
router.post('/', orderController.create);
router.put('/:id', orderController.update);

// Status pipeline
router.patch('/:id/status', orderController.updateStatus);

// Assignment & payment
router.patch('/bulk-assign-vendor', orderController.bulkAssignVendor);
router.patch('/:id/assign-vendor', orderController.assignVendor);
router.patch('/:id/payment', orderController.updatePayment);

// Address & notes
router.patch('/:id/address', orderController.updateAddress);
router.patch('/:id/notes', orderController.updateNotes);

// Line item management (pre-production only)
router.post('/:id/items', orderController.addItem);
router.put('/:id/items/:itemId', orderController.updateItem);
router.delete('/:id/items/:itemId', orderController.removeItem);

// Design image upload per item
router.post('/:id/items/:itemId/design', upload.single('design'), orderController.uploadDesignImage);

module.exports = router;
