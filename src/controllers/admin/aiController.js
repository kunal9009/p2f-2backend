const aiService = require('../../services/aiService');
const Task = require('../../models/Task');
const User = require('../../models/User');

function handleAiError(res, err) {
  if (err.code === 'AI_NOT_CONFIGURED') {
    return res.status(503).json({ success: false, message: err.message, notConfigured: true });
  }
  console.error('[AI]', err.message);
  return res.status(500).json({ success: false, message: err.message });
}

// GET /api/admin/ai/status
exports.status = (req, res) => {
  res.json({ success: true, configured: aiService.isConfigured() });
};

// POST /api/admin/ai/generate-description { title, project? }
exports.generateDescription = async (req, res) => {
  try {
    const { title, project } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const data = await aiService.generateDescription({ title: title.trim(), project });
    res.json({ success: true, data });
  } catch (err) { handleAiError(res, err); }
};

// POST /api/admin/ai/suggest-priority { title, description? }
exports.suggestPriority = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const data = await aiService.suggestPriority({ title: title.trim(), description });
    res.json({ success: true, data });
  } catch (err) { handleAiError(res, err); }
};

// POST /api/admin/ai/summarize-comments { taskId }
exports.summarizeComments = async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ success: false, message: 'taskId is required' });

    const task = await Task.findById(taskId).select('title comments');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const data = await aiService.summarizeComments({
      taskTitle: task.title,
      comments:  task.comments || [],
    });
    res.json({ success: true, data });
  } catch (err) { handleAiError(res, err); }
};

// POST /api/admin/ai/suggest-tags { title, description? }
exports.suggestTags = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    // Pull existing tag pool for consistency
    const existing = await Task.distinct('tags');
    const data = await aiService.suggestTags({
      title: title.trim(),
      description,
      existingTags: (existing || []).filter(Boolean).slice(0, 30),
    });
    res.json({ success: true, data });
  } catch (err) { handleAiError(res, err); }
};

// POST /api/admin/ai/parse-task { prompt }
exports.parseTask = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'prompt is required' });
    }

    // Provide active user list so AI can map names → IDs later on client
    const users = await User.find({ isActive: { $ne: false } })
      .select('name email role')
      .limit(50);

    const parsed = await aiService.parseTask({
      prompt: prompt.trim(),
      users: users.map(u => ({ name: u.name, role: u.role })),
    });

    // Resolve assignee hints → actual user records (best-effort match on name)
    const resolvedAssignees = [];
    for (const hint of parsed.assigneeHints || []) {
      const match = users.find(u =>
        u.name.toLowerCase().includes(hint.toLowerCase()) ||
        hint.toLowerCase().includes(u.name.toLowerCase().split(' ')[0])
      );
      if (match && !resolvedAssignees.some(a => String(a.userId) === String(match._id))) {
        resolvedAssignees.push({ userId: match._id, name: match.name, email: match.email });
      }
    }

    res.json({ success: true, data: { ...parsed, assignees: resolvedAssignees } });
  } catch (err) { handleAiError(res, err); }
};

// POST /api/admin/ai/chat { message, history? }
exports.assistantChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }

    // Lightweight context: count of user's open tasks, top priorities
    const userId = req.user.id;
    const [open, overdue, mine] = await Promise.all([
      Task.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
      Task.countDocuments({ status: { $nin: ['completed', 'cancelled'] }, dueDate: { $lt: new Date() } }),
      Task.countDocuments({ 'assignedTo.userId': userId, status: { $nin: ['completed', 'cancelled'] } }),
    ]);

    const context =
      `Signed-in user: ${req.user.name} (${req.user.role}).\n` +
      `System totals: ${open} open tasks, ${overdue} overdue. ` +
      `This user has ${mine} open tasks assigned.`;

    const data = await aiService.assistantChat({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      context,
    });
    res.json({ success: true, data });
  } catch (err) { handleAiError(res, err); }
};
