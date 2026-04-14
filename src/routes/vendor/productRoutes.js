const router = require('express').Router();
const productController = require('../../controllers/vendor/productController');
const { protect, vendorOnly } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.use(protect, vendorOnly);

// :type = paper | frame | canvas | glass | mount | framematerial | moulding
router.get('/:type', productController.list);
router.get('/:type/:id', productController.getById);
router.post('/:type', productController.create);
router.put('/:type/:id', productController.update);
router.post('/:type/:id/images', upload.array('images', 5), productController.uploadImages);

module.exports = router;
