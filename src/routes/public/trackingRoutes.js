const router = require('express').Router();
const trackingController = require('../../controllers/public/trackingController');
const { apiLimiter } = require('../../middleware/rateLimiter');

// Apply rate limiting to prevent scraping
router.use(apiLimiter);

router.get('/track/:awb', trackingController.trackByAwb);
router.get('/order/:orderId', trackingController.trackByOrderId);

module.exports = router;
