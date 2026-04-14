const router = require('express').Router();
const authController = require('../../controllers/admin/authController');
const { protect, adminOnly } = require('../../middleware/auth');

router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);
router.post('/register', protect, adminOnly, authController.register);

module.exports = router;
