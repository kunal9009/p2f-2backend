const router = require('express').Router();
const customerController = require('../../controllers/admin/customerController');
const { protect, adminOrWarehouse } = require('../../middleware/auth');

router.use(protect, adminOrWarehouse);

router.get('/', customerController.list);
router.get('/:id', customerController.getById);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.remove);

module.exports = router;
