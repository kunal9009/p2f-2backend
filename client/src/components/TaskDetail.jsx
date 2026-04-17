import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import TaskForm from './TaskForm';
import ConfirmDialog from './ConfirmDialog';

const STATUSES   = ['todo','in_progress','testing','on_hold','completed','cancelled'];
const PCOLOR = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };
const SCOLOR = { todo:'#64748b', in_progress:'#f59e0b', testing:'#8b5cf6', on_hold:'#94a3b8', completed:'#10b981', cancelled:'#ef4444' };

export default function TaskDetail({ taskId, onClose, onUpdated }) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [task,      setTask]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [comment,   setComment]   = useState('');
  const [posting,   setPosting]   = useState(false);
  const [tab,       setTab]       = useState('details');
  const [confirm,   setConfirm]   = useState(null); // { message, onConfirm }

  useEffect(() => { load(); }, [taskId]);

  async function load() {
    setLoading(true);
    const res = await api('/api/admin/tasks/' + taskId);
    if (res.success) setTask(res.data);
    setLoading(false);
  }

  async function changeStatus(newStatus) {
    const res = await api('/api/admin/tasks/' + taskId + '/status', 'PATCH', { status: newStatus });
    if (res.success) { toast('Status updated', 'success'); load(); onUpdated && onUpdated(); }
    else toast(res.message || 'Update failed', 'error');
  }

  async function postComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    const res = await api('/api/admin/tasks/' + taskId + '/comments', 'POST', { text: comment });
    setPosting(false);
    if (res.success) { setComment(''); load(); setTab('comments'); toast('Comment added', 'success'); }
    else toast(res.message || 'Failed to post comment', 'error');
  }

  function deleteComment(commentId) {
    setConfirm({
      message: 'Delete this comment?',
      onConfirm: async () => {
        setConfirm(null);
        const res = await api('/api/admin/tasks/' + taskId + '/comments/' + commentId, 'DELETE');
        if (res.success) { load(); toast('Comment deleted', 'info'); }
        else toast(res.message || 'Delete failed', 'error');
      },
    });
  }

  function deleteTask() {
    setConfirm({
      message: 'Permanently delete this task? This cannot be undone.',
      onConfirm: async () => {
        setConfirm(null);
        const res = await api('/api/admin/tasks/' + taskId, 'DELETE');
        if (res.success) { toast('Task deleted', 'info'); onClose(); onUpdated && onUpdated(); }
        else toast(res.message || 'Delete failed', 'error');
      },
    });
  }

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', alignItems:'center', justifyContent:'center', color:'#64748b' }}>
      Loading…
    </div>
  );

  if (!task) return (
    <div style={{ padding:32, color:'#ef4444' }}>Task not found.</div>
  );

  if (editing) return (
    <div style={{ padding:'0' }}>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom:16 }} onClick={() => setEditing(false)}>
        ← Back to detail
      </button>
      <TaskForm
        taskId={taskId}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load(); onUpdated && onUpdated(); }}
      />
    </div>
  );

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['completed','cancelled'].includes(task.status);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel="Delete"
          danger
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {/* Header */}
      <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:4, display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontWeight:700 }}>{task.taskId}</span>
              {task.project && <span>· 📁 {task.project}</span>}
            </div>
            <h3 style={{ margin:0, fontSize:18, lineHeight:1.3 }}>{task.title}</h3>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
            {isAdmin && <button className="btn btn-sm" style={{ background:'#fee2e2', color:'#991b1b' }} onClick={deleteTask}>🗑</button>}
          </div>
        </div>

        {/* Status + Priority row */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <select
            value={task.status}
            style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--border)', fontWeight:600, fontSize:13, color:SCOLOR[task.status], cursor:'pointer' }}
            onChange={e => changeStatus(e.target.value)}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
          <span style={{ background:PCOLOR[task.priority]+'20', color:PCOLOR[task.priority], fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:6 }}>
            {task.priority}
          </span>
          {task.dueDate && (
            <span style={{ fontSize:12, color: isOverdue ? '#ef4444' : '#64748b' }}>
              📅 {new Date(task.dueDate).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
              {isOverdue && ' ⚠️ Overdue'}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        {[
          { id:'details',  label:'Details' },
          { id:'comments', label:`Comments (${(task.comments||[]).length})` },
          { id:'history',  label:`History (${(task.statusHistory||[]).length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding:'10px 20px', border:'none', background:'none',
              borderBottom: tab===t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab===t.id ? 'var(--accent)' : 'var(--muted)',
              fontWeight: tab===t.id ? 600 : 400,
              cursor:'pointer', fontSize:13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

        {tab === 'details' && (
          <div>
            {task.description && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Description</div>
                <p style={{ fontSize:14, lineHeight:1.6, color:'var(--text)', whiteSpace:'pre-wrap' }}>{task.description}</p>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              <InfoField label="Status"   value={task.status.replace('_',' ')} />
              <InfoField label="Priority" value={task.priority} />
              <InfoField label="Project"  value={task.project || '—'} />
              {task.reminderDate && <InfoField label="Reminder" value={new Date(task.reminderDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} />}
              {task.estimatedHours && <InfoField label="Est. Hours" value={task.estimatedHours + 'h'} />}
              {task.actualHours    && <InfoField label="Act. Hours" value={task.actualHours + 'h'} />}
              <InfoField label="Created" value={new Date(task.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} />
              {task.completedAt && <InfoField label="Completed" value={new Date(task.completedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} />}
            </div>

            {(task.tags||[]).length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Tags</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {task.tags.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}
                </div>
              </div>
            )}

            {(task.assignedTo||[]).length > 0 && (
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Assigned To</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {task.assignedTo.map(a => (
                    <div key={a.userId} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div className="user-avatar" style={{ width:30, height:30, fontSize:12, flexShrink:0 }}>
                        {(a.name||'U').slice(0,1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{a.name}</div>
                        <div style={{ fontSize:11, color:'#64748b' }}>{a.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'comments' && (
          <div>
            {(task.comments||[]).length === 0 ? (
              <p style={{ color:'#64748b', fontSize:14 }}>No comments yet.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
                {[...(task.comments||[])].reverse().map(c => (
                  <div key={c._id} style={{ background:'#f8fafc', borderRadius:8, padding:'12px 14px', position:'relative' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <div className="user-avatar" style={{ width:24, height:24, fontSize:10, flexShrink:0 }}>
                        {(c.authorName||'U').slice(0,1).toUpperCase()}
                      </div>
                      <span style={{ fontSize:13, fontWeight:600 }}>{c.authorName}</span>
                      <span style={{ fontSize:11, color:'#64748b', marginLeft:'auto' }}>
                        {new Date(c.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </span>
                      {(isAdmin || String(c.authorId) === String(user?.id)) && (
                        <button onClick={() => deleteComment(c._id)} style={{ background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:'0 2px',fontSize:13 }} title="Delete">✕</button>
                      )}
                    </div>
                    <p style={{ margin:0, fontSize:13, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment */}
            <form onSubmit={postComment} style={{ display:'flex', gap:8 }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                placeholder="Add a comment…"
                style={{ flex:1, borderRadius:8, border:'1px solid var(--border)', padding:'8px 12px', fontSize:13, resize:'vertical', fontFamily:'inherit' }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) postComment(e); }}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={posting || !comment.trim()} style={{ alignSelf:'flex-end' }}>
                {posting ? '…' : 'Post'}
              </button>
            </form>
          </div>
        )}

        {tab === 'history' && (
          <div>
            {(task.statusHistory||[]).length === 0 ? (
              <p style={{ color:'#64748b', fontSize:14 }}>No status changes recorded yet.</p>
            ) : (
              <div className="activity-feed">
                {[...(task.statusHistory||[])].reverse().map((h,i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-dot" />
                    <div className="activity-content">
                      <strong>{h.changedByName || 'System'}</strong> changed status{' '}
                      <span style={{ color:'#64748b' }}>{h.fromStatus?.replace('_',' ') || '—'}</span>
                      {' → '}
                      <span style={{ fontWeight:600, color: SCOLOR[h.toStatus] || '#64748b' }}>{h.toStatus?.replace('_',' ')}</span>
                      {h.remark && <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>"{h.remark}"</div>}
                      <div className="activity-time">
                        {new Date(h.changedAt).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:500 }}>{value}</div>
    </div>
  );
}
