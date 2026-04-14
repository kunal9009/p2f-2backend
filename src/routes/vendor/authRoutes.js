const router = require('express').Router();
const authController = require('../../controllers/vendor/authController');
const { protect } = require('../../middleware/auth');

router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;
