const router = require('express').Router();
const paymentController = require('../../controllers/vendor/paymentController');
const { protect, vendorOnly } = require('../../middleware/auth');

router.use(protect, vendorOnly);

router.get('/summary', paymentController.summary);
router.get('/', paymentController.list);

module.exports = router;
