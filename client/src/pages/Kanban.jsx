import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
import TaskDetail from '../components/TaskDetail';
import EmptyState from '../components/EmptyState';

const COLS = [
  { status: 'todo',        label: 'To Do',       color: '#64748b' },
  { status: 'in_progress', label: 'In Progress',  color: '#f59e0b' },
  { status: 'testing',     label: 'Testing',      color: '#8b5cf6' },
  { status: 'on_hold',     label: 'On Hold',      color: 'var(--muted)' },
  { status: 'completed',   label: 'Completed',    color: '#10b981' },
  { status: 'cancelled',   label: 'Cancelled',    color: '#ef4444' },
];

const PRIORITY_COLOR = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };

export default function Kanban() {
  const { hasSection } = useAuth();
  const canAddTask = hasSection('add-task');
  const [columns,      setColumns]      = useState({});
  const [loading,      setLoading]      = useState(true);
  const [projectFilter,setProjectFilter]= useState('');
  const [modal,        setModal]        = useState(null); // { type:'new'|'edit', taskId, status }
  const [quickAdd,     setQuickAdd]     = useState({}); // { [status]: text }
  const [saving,       setSaving]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api('/api/admin/tasks/kanban' + (projectFilter ? '?project=' + encodeURIComponent(projectFilter) : ''));
    if (res.success) {
      const map = {};
      (res.data || []).forEach(col => { map[col.status] = col.tasks; });
      setColumns(map);
    }
    setLoading(false);
  }, [projectFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusDrop(taskId, newStatus) {
    await api('/api/admin/tasks/' + taskId + '/status', 'PATCH', { status: newStatus });
    load();
  }

  async function handleQuickAdd(status) {
    const title = (quickAdd[status] || '').trim();
    if (!title) return;
    setSaving(status);
    const res = await api('/api/admin/tasks', 'POST', { title, status });
    if (res.success) { setQuickAdd(q => ({...q, [status]: ''})); load(); }
    setSaving('');
  }

  function onDragStart(e, taskId) { e.dataTransfer.setData('taskId', taskId); }
  function onDragOver(e)          { e.preventDefault(); }
  function onDrop(e, status)      { handleStatusDrop(e.dataTransfer.getData('taskId'), status); }

  return (
    <div>
      <div className="page-header">
        <div><h2>Kanban Board</h2><p className="text-muted">Drag cards between columns</p></div>
        <div style={{ display:'flex', gap:8 }}>
          <input
            className="input-sm"
            placeholder="Filter by project…"
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            style={{ width: 180 }}
          />
          {canAddTask && <button className="btn btn-primary" onClick={() => setModal({ type:'new', status:'todo' })}>+ New Task</button>}
        </div>
      </div>

      {loading ? (
        <div className="kanban-board">{COLS.map(c => <div key={c.status} className="kanban-col"><div className="kanban-col-title">{c.label}</div><div className="skel" style={{height:80,borderRadius:8,margin:'8px 0'}} /></div>)}</div>
      ) : (
        <div className="kanban-board">
          {COLS.map(col => (
            <div
              key={col.status}
              className="kanban-col"
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, col.status)}
            >
              <div className="kanban-col-title">
                <span style={{ color: col.color }}>●</span> {col.label}
                <span className="kanban-col-count">{(columns[col.status] || []).length}</span>
              </div>

              <div className="kanban-col-body">
                {(columns[col.status] || []).length === 0 && (
                  <div style={{ padding:'16px 0', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
                    Drop tasks here
                  </div>
                )}
                {(columns[col.status] || []).map(task => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['completed','cancelled'].includes(task.status);
                  return (
                  <div
                    key={task._id}
                    className="kanban-card"
                    draggable
                    onDragStart={e => onDragStart(e, task._id)}
                    onClick={() => setModal({ type:'edit', taskId: task._id })}
                  >
                    <div className="kanban-card-id">{task.taskId}</div>
                    <div className="kanban-card-title">{task.title}</div>
                    {task.project && <div className="kanban-card-project">📁 {task.project}</div>}
                    <div className="kanban-card-footer">
                      <span style={{ background: PRIORITY_COLOR[task.priority]+'20', color: PRIORITY_COLOR[task.priority], fontSize:10, padding:'2px 6px', borderRadius:4, fontWeight:600 }}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span style={{ fontSize:11, color: isOverdue ? '#ef4444' : '#64748b', fontWeight: isOverdue ? 600 : 400 }}>
                          {isOverdue ? '⚠️ ' : '📅 '}{new Date(task.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                        </span>
                      )}
                      {(task.assignedTo||[]).length > 0 && (
                        <div style={{ marginLeft:'auto', display:'flex', gap:2 }}>
                          {task.assignedTo.slice(0,3).map(a => (
                            <div key={a.userId} className="user-avatar" style={{ width:20,height:20,fontSize:9 }} title={a.name}>
                              {a.name.slice(0,1).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Quick-add */}
              <div className="quick-add">
                <input
                  className="quick-add-input"
                  placeholder="+ Quick add…"
                  value={quickAdd[col.status] || ''}
                  onChange={e => setQuickAdd(q => ({...q, [col.status]: e.target.value}))}
                  onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(col.status); }}
                />
                <button
                  className="quick-add-btn"
                  onClick={() => handleQuickAdd(col.status)}
                  disabled={saving === col.status}
                >
                  {saving === col.status ? '…' : '➕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New task modal */}
      {modal?.type === 'new' && (
        <Modal title="New Task" onClose={() => setModal(null)} wide>
          <TaskForm
            defaultStatus={modal.status}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); load(); }}
          />
        </Modal>
      )}

      {/* Task detail drawer */}
      {modal?.type === 'edit' && (
        <div className="drawer-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="drawer">
            <button className="drawer-close" onClick={() => setModal(null)}>✕</button>
            <TaskDetail taskId={modal.taskId} onClose={() => setModal(null)} onUpdated={load} />
          </div>
        </div>
      )}
    </div>
  );
}
