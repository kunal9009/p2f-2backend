/**
 * AI Service — OpenAI wrapper for MahattaART task features.
 *
 * Reads OPENAI_API_KEY from env. If not set, all calls throw a 503-friendly
 * error so the controller can return a "not configured" response without
 * crashing.
 *
 * Uses global fetch (Node 18+) to avoid adding an SDK dependency.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function chat(messages, { json = false, temperature = 0.5, maxTokens = 800 } = {}) {
  if (!isConfigured()) {
    const err = new Error('AI is not configured on this server (missing OPENAI_API_KEY).');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const body = {
    model: DEFAULT_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  if (json) {
    try { return JSON.parse(content); }
    catch { throw new Error('AI returned invalid JSON'); }
  }
  return content.trim();
}

// ─── 1. Generate task description from title ───
async function generateDescription({ title, project }) {
  const text = await chat([
    { role: 'system', content:
      'You are a concise project manager assistant. Given a task title, write a short task description (3-5 sentences) that clarifies scope, acceptance criteria, and any obvious sub-steps. Plain text, no markdown headers.' },
    { role: 'user', content: `Project: ${project || 'General'}\nTask title: ${title}\n\nWrite the description:` },
  ], { temperature: 0.6, maxTokens: 280 });
  return { description: text };
}

// ─── 2. Suggest priority ───
async function suggestPriority({ title, description }) {
  const out = await chat([
    { role: 'system', content:
      'You classify a task as one of: "critical", "high", "medium", "low". Critical = outages/blockers/security; high = time-sensitive customer impact; medium = normal work; low = nice-to-have. Respond in JSON: {"priority": "...", "reasoning": "1 short sentence"}.' },
    { role: 'user', content: `Title: ${title}\nDescription: ${description || '(none)'}\n\nClassify:` },
  ], { json: true, temperature: 0.2, maxTokens: 120 });

  const valid = ['critical', 'high', 'medium', 'low'];
  const priority = valid.includes(out.priority) ? out.priority : 'medium';
  return { priority, reasoning: out.reasoning || '' };
}

// ─── 3. Summarize comments ───
async function summarizeComments({ taskTitle, comments }) {
  if (!comments || !comments.length) return { summary: 'No comments to summarize.' };

  const thread = comments
    .map(c => `${c.authorName || 'User'}: ${c.text}`)
    .join('\n');

  const text = await chat([
    { role: 'system', content:
      'You summarize discussion threads for busy managers. Return 3-5 bullet points covering: key decisions, open questions, action items. Plain text bullets with "- ". No headers.' },
    { role: 'user', content: `Task: ${taskTitle}\n\nThread:\n${thread}\n\nSummary:` },
  ], { temperature: 0.3, maxTokens: 400 });
  return { summary: text };
}

// ─── 4. Suggest tags ───
async function suggestTags({ title, description, existingTags = [] }) {
  const out = await chat([
    { role: 'system', content:
      'You suggest 3-6 short, lowercase, single-word or hyphenated tags for a task. Prefer reusing existing tags when appropriate. Respond in JSON: {"tags": ["tag1", "tag2", ...]}. No spaces in tags.' },
    { role: 'user', content:
      `Title: ${title}\nDescription: ${description || '(none)'}\n` +
      (existingTags.length ? `Existing tags pool: ${existingTags.join(', ')}\n` : '') +
      'Suggest tags:' },
  ], { json: true, temperature: 0.4, maxTokens: 150 });

  const tags = Array.isArray(out.tags)
    ? out.tags.filter(t => typeof t === 'string').map(t => t.toLowerCase().replace(/\s+/g, '-')).slice(0, 8)
    : [];
  return { tags };
}

// ─── 5. Parse natural-language task ───
async function parseTask({ prompt, users = [] }) {
  const userList = users.slice(0, 30).map(u => `${u.name} (${u.role})`).join(', ');

  const out = await chat([
    { role: 'system', content:
      'You parse a plain-language instruction into a structured task. ' +
      'Respond in JSON with fields: {"title": string, "description": string, "priority": "critical"|"high"|"medium"|"low", "dueDate": ISO date string or null, "assigneeHints": string[] (names only, pick from provided list), "tags": string[]}. ' +
      'dueDate must be interpreted from phrases like "tomorrow", "next Monday", "by Friday" using today as reference. ' +
      'Leave assigneeHints empty if no people mentioned.' },
    { role: 'user', content:
      `Today is ${new Date().toISOString().slice(0,10)}.\n` +
      (userList ? `Known people: ${userList}\n` : '') +
      `Instruction: "${prompt}"\n\nParse:` },
  ], { json: true, temperature: 0.2, maxTokens: 400 });

  const valid = ['critical', 'high', 'medium', 'low'];
  return {
    title:          typeof out.title === 'string' ? out.title : '',
    description:    typeof out.description === 'string' ? out.description : '',
    priority:       valid.includes(out.priority) ? out.priority : 'medium',
    dueDate:        out.dueDate || null,
    assigneeHints:  Array.isArray(out.assigneeHints) ? out.assigneeHints : [],
    tags:           Array.isArray(out.tags) ? out.tags : [],
  };
}

// ─── 6. Chat assistant ───
async function assistantChat({ message, history = [], context = '' }) {
  const messages = [
    { role: 'system', content:
      'You are the MahattaART task assistant. Answer questions about the user\'s tasks concisely. ' +
      'If context is provided, use it as ground truth. If unsure, say so. Keep replies under 150 words.' +
      (context ? `\n\nCONTEXT:\n${context}` : '') },
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];
  const text = await chat(messages, { temperature: 0.5, maxTokens: 600 });
  return { reply: text };
}

module.exports = {
  isConfigured,
  generateDescription,
  suggestPriority,
  summarizeComments,
  suggestTags,
  parseTask,
  assistantChat,
};
