import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../contexts/ToastContext';

const STATUSES   = ['todo','in_progress','testing','on_hold','completed','cancelled'];
const PRIORITIES = ['critical','high','medium','low'];

export default function TaskForm({ taskId, defaultStatus, onClose, onSaved }) {
  const { toast }             = useToast();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    title: '', description: '', status: defaultStatus || 'todo',
    priority: 'medium', project: '', dueDate: '', reminderDate: '',
    tags: '', assignedTo: [], estimatedHours: '', actualHours: '',
  });

  useEffect(() => {
    async function load() {
      const [usersRes, taskRes] = await Promise.all([
        api('/api/admin/users'),
        taskId ? api('/api/admin/tasks/' + taskId) : Promise.resolve({}),
      ]);
      if (usersRes.success) setUsers(usersRes.data || usersRes.users || []);
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
          estimatedHours: t.estimatedHours || '',
          actualHours:    t.actualHours    || '',
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');

    const selected = users.filter(u => form.assignedTo.includes(u._id || u.id));
    const payload  = {
      ...form,
      tags:         form.tags.split(',').map(t => t.trim()).filter(Boolean),
      assignedTo:   selected.map(u => ({ userId: u._id||u.id, name: u.name, email: u.email })),
      dueDate:        form.dueDate        || undefined,
      reminderDate:   form.reminderDate   || undefined,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      actualHours:    form.actualHours    ? Number(form.actualHours)    : undefined,
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

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading…</div>;

  return (
    <form className="task-form" onSubmit={handleSubmit} style={{ padding: 0 }}>
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="form-group">
        <label>Title *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" required />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the task…" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Priority</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Project</label>
        <input value={form.project} onChange={e => set('project', e.target.value)} placeholder="Project or team name" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Due Date</label>
          <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Reminder Date</label>
          <input type="date" value={form.reminderDate} onChange={e => set('reminderDate', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label>Tags (comma-separated)</label>
        <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="bug, feature, urgent" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Est. Hours</label>
          <input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} placeholder="e.g. 4" />
        </div>
        <div className="form-group">
          <label>Actual Hours</label>
          <input type="number" min="0" step="0.5" value={form.actualHours} onChange={e => set('actualHours', e.target.value)} placeholder="e.g. 6" />
        </div>
      </div>

      <div className="form-group">
        <label>Assign To</label>
        <div className="assignee-grid">
          {users.map(u => {
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
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : taskId ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
