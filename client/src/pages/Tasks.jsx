import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getToken } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
import TaskDetail from '../components/TaskDetail';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const STATUSES   = ['todo','in_progress','testing','on_hold','completed','cancelled'];
const PRIORITIES = ['critical','high','medium','low'];
const PCOLOR = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };
const SCOLOR = { todo:'#64748b', in_progress:'#f59e0b', testing:'#8b5cf6', on_hold:'#94a3b8', completed:'#10b981', cancelled:'#ef4444' };
const LIMIT = 20;

/* Sort helper */
const SORT_COLS = {
  taskId:    'taskId',
  title:     'title',
  priority:  'priority',
  status:    'status',
  dueDate:   'dueDate',
  createdAt: 'createdAt',
};

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  // Only admin can create / edit / change status / delete tasks. All other
  // roles (warehouse + dept roles) are view-only.
  const canEdit = isAdmin;

  const [tasks,    setTasks]    = useState([]);
  const [users,    setUsers]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [allTags,  setAllTags]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [sort,     setSort]     = useState('-createdAt');
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState([]);
  const [modal,    setModal]    = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignUser, setBulkAssignUser] = useState('');

  const [filters, setFilters] = useState({
    search:     searchParams.get('search')     || '',
    status:     searchParams.get('status')     || '',
    priority:   searchParams.get('priority')   || '',
    project:    searchParams.get('project')    || '',
    tag:        searchParams.get('tag')        || '',
    assignedTo: searchParams.get('assignedTo') || '',
    overdue:    searchParams.get('overdue')    === 'true',
    dueToday:   searchParams.get('dueToday')   === 'true',
  });

  const buildQS = useCallback((f, p, s) => {
    const q = new URLSearchParams();
    if (f.search)     q.set('search',     f.search);
    if (f.status)     q.set('status',     f.status);
    if (f.priority)   q.set('priority',   f.priority);
    if (f.project)    q.set('project',    f.project);
    if (f.tag)        q.set('tag',        f.tag);
    if (f.assignedTo) q.set('assignedTo', f.assignedTo);
    if (f.overdue)    q.set('overdue',    'true');
    if (f.dueToday)   q.set('dueToday',   'true');
    q.set('page', p); q.set('limit', LIMIT); q.set('sort', s);
    return q.toString();
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setSelected([]);
    const res = await api('/api/admin/tasks?' + buildQS(filters, page, sort));
    if (res.success) { setTasks(res.data); setTotal(res.pagination?.total || 0); }
    setLoading(false);
  }, [filters, page, sort, buildQS]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      api('/api/admin/users'),
      api('/api/admin/tasks/projects'),
      api('/api/admin/tasks/tags'),
    ]).then(([uRes, pRes, tRes]) => {
      if (uRes.success) setUsers(uRes.data || uRes.users || []);
      if (pRes.success) setProjects(pRes.data || []);
      if (tRes.success) setAllTags(tRes.data || []);
    });
  }, []);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setModal(id);
    if (searchParams.get('new') === '1') setModal('new');
  }, []);

  function setFilter(field, value) { setFilters(f => ({ ...f, [field]: value })); setPage(1); }
  function clearFilters() {
    setFilters({ search:'', status:'', priority:'', project:'', tag:'', assignedTo:'', overdue:false, dueToday:false });
    setPage(1);
  }

  const hasFilters = Object.entries(filters).some(([k, v]) => v === true || (v && v !== ''));

  /* Sort toggle: click same col → flip direction; click new col → desc first */
  function toggleSort(col) {
    setSort(s => {
      const cur = s.replace('-','');
      if (cur === col) return s.startsWith('-') ? col : '-' + col;
      return '-' + col;
    });
    setPage(1);
  }

  function sortIcon(col) {
    const cur = sort.replace('-','');
    if (cur !== col) return <span style={{ color:'var(--border)', marginLeft:4 }}>↕</span>;
    return <span style={{ color:'var(--accent)', marginLeft:4 }}>{sort.startsWith('-') ? '↓' : '↑'}</span>;
  }

  async function changePriority(id, newPriority) {
    const res = await api('/api/admin/tasks/' + id, 'PUT', { priority: newPriority });
    if (res.success) { toast('Priority updated', 'success'); load(); }
    else toast(res.message || 'Update failed', 'error');
  }

  async function changeStatus(id, newStatus) {
    const res = await api('/api/admin/tasks/' + id + '/status', 'PATCH', { status: newStatus });
    if (res.success) { toast('Status updated', 'success'); load(); }
    else toast(res.message || 'Update failed', 'error');
  }

  function deleteTask(id) {
    setConfirm({
      message: 'Delete this task? This cannot be undone.',
      onConfirm: async () => {
        setConfirm(null);
        const res = await api('/api/admin/tasks/' + id, 'DELETE');
        if (res.success) { toast('Task deleted', 'info'); load(); }
        else toast(res.message || 'Delete failed', 'error');
      },
    });
  }

  function bulkDelete() {
    setConfirm({
      message: `Permanently delete ${selected.length} task${selected.length>1?'s':''}?`,
      onConfirm: async () => {
        setConfirm(null);
        await Promise.all(selected.map(id => api('/api/admin/tasks/' + id, 'DELETE')));
        toast(`${selected.length} task${selected.length>1?'s':''} deleted`, 'info');
        setSelected([]); load();
      },
    });
  }

  async function bulkStatus(status) {
    await Promise.all(selected.map(id => api('/api/admin/tasks/' + id + '/status', 'PATCH', { status })));
    toast(`${selected.length} tasks → "${status.replace('_',' ')}"`, 'success');
    setSelected([]); load();
  }

  async function doBulkAssign() {
    if (!bulkAssignUser) return;
    const u = users.find(x => (x._id||x.id) === bulkAssignUser);
    if (!u) return;
    await Promise.all(selected.map(id =>
      api('/api/admin/tasks/' + id, 'PUT', {
        assignedTo: [{ userId: u._id||u.id, name: u.name, email: u.email }],
      })
    ));
    toast(`${selected.length} tasks assigned to ${u.name}`, 'success');
    setBulkAssignOpen(false); setBulkAssignUser(''); setSelected([]); load();
  }

  function toggleSelect(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function toggleAll() {
    setSelected(s => s.length === tasks.length ? [] : tasks.map(t => t._id));
  }

  function exportCSV() {
    const qs = buildQS(filters, 1, sort).replace(`page=1&limit=${LIMIT}`, 'limit=5000');
    window.open('/api/admin/tasks/export?' + qs + '&token=' + getToken());
  }

  const pages    = Math.ceil(total / LIMIT);
  const fromItem = Math.min((page - 1) * LIMIT + 1, total);
  const toItem   = Math.min(page * LIMIT, total);

  /* Sortable TH */
  function SortTh({ col, children, style }) {
    return (
      <th
        onClick={() => toggleSort(col)}
        style={{ cursor:'pointer', userSelect:'none', whiteSpace:'nowrap', ...style }}
      >
        {children}{sortIcon(col)}
      </th>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>All Tasks</h2>
          <p className="text-muted">
            {loading ? 'Loading…' : `${total} task${total!==1?'s':''} total${hasFilters?' (filtered)':''}`}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={load} title="Refresh">↻</button>
          <button className="btn btn-secondary" onClick={exportCSV}>⬇ CSV</button>
          {canEdit && <button className="btn btn-primary" onClick={() => setModal('new')}>+ New Task</button>}
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input className="input-sm" placeholder="Search…" value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') load(); }}
          style={{ flex:1, minWidth:120 }} />
        <select className="input-sm" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select className="input-sm" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input className="input-sm" placeholder="Project…" value={filters.project}
          onChange={e => setFilter('project', e.target.value)} style={{ width:100 }}
          list="task-project-list" />
        <datalist id="task-project-list">
          {projects.map(p => <option key={p} value={p} />)}
        </datalist>
        <input className="input-sm" placeholder="Tag…" value={filters.tag}
          onChange={e => setFilter('tag', e.target.value)} style={{ width:80 }}
          list="task-tag-list" />
        <datalist id="task-tag-list">
          {allTags.map(t => <option key={t} value={t} />)}
        </datalist>
        <select className="input-sm" value={filters.assignedTo} onChange={e => setFilter('assignedTo', e.target.value)} style={{ width:130 }}>
          <option value="">All members</option>
          {users.map(u => <option key={u._id||u.id} value={u._id||u.id}>{u.name}</option>)}
        </select>
        <label className="input-sm" style={{ display:'flex', alignItems:'center', gap:4, padding:'0 8px', cursor:'pointer' }}>
          <input type="checkbox" checked={filters.overdue} onChange={e => setFilter('overdue', e.target.checked)} />
          Overdue
        </label>
        <label className="input-sm" style={{ display:'flex', alignItems:'center', gap:4, padding:'0 8px', cursor:'pointer' }}>
          <input type="checkbox" checked={filters.dueToday} onChange={e => setFilter('dueToday', e.target.checked)} />
          Due today
        </label>
        {hasFilters && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>✕ Clear</button>}
      </div>

      {/* Bulk action bar */}
      {canEdit && selected.length > 0 && (
        <div className="bulk-bar">
          <span style={{ fontWeight:600 }}>{selected.length} selected</span>
          <span style={{ color:'var(--muted)', fontSize:12 }}>Status →</span>
          {STATUSES.map(s => (
            <button key={s} className="btn btn-secondary btn-sm" onClick={() => bulkStatus(s)}>
              {s.replace('_',' ')}
            </button>
          ))}
          <span style={{ color:'var(--muted)', fontSize:12 }}>|</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setBulkAssignOpen(true)}>👤 Assign</button>
          <button className="btn btn-sm" style={{ background:'#ef4444', color:'#fff' }} onClick={bulkDelete}>🗑 Delete</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelected([])}>✕</button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'auto' }}>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>Loading…</div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={hasFilters ? '🔍' : '📋'}
            title={hasFilters ? 'No tasks match your filters' : 'No tasks yet'}
            message={hasFilters ? 'Try adjusting or clearing your filters.' : 'Create your first task to get started.'}
            action={!hasFilters && canEdit && <button className="btn btn-primary" onClick={() => setModal('new')}>+ Create Task</button>}
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {canEdit && (
                  <th style={{ width:32 }}>
                    <input type="checkbox" checked={selected.length === tasks.length && tasks.length > 0} onChange={toggleAll} />
                  </th>
                )}
                <SortTh col="taskId">ID</SortTh>
                <SortTh col="title">Title</SortTh>
                <th>Project</th>
                <SortTh col="priority">Priority</SortTh>
                <SortTh col="status">Status</SortTh>
                <SortTh col="dueDate">Due</SortTh>
                <th>Assignees</th>
                <th style={{ width:32 }}></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => {
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && !['completed','cancelled'].includes(t.status);
                return (
                  <tr key={t._id} className={selected.includes(t._id) ? 'row-selected' : ''}>
                    {canEdit && (
                      <td><input type="checkbox" checked={selected.includes(t._id)} onChange={() => toggleSelect(t._id)} /></td>
                    )}
                    <td style={{ fontFamily:'monospace', fontSize:12, color:'var(--muted)', cursor:'pointer', whiteSpace:'nowrap' }} onClick={() => setModal(t._id)}>{t.taskId}</td>
                    <td style={{ cursor:'pointer', fontWeight:500, maxWidth:240 }} onClick={() => setModal(t._id)}>
                      <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                      {(t.tags||[]).length > 0 && (
                        <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:2 }}>
                          {t.tags.slice(0,3).map(tag => <span key={tag} className="tag-inline">{tag}</span>)}
                        </div>
                      )}
                    </td>
                    <td style={{ color:'var(--muted)', fontSize:13, whiteSpace:'nowrap' }}>{t.project || '—'}</td>
                    <td>
                      {canEdit ? (
                        <select
                          className="status-select"
                          value={t.priority}
                          style={{ color:PCOLOR[t.priority], fontWeight:600, fontSize:12 }}
                          onChange={e => { e.stopPropagation(); changePriority(t._id, e.target.value); }}
                          onClick={e => e.stopPropagation()}
                        >
                          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      ) : (
                        <span style={{ color:PCOLOR[t.priority], fontWeight:600, fontSize:12 }}>{t.priority}</span>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <select
                          className="status-select"
                          value={t.status}
                          style={{ color:SCOLOR[t.status], fontWeight:600, fontSize:12 }}
                          onChange={e => { e.stopPropagation(); changeStatus(t._id, e.target.value); }}
                          onClick={e => e.stopPropagation()}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                        </select>
                      ) : (
                        <span style={{ color:SCOLOR[t.status], fontWeight:600, fontSize:12 }}>{t.status.replace('_',' ')}</span>
                      )}
                    </td>
                    <td style={{ fontSize:12, whiteSpace:'nowrap', color: isOverdue ? '#ef4444' : 'var(--muted)' }}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—'}
                      {isOverdue && <span style={{ marginLeft:4 }}>⚠️</span>}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:2 }}>
                        {(t.assignedTo||[]).slice(0,3).map(a => (
                          <div key={a.userId} className="user-avatar" style={{ width:22,height:22,fontSize:10 }} title={a.name}>
                            {(a.name||'U').slice(0,1).toUpperCase()}
                          </div>
                        ))}
                        {(t.assignedTo||[]).length > 3 && <span style={{ fontSize:11,color:'var(--muted)' }}>+{t.assignedTo.length-3}</span>}
                      </div>
                    </td>
                    <td>
                      {canEdit && (
                        <button className="btn-icon" onClick={e => { e.stopPropagation(); deleteTask(t._id); }} title="Delete">🗑</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="pagination">
          <span style={{ fontSize:12, color:'var(--muted)' }}>
            {fromItem}–{toItem} of {total} task{total!==1?'s':''}
          </span>
          <div style={{ display:'flex', gap:4 }}>
            <button className="btn btn-secondary btn-sm" disabled={page===1}     onClick={() => setPage(1)}>«</button>
            <button className="btn btn-secondary btn-sm" disabled={page===1}     onClick={() => setPage(p=>p-1)}>‹ Prev</button>
            <span style={{ fontSize:13, color:'var(--muted)', padding:'0 8px', lineHeight:'30px' }}>
              {page} / {pages || 1}
            </span>
            <button className="btn btn-secondary btn-sm" disabled={page>=pages}  onClick={() => setPage(p=>p+1)}>Next ›</button>
            <button className="btn btn-secondary btn-sm" disabled={page>=pages}  onClick={() => setPage(pages)}>»</button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message} confirmLabel="Delete" danger
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}
        />
      )}

      {/* Bulk assign modal */}
      {bulkAssignOpen && (
        <Modal title={`Assign ${selected.length} tasks`} onClose={() => setBulkAssignOpen(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <p style={{ fontSize:13, color:'var(--muted)', margin:0 }}>
              Select a team member to assign the selected tasks to.
            </p>
            <select
              className="input-sm"
              value={bulkAssignUser}
              onChange={e => setBulkAssignUser(e.target.value)}
              style={{ fontSize:14, padding:'8px 12px' }}
            >
              <option value="">— Select member —</option>
              {users.map(u => <option key={u._id||u.id} value={u._id||u.id}>{u.name} ({u.role})</option>)}
            </select>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setBulkAssignOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!bulkAssignUser} onClick={doBulkAssign}>Assign</button>
            </div>
          </div>
        </Modal>
      )}

      {/* New task modal */}
      {modal === 'new' && (
        <Modal title="New Task" onClose={() => setModal(null)} wide>
          <TaskForm onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
        </Modal>
      )}

      {/* Task detail drawer */}
      {modal && modal !== 'new' && (
        <div className="drawer-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="drawer">
            <button className="drawer-close" onClick={() => setModal(null)}>✕</button>
            <TaskDetail taskId={modal} onClose={() => setModal(null)} onUpdated={load} />
          </div>
        </div>
      )}
    </div>
  );
}
