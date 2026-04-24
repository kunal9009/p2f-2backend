/**
 * Seed script — loads the current sprint tasks into the Task collection.
 * Idempotent: matches on (title + project) so re-running won't create
 * duplicates.
 *
 * Usage:
 *   node scripts/seed-sprint-tasks.js
 *
 * Prereqs: Abhishek and Faiz users must exist (run `npm run seed` first).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../src/models/Task');
const User = require('../src/models/User');

const ABHISHEK_EMAIL = (process.env.ABHISHEK_EMAIL || 'abhishek@mahattaart.com').toLowerCase();
const FAIZ_EMAIL     = (process.env.FAIZ_EMAIL     || 'faiz@mahattaart.com').toLowerCase();

// Sprint report — Apr 24, 2026.
// `devs: 'team'` assigns both Abhishek + Faiz; ownership can be refined in the panel.
const SPRINT_TASKS = [
  // ── Wallpaper System — This Week (Apr 24) ──
  { title: 'Wallpaper: PDP, Listing Page & Homepage UI',        project: 'Wallpaper System',   status: 'in_progress', priority: 'high' },
  { title: 'Wallpaper: Display Logic (Category & Space Filters)', project: 'Wallpaper System', status: 'in_progress', priority: 'high' },
  { title: 'Wallpaper: Price Updates',                           project: 'Wallpaper System',   status: 'completed',   priority: 'medium' },
  { title: 'Wallpaper: Shift Pricing (Standard -> Premium)',     project: 'Wallpaper System',   status: 'completed',   priority: 'medium' },

  // ── Wallpaper System — Next Week (Apr 27 – May 1) ──
  { title: 'Wallpaper: Database Tracking Backend',       project: 'Wallpaper System', status: 'todo', priority: 'high',   dueDate: '2026-04-27' },
  { title: 'Wallpaper: Query Management UI Deployment',  project: 'Wallpaper System', status: 'todo', priority: 'medium', dueDate: '2026-04-29' },
  { title: 'Wallpaper: Global SMS (OTP Integration)',    project: 'Wallpaper System', status: 'todo', priority: 'medium', dueDate: '2026-05-01' },

  // ── Inventory System (High Priority) — owned by Abhishek + Faiz ──
  { title: 'Inventory: Consumption Calculation Go Live', project: 'Inventory System', status: 'in_progress', priority: 'high', devs: 'team' },
  { title: 'Inventory: Support & Sync',                  project: 'Inventory System', status: 'in_progress', priority: 'high', devs: 'team' },

  // ── Reporting & Data System ──
  { title: 'Reporting: Database Tracking (Wallpaper)', project: 'Reporting & Data', status: 'todo', priority: 'medium', dueDate: '2026-04-27' },
  { title: 'Reporting: MIS Report (Excel Download)',   project: 'Reporting & Data', status: 'todo', priority: 'medium', dueDate: '2026-04-30' },

  // ── Backend Optimization ──
  { title: 'P2F Backend Fields Optimization', project: 'Backend Optimization', status: 'in_progress', priority: 'medium' },

  // ── Srinagar Unit ──
  {
    title: 'Srinagar Unit: System Optimization',
    project: 'Srinagar Unit',
    status: 'on_hold',
    priority: 'low',
    description: 'Scope not clear — finalize before execution.',
  },
];

function toDevEntry(user) {
  return { userId: user._id, name: user.name, email: user.email };
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const abhishek = await User.findOne({ email: ABHISHEK_EMAIL });
  const faiz     = await User.findOne({ email: FAIZ_EMAIL });

  if (!abhishek || !faiz) {
    console.warn(
      `⚠️  Abhishek (${ABHISHEK_EMAIL}) or Faiz (${FAIZ_EMAIL}) not found — ` +
      `run \`npm run seed\` first. Inventory tasks will be seeded without developers.`
    );
  }
  const teamDevs = [abhishek, faiz].filter(Boolean).map(toDevEntry);

  let created = 0;
  let skipped = 0;

  for (const t of SPRINT_TASKS) {
    const existing = await Task.findOne({ title: t.title, project: t.project });
    if (existing) {
      console.log(`• skip: "${t.title}" already exists (${existing.taskId || existing._id})`);
      skipped++;
      continue;
    }

    const doc = {
      title: t.title,
      project: t.project,
      status: t.status,
      priority: t.priority,
    };
    if (t.description) doc.description = t.description;
    if (t.dueDate)     doc.dueDate = new Date(t.dueDate);
    if (t.devs === 'team' && teamDevs.length) doc.developers = teamDevs;

    const task = await Task.create(doc);
    console.log(`✓ created: ${task.taskId} — ${task.title}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped (already existed): ${skipped}, Total: ${SPRINT_TASKS.length}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Sprint task seed failed:', err.message);
  process.exit(1);
});
