const router = require('express').Router();
const vendorController = require('../../controllers/admin/vendorController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get('/', vendorController.list);
router.get('/:id', vendorController.getById);
router.post('/', vendorController.create);
router.put('/:id', vendorController.update);
router.delete('/:id', vendorController.remove);

module.exports = router;
