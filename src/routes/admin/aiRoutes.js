const router = require('express').Router();
const ai = require('../../controllers/admin/aiController');
const { protect, adminOrWarehouse } = require('../../middleware/auth');

router.use(protect, adminOrWarehouse);

router.get('/status',                ai.status);
router.post('/generate-description', ai.generateDescription);
router.post('/suggest-priority',     ai.suggestPriority);
router.post('/summarize-comments',   ai.summarizeComments);
router.post('/suggest-tags',         ai.suggestTags);
router.post('/parse-task',           ai.parseTask);
router.post('/chat',                 ai.assistantChat);

module.exports = router;
