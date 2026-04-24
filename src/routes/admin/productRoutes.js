const router = require('express').Router();
const productController = require('../../controllers/admin/productController');
const { protect, adminOnly } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// All product routes require admin auth
router.use(protect, adminOnly);

// :type = paper | frame | canvas | glass | mount | framematerial | moulding
router.get('/:type', productController.list);
router.get('/:type/:id', productController.getById);
router.post('/:type', productController.create);
router.put('/:type/:id', productController.update);
router.delete('/:type/:id', productController.remove);
router.patch('/:type/:id/reactivate', productController.reactivate);
router.post('/:type/:id/images', upload.array('images', 5), productController.uploadImages);
router.delete('/:type/:id/images/:index', productController.removeImage);

module.exports = router;
