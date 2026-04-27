const router = require('express').Router();
const taskController = require('../../controllers/admin/taskController');
const { protect, adminOrWarehouse, adminOnly, requireSection } = require('../../middleware/auth');

// All task routes require auth (any internal staff: admin/warehouse/dept roles)
router.use(protect, adminOrWarehouse);

// ─── SPECIAL ROUTES (must come before /:id) ───
router.get('/dashboard', taskController.dashboard);     // GET  /api/admin/tasks/dashboard
router.get('/kanban',    taskController.kanban);        // GET  /api/admin/tasks/kanban
router.get('/my',        taskController.myTasks);       // GET  /api/admin/tasks/my
router.get('/export',    taskController.exportCsv);     // GET  /api/admin/tasks/export
router.get('/activity',  taskController.activity);      // GET  /api/admin/tasks/activity
router.get('/search',           taskController.search);          // GET  /api/admin/tasks/search
router.get('/projects',         taskController.projects);        // GET  /api/admin/tasks/projects
router.get('/tags',             taskController.tags);            // GET  /api/admin/tasks/tags
router.get('/scheduler-status', taskController.schedulerStatus); // GET  /api/admin/tasks/scheduler-status
router.post('/test-email',      adminOnly, taskController.testEmail);       // POST /api/admin/tasks/test-email

// ─── TASK CRUD ───
// Reads are open to all internal staff. Create is open to admin OR any user
// with the `add-task` section permission. Edit / delete / status changes
// stay admin-only — non-admin users are view-only after creating.
router.get('/',    taskController.list);                                 // GET    /api/admin/tasks
router.post('/',   requireSection('add-task'), taskController.create);   // POST   /api/admin/tasks
router.get('/:id', taskController.getById);                              // GET    /api/admin/tasks/:id
router.put('/:id', adminOnly, taskController.update);                    // PUT    /api/admin/tasks/:id
router.delete('/:id', adminOnly, taskController.remove);                 // DELETE /api/admin/tasks/:id

// ─── STATUS MANAGEMENT ───
router.patch('/:id/status', adminOnly, taskController.updateStatus); // PATCH /api/admin/tasks/:id/status

// ─── COMMENTS ───
router.post('/:id/comments',               adminOnly, taskController.addComment);    // POST   /api/admin/tasks/:id/comments
router.delete('/:id/comments/:commentId',  adminOnly, taskController.deleteComment); // DELETE /api/admin/tasks/:id/comments/:commentId

module.exports = router;
