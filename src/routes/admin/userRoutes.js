const router = require('express').Router();
const userController = require('../../controllers/admin/userController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get('/', userController.list);
router.post('/', userController.create);
router.get('/:id', userController.getById);
router.put('/:id', userController.update);
router.patch('/:id/reset-password', userController.resetPassword);
router.delete('/:id', userController.remove);

module.exports = router;
