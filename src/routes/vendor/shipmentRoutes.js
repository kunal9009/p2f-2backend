const router = require('express').Router();
const shipmentController = require('../../controllers/vendor/shipmentController');
const { protect, vendorOnly } = require('../../middleware/auth');

router.use(protect, vendorOnly);

router.get('/', shipmentController.list);
router.post('/', shipmentController.create);
router.patch('/:id', shipmentController.update);

module.exports = router;
