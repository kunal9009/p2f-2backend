import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const STATUSES    = ['not_started','todo','under_discussion','in_progress','testing','on_hold','completed','cancelled'];
const PRIORITIES  = ['critical','high','medium','low'];
const DEPARTMENTS = ['marketing','content','sales','product','it'];
const PRODUCTS    = [
  { value: 'wallpaper',      label: 'Wallpaper' },
  { value: 'wallart',        label: 'Wallart' },
  { value: 'p2f',            label: 'P2F' },
  { value: 'entire-website', label: 'Entire Website' },
];
const PANELS      = ['backend','frontend'];
const MANAGER     = 'Kunal';
// Tasks can only be assigned to "doer" roles — developer + product.
// Other internal-staff roles (marketing/content/sales/etc.) submit work
// requests via the compact Add Task form, but aren't pickable here.
const ASSIGNABLE_ROLES = ['developer','product'];

export default function TaskForm({ taskId, defaultStatus, defaultDueDate, onClose, onSaved }) {
  const { toast }             = useToast();
  const { isAdmin }           = useAuth();
  // Form modes:
  //  - non-admin (creating)        → 6 fields (compact)
  //  - admin (creating or editing) → full form, every field visible
  const compact = !isAdmin;
  const [users,    setUsers]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [allTags,  setAllTags]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    title: '', description: '', status: defaultStatus || 'todo',
    priority: 'medium', project: '', dueDate: defaultDueDate || '', reminderDate: '',
    tags: '', assignedTo: [], developers: [], actualHours: '',
    emailNotificationsEnabled: true,
    department: '', ownerName: '',
    changeFromDepartment: '', changeRequestDate: '',
    product: '', panel: '',
  });

  useEffect(() => {
    async function load() {
      const [usersRes, taskRes, projRes, tagsRes] = await Promise.all([
        api('/api/admin/users'),
        taskId ? api('/api/admin/tasks/' + taskId) : Promise.resolve({}),
        api('/api/admin/tasks/projects'),
        api('/api/admin/tasks/tags'),
      ]);
      if (usersRes.success) setUsers(usersRes.data || usersRes.users || []);
      if (projRes.success)  setProjects(projRes.data || []);
      if (tagsRes.success)  setAllTags(tagsRes.data || []);
      if (taskRes.success && taskRes.data) {
        const t = taskRes.data;
        setForm({
          title:        t.title || '',
          description:  t.description || '',
          status:       t.status || 'todo',
          priority:     t.priority || 'medium',
          project:      t.project || '',
          dueDate:      t.dueDate      ? t.dueDate.slice(0,10)      : '',
          reminderDate: t.reminderDate ? t.reminderDate.slice(0,10) : '',
          tags:           (t.tags || []).join(', '),
          assignedTo:     (t.assignedTo || []).map(a => a.userId),
          developers:     (t.developers || []).map(a => a.userId),
          actualHours:    t.actualHours    || '',
          emailNotificationsEnabled: t.emailNotificationsEnabled !== false,
          department:           t.department || '',
          ownerName:            t.ownerName  || '',
          changeFromDepartment: t.changeFromDepartment || '',
          changeRequestDate:    t.changeRequestDate ? t.changeRequestDate.slice(0, 10) : '',
          product: t.product || '',
          panel:   t.panel   || '',
        });
      }
      setLoading(false);
    }
    load();
  }, [taskId]);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function toggleUser(uid) {
    setForm(f => ({
      ...f,
      assignedTo: f.assignedTo.includes(uid)
        ? f.assignedTo.filter(id => id !== uid)
        : [...f.assignedTo, uid],
    }));
  }

  function toggleDeveloper(uid) {
    setForm(f => ({
      ...f,
      developers: f.developers.includes(uid)
        ? f.developers.filter(id => id !== uid)
        : [...f.developers, uid],
    }));
  }

  // ─── AI helpers ───
  const [aiBusy, setAiBusy] = useState({});
  const [aiPriorityHint, setAiPriorityHint] = useState(null);
  const [nlPrompt, setNlPrompt] = useState('');

  async function runAi(key, fn) {
    setAiBusy(b => ({ ...b, [key]: true }));
    try { await fn(); }
    catch (e) { toast(e.message || 'AI request failed', 'error'); }
    finally { setAiBusy(b => ({ ...b, [key]: false })); }
  }

  async function aiGenerateDescription() {
    if (!form.title.trim()) { toast('Add a title first', 'error'); return; }
    const res = await api('/api/admin/ai/generate-description', 'POST', {
      title: form.title, project: form.project,
    });
    if (res.success) { set('description', res.data.description); toast('Description generated', 'success'); }
    else             { toast(res.message || 'AI unavailable', 'error'); }
  }

  async function aiSuggestPriority() {
    if (!form.title.trim()) { toast('Add a title first', 'error'); return; }
    const res = await api('/api/admin/ai/suggest-priority', 'POST', {
      title: form.title, description: form.description,
    });
    if (res.success) setAiPriorityHint(res.data);
    else             toast(res.message || 'AI unavailable', 'error');
  }

  async function aiSuggestTags() {
    if (!form.title.trim()) { toast('Add a title first', 'error'); return; }
    const res = await api('/api/admin/ai/suggest-tags', 'POST', {
      title: form.title, description: form.description,
    });
    if (res.success) {
      const existing = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const merged = [...new Set([...existing, ...res.data.tags])];
      set('tags', merged.join(', '));
      toast(`${res.data.tags.length} tags suggested`, 'success');
    } else {
      toast(res.message || 'AI unavailable', 'error');
    }
  }

  async function aiParseTask() {
    if (!nlPrompt.trim()) return;
    const res = await api('/api/admin/ai/parse-task', 'POST', { prompt: nlPrompt });
    if (!res.success) { toast(res.message || 'AI unavailable', 'error'); return; }
    const d = res.data;
    setForm(f => ({
      ...f,
      title:       d.title || f.title,
      description: d.description || f.description,
      priority:    d.priority || f.priority,
      dueDate:     d.dueDate ? d.dueDate.slice(0, 10) : f.dueDate,
      tags:        d.tags && d.tags.length ? d.tags.join(', ') : f.tags,
      assignedTo:  d.assignees && d.assignees.length
        ? [...new Set([...f.assignedTo, ...d.assignees.map(a => a.userId)])]
        : f.assignedTo,
    }));
    toast('Parsed — review and save', 'success');
    setNlPrompt('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');

    const selected = users.filter(u => form.assignedTo.includes(u._id || u.id));
    const selectedDevs = users.filter(u => form.developers.includes(u._id || u.id));
    const payload  = {
      ...form,
      tags:         form.tags.split(',').map(t => t.trim()).filter(Boolean),
      assignedTo:   selected.map(u => ({ userId: u._id||u.id, name: u.name, email: u.email })),
      developers:   selectedDevs.map(u => ({ userId: u._id||u.id, name: u.name, email: u.email })),
      dueDate:        form.dueDate        || undefined,
      reminderDate:   form.reminderDate   || undefined,
      actualHours:    form.actualHours    ? Number(form.actualHours)    : undefined,
      changeRequestDate: form.changeRequestDate || undefined,
      product: form.product || undefined,
      panel:   form.panel   || undefined,
    };

    const res = await api(
      taskId ? '/api/admin/tasks/' + taskId : '/api/admin/tasks',
      taskId ? 'PUT' : 'POST',
      payload,
    );
    setSaving(false);
    if (res.success) { toast(taskId ? 'Task updated' : 'Task created', 'success'); onSaved && onSaved(res.data); }
    else             { setError(res.message || 'Save failed'); toast(res.message || 'Save failed', 'error'); }
  }

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>;

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* ── AI NL prompt (admin creating new only) ── */}
      {!compact && (
        <div className="ai-nl-box">
          <div className="ai-nl-label">
            <span>✨ Describe the task in plain English</span>
            <span className="ai-nl-hint">AI will fill title, due date, assignees, priority</span>
          </div>
          <div className="ai-nl-row">
            <input
              className="ai-nl-input"
              value={nlPrompt}
              onChange={e => setNlPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runAi('parse', aiParseTask); } }}
              placeholder='e.g. "By Friday, Faiz ko homepage redesign assign karo, high priority"'
            />
            <button type="button" className="btn btn-primary btn-sm"
                    disabled={!nlPrompt.trim() || aiBusy.parse}
                    onClick={() => runAi('parse', aiParseTask)}>
              {aiBusy.parse ? '…' : 'Parse'}
            </button>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Title *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" required />
      </div>

      <div className="form-group">
        <label className="label-with-ai">
          <span>Description</span>
          {!compact && (
            <button type="button" className="btn-ai-inline"
                    disabled={aiBusy.desc || !form.title.trim()}
                    onClick={() => runAi('desc', aiGenerateDescription)}
                    title="Generate description from title">
              {aiBusy.desc ? '…' : '✨ Generate with AI'}
            </button>
          )}
        </label>
        <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the task…" />
      </div>

      {isAdmin ? (
        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label-with-ai">
              <span>Priority</span>
              <button type="button" className="btn-ai-inline"
                      disabled={aiBusy.prio || !form.title.trim()}
                      onClick={() => runAi('prio', aiSuggestPriority)}
                      title="Let AI suggest a priority">
                {aiBusy.prio ? '…' : '✨ Suggest'}
              </button>
            </label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {aiPriorityHint && (
              <div className="ai-hint">
                AI suggests <strong>{aiPriorityHint.priority}</strong>
                {aiPriorityHint.reasoning && <> — <em>{aiPriorityHint.reasoning}</em></>}
                {aiPriorityHint.priority !== form.priority && (
                  <button type="button" className="btn-link"
                          onClick={() => { set('priority', aiPriorityHint.priority); setAiPriorityHint(null); }}>
                    Apply
                  </button>
                )}
                <button type="button" className="btn-link" onClick={() => setAiPriorityHint(null)}>Dismiss</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label>Priority</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      {!compact && (
        <div className="form-group">
          <label>Project</label>
          <input
            list="project-suggestions"
            value={form.project}
            onChange={e => set('project', e.target.value)}
            placeholder="Project or team name"
          />
          <datalist id="project-suggestions">
            {projects.map(p => <option key={p} value={p} />)}
          </datalist>
        </div>
      )}

      {!compact ? (
        <div className="form-row">
          <div className="form-group">
            <label>Deadline Date</label>
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Reminder Date</label>
            <input type="date" value={form.reminderDate} onChange={e => set('reminderDate', e.target.value)} />
          </div>
        </div>
      ) : isAdmin && (
        <div className="form-group">
          <label>Deadline Date</label>
          <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
      )}

      {!compact && (
        <div className="form-group">
          <label className="label-with-ai">
            <span>Tags (comma-separated)</span>
            <button type="button" className="btn-ai-inline"
                    disabled={aiBusy.tags || !form.title.trim()}
                    onClick={() => runAi('tags', aiSuggestTags)}
                    title="Let AI suggest tags">
              {aiBusy.tags ? '…' : '✨ Suggest tags'}
            </button>
          </label>
          <input
            value={form.tags}
            onChange={e => set('tags', e.target.value)}
            placeholder="bug, feature, urgent"
          />
          {allTags.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
              {allTags.filter(t => !form.tags.split(',').map(x=>x.trim()).includes(t)).slice(0,12).map(t => (
                <span
                  key={t}
                  className="tag-chip"
                  style={{ cursor:'pointer' }}
                  title="Click to add"
                  onClick={() => set('tags', form.tags ? form.tags + ', ' + t : t)}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Department</label>
          <select value={form.department} onChange={e => set('department', e.target.value)}>
            <option value="">— Select department —</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Owner Name</label>
          <input value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Task owner" />
        </div>
      </div>

      {/* "Change Requested From" / "Change Request Date" removed —
          Department field above already captures the requesting department. */}

      {isAdmin ? (
        <div className="form-row">
          <div className="form-group">
            <label>Product</label>
            <select value={form.product} onChange={e => set('product', e.target.value)}>
              <option value="">— Select product —</option>
              {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Panel</label>
            <select value={form.panel} onChange={e => set('panel', e.target.value)}>
              <option value="">— Select panel —</option>
              {PANELS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label>Product</label>
          <select value={form.product} onChange={e => set('product', e.target.value)}>
            <option value="">— Select product —</option>
            {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      )}

      {!compact && (
        <div className="form-row">
          <div className="form-group">
            <label>Managed by</label>
            <input value={MANAGER} readOnly disabled style={{ background:'var(--bg)', cursor:'not-allowed' }} />
          </div>
          <div className="form-group">
            <label>Actual Hours</label>
            <input type="number" min="0" step="0.5" value={form.actualHours} onChange={e => set('actualHours', e.target.value)} placeholder="e.g. 6" />
          </div>
        </div>
      )}

      {!compact && (
        <div className="form-group">
          <label>Developers</label>
          <MultiSelectDropdown
            users={users}
            selectedIds={form.developers}
            onToggle={toggleDeveloper}
            onClear={() => set('developers', [])}
            placeholder="Select developers…"
            emptyText="No developers selected"
          />
        </div>
      )}

      {!compact && (
        <div className="form-group">
          <label>Assign To</label>
          <div className="assignee-grid">
            {users.filter(u => ASSIGNABLE_ROLES.includes(u.role)).map(u => {
              const uid = u._id || u.id;
              return (
                <div
                  key={uid}
                  className={`assignee-tile${form.assignedTo.includes(uid) ? ' selected' : ''}`}
                  onClick={() => toggleUser(uid)}
                >
                  <div className="assignee-avatar">{(u.name||'U').slice(0,1).toUpperCase()}</div>
                  <div className="assignee-name">{u.name}</div>
                  <div className="assignee-role">{u.role}</div>
                </div>
              );
            })}
            {users.filter(u => ASSIGNABLE_ROLES.includes(u.role)).length === 0 && (
              <div style={{ gridColumn:'1 / -1', padding:12, fontSize:12, color:'var(--muted)' }}>
                No developer / product users yet. Add one in Users → + Add User.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email notifications toggle (full form only) */}
      {!compact && (
        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, padding:'8px 0', borderTop:'1px solid var(--border)' }}>
          <input
            type="checkbox"
            checked={form.emailNotificationsEnabled}
            onChange={e => set('emailNotificationsEnabled', e.target.checked)}
            style={{ width:16, height:16, accentColor:'#3b82f6', flexShrink:0 }}
          />
          <span>
            <strong>Email notifications</strong>
            <span style={{ color:'var(--muted)', marginLeft:6 }}>— notify assignees on status changes and due dates</span>
          </span>
        </label>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : taskId ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}

function MultiSelectDropdown({ users, selectedIds, onToggle, onClear, placeholder, emptyText }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selected = users.filter(u => selectedIds.includes(u._id || u.id));
  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(q.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="multi-select" ref={ref}>
      <button
        type="button"
        className="multi-select-toggle"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected.length === 0 ? (
          <span className="multi-select-placeholder">{placeholder}</span>
        ) : (
          <span className="multi-select-chips">
            {selected.map(u => (
              <span key={u._id || u.id} className="ms-chip">
                {u.name}
                <span
                  className="ms-chip-x"
                  onClick={e => { e.stopPropagation(); onToggle(u._id || u.id); }}
                  title="Remove"
                >✕</span>
              </span>
            ))}
          </span>
        )}
        <span className="multi-select-caret">▾</span>
      </button>

      {open && (
        <div className="multi-select-panel" role="listbox">
          <input
            className="multi-select-search"
            placeholder="Search…"
            value={q}
            onChange={e => setQ(e.target.value)}
            autoFocus
          />
          <div className="multi-select-options">
            {filtered.length === 0 ? (
              <div className="multi-select-empty">No users match</div>
            ) : filtered.map(u => {
              const uid = u._id || u.id;
              const checked = selectedIds.includes(uid);
              return (
                <label key={uid} className={`ms-option${checked ? ' checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(uid)}
                  />
                  <span className="ms-option-avatar">{(u.name || 'U').slice(0, 1).toUpperCase()}</span>
                  <span className="ms-option-info">
                    <span className="ms-option-name">{u.name}</span>
                    <span className="ms-option-role">{u.role}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="multi-select-footer">
              <span>{selected.length} selected</span>
              <button type="button" className="btn-link" onClick={onClear}>Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
