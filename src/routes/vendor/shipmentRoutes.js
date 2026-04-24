const router = require('express').Router();
const { body } = require('express-validator');
const shipmentController = require('../../controllers/vendor/shipmentController');
const { protect, vendorOnly } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

router.use(protect, vendorOnly);

const createRules = [
  body('orderId').notEmpty().withMessage('orderId is required'),
  body('provider').notEmpty().withMessage('Courier provider is required'),
  body('packageWeight').isFloat({ min: 0.01 }).withMessage('Package weight must be a positive number'),
];

router.get('/', shipmentController.list);
router.post('/', createRules, validate, shipmentController.create);
router.patch('/:id', shipmentController.update);

module.exports = router;
