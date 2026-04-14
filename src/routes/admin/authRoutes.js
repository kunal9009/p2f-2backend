const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../../controllers/admin/authController');
const { protect, adminOnly } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimiter');

const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'warehouse', 'vendor']).withMessage('Invalid role'),
];

router.post('/login', authLimiter, loginRules, validate, authController.login);
router.get('/me', protect, authController.getMe);
router.post('/register', protect, adminOnly, registerRules, validate, authController.register);

module.exports = router;
