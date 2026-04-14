const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../../controllers/vendor/authController');
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimiter');

const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/login', authLimiter, loginRules, validate, authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;
