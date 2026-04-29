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

const STATUSES    = ['not_started','todo','under_discussion','in_progress','testing','on_hold','completed','cancelled'];
const PRIORITIES  = ['critical','high','medium','low'];
const DEPARTMENTS = ['marketing','content','sales','product','it'];
const PRODUCTS    = ['wallpaper','wallart','p2f','entire-website'];
const PCOLOR = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };
const SCOLOR = {
  not_started:'#94a3b8', todo:'#64748b', under_discussion:'#0ea5e9',
  in_progress:'#f59e0b', testing:'#8b5cf6', on_hold:'#94a3b8',
  completed:'#10b981', cancelled:'#ef4444',
};
const PRODUCT_LABELS = { wallpaper:'Wallpaper', wallart:'Wallart', p2f:'P2F', 'entire-website':'Entire Website' };
const TASK_ASSIGNED_BY = 'Kunal';
const LIMIT = 20;

export default function MyTasks() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  const canEdit = isAdmin;

  const [tasks,    setTasks]    = useState([]);
  const [pending,  setPending]  = useState([]);
  const [projects, setProjects] = useState([]);
  const [allTags,  setAllTags]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [sort,     setSort]     = useState('-createdAt');
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState([]);
  const [modal,    setModal]    = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const [filters, setFilters] = useState({
    search:     searchParams.get('search')     || '',
    status:     searchParams.get('status')     || '',
    priority:   searchParams.get('priority')   || '',
    department: searchParams.get('department') || '',
    product:    searchParams.get('product')    || '',
    project:    searchParams.get('project')    || '',
    tag:        searchParams.get('tag')        || '',
    overdue:    searchParams.get('overdue')    === 'true',
    dueToday:   searchParams.get('dueToday')   === 'true',
    dueAfter:   searchParams.get('dueAfter')   || '',
    dueBefore:  searchParams.get('dueBefore')  || '',
  });

  const buildQS = useCallback((f, p, s) => {
    const q = new URLSearchParams();
    if (f.search)     q.set('search',     f.search);
    if (f.status)     q.set('status',     f.status);
    if (f.priority)   q.set('priority',   f.priority);
    if (f.department) q.set('department', f.department);
    if (f.product)    q.set('product',    f.product);
    if (f.project)    q.set('project',    f.project);
    if (f.tag)        q.set('tag',        f.tag);
    if (f.overdue)    q.set('overdue',    'true');
    if (f.dueToday)   q.set('dueToday',   'true');
    if (f.dueAfter)   q.set('dueAfter',   f.dueAfter);
    if (f.dueBefore)  q.set('dueBefore',  f.dueBefore);
    // Scope to tasks assigned to me. Backend already auto-scopes
    // developer/product roles, but admin needs an explicit filter.
    if (user?.id) q.set('assignedTo', user.id);
    q.set('page', p); q.set('limit', LIMIT); q.set('sort', s);
    return q.toString();
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true); setSelected([]);
    const reqs = [api('/api/admin/tasks?' + buildQS(filters, page, sort))];
    if (isAdmin) reqs.push(api('/api/admin/tasks/pending-approval'));
    const [listRes, pendRes] = await Promise.all(reqs);
    if (listRes.success) { setTasks(listRes.data); setTotal(listRes.pagination?.total || 0); }
    if (pendRes && pendRes.success) setPending(pendRes.data || []);
    setLoading(false);
  }, [filters, page, sort, buildQS, isAdmin]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      api('/api/admin/tasks/projects'),
      api('/api/admin/tasks/tags'),
    ]).then(([pRes, tRes]) => {
      if (pRes.success) setProjects(pRes.data || []);
      if (tRes.success) setAllTags(tRes.data || []);
    });
  }, []);

  function setFilter(field, value) { setFilters(f => ({ ...f, [field]: value })); setPage(1); }
  function clearFilters() {
    setFilters({ search:'', status:'', priority:'', department:'', product:'', project:'', tag:'', overdue:false, dueToday:false, dueAfter:'', dueBefore:'' });
    setPage(1);
  }

  const hasFilters = Object.entries(filters).some(([, v]) => v === true || (v && v !== ''));

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
          <h2>My Tasks</h2>
          <p className="text-muted">
            {loading ? 'Loading…' : `${total} task${total!==1?'s':''} assigned${hasFilters?' (filtered)':''}`}
            {isAdmin && pending.length > 0 && ` · ${pending.length} pending approval`}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={load} title="Refresh">↻</button>
          <button className="btn btn-secondary" onClick={exportCSV}>⬇ CSV</button>
          {canEdit && <button className="btn btn-primary" onClick={() => setModal('new')}>+ New Task</button>}
        </div>
      </div>

      {/* Pending approval (admin only) */}
      {isAdmin && pending.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={{ width:10,height:10,borderRadius:'50%',background:'#f59e0b',display:'inline-block' }} />
            <h3 style={{ margin:0, fontSize:15 }}>Pending Approval</h3>
            <span style={{ fontSize:12,color:'var(--muted)' }}>{pending.length}</span>
            <span style={{ fontSize:11, color:'#92400e', background:'#fef3c7', padding:'2px 8px', borderRadius:10, marginLeft:6 }}>
              Submitted by department users — review &amp; assign to publish
            </span>
          </div>
          {pending.map(t => (
            <div key={t._id} className="card"
              style={{ padding:'14px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:12,
                       borderLeft:'3px solid #f59e0b', background:'#fffbeb' }}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:11,color:'var(--muted)' }}>{t.taskId}</span>
                  <span className="priority-badge" style={{ background:PCOLOR[t.priority]+'20', color:PCOLOR[t.priority] }}>{t.priority}</span>
                  {t.department && (
                    <span style={{ fontSize:11, color:'var(--muted)', textTransform:'capitalize' }}>· {t.department}</span>
                  )}
                </div>
                <div style={{ fontWeight:500, cursor:'pointer' }} onClick={() => setEditingTaskId(t._id)}>{t.title}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
                  Submitted by {t.createdByName || '—'} · {new Date(t.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setEditingTaskId(t._id)}>
                Review &amp; Assign
              </button>
            </div>
          ))}
        </div>
      )}

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
        <select className="input-sm" value={filters.department} onChange={e => setFilter('department', e.target.value)} style={{ textTransform:'capitalize' }}>
          <option value="">All departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input-sm" value={filters.product} onChange={e => setFilter('product', e.target.value)}>
          <option value="">All products</option>
          {PRODUCTS.map(p => <option key={p} value={p}>{PRODUCT_LABELS[p] || p}</option>)}
        </select>
        <input className="input-sm" placeholder="Project…" value={filters.project}
          onChange={e => setFilter('project', e.target.value)} style={{ width:100 }}
          list="my-task-project-list" />
        <datalist id="my-task-project-list">
          {projects.map(p => <option key={p} value={p} />)}
        </datalist>
        <input className="input-sm" placeholder="Tag…" value={filters.tag}
          onChange={e => setFilter('tag', e.target.value)} style={{ width:80 }}
          list="my-task-tag-list" />
        <datalist id="my-task-tag-list">
          {allTags.map(t => <option key={t} value={t} />)}
        </datalist>
        <label className="input-sm" style={{ display:'flex', alignItems:'center', gap:4, padding:'0 8px', cursor:'pointer' }}>
          <input type="checkbox" checked={filters.overdue} onChange={e => setFilter('overdue', e.target.checked)} />
          Overdue
        </label>
        <label className="input-sm" style={{ display:'flex', alignItems:'center', gap:4, padding:'0 8px', cursor:'pointer' }}>
          <input type="checkbox" checked={filters.dueToday} onChange={e => setFilter('dueToday', e.target.checked)} />
          Due today
        </label>
        <label className="input-sm" style={{ display:'flex', alignItems:'center', gap:4, padding:'0 8px' }} title="Deadline on or after">
          From
          <input type="date" value={filters.dueAfter} onChange={e => setFilter('dueAfter', e.target.value)} style={{ border:'none', padding:0, fontSize:12 }} />
        </label>
        <label className="input-sm" style={{ display:'flex', alignItems:'center', gap:4, padding:'0 8px' }} title="Deadline on or before">
          To
          <input type="date" value={filters.dueBefore} onChange={e => setFilter('dueBefore', e.target.value)} style={{ border:'none', padding:0, fontSize:12 }} />
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
            icon={hasFilters ? '🔍' : '🎉'}
            title={hasFilters ? 'No tasks match your filters' : "You're all caught up!"}
            message={hasFilters ? 'Try adjusting or clearing your filters.' : 'No tasks are currently assigned to you.'}
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
                <th>Department</th>
                <th>Product</th>
                <SortTh col="priority">Priority</SortTh>
                <SortTh col="status">Status</SortTh>
                <SortTh col="dueDate">Deadline Date</SortTh>
                <SortTh col="createdAt">Created Date</SortTh>
                <th>Task Assigned By</th>
                <th>Task Assigned To</th>
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
                    <td style={{ fontSize:12, whiteSpace:'nowrap', color:'var(--muted)', textTransform:'capitalize' }}>
                      {t.department || '—'}
                    </td>
                    <td style={{ fontSize:12, whiteSpace:'nowrap', color:'var(--muted)' }}>
                      {t.product ? (PRODUCT_LABELS[t.product] || t.product) : '—'}
                    </td>
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
                    <td style={{ fontSize:12, whiteSpace:'nowrap', color:'var(--muted)' }}>
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—'}
                    </td>
                    <td style={{ fontSize:12, whiteSpace:'nowrap', color:'var(--muted)' }}>
                      {TASK_ASSIGNED_BY}
                    </td>
                    <td style={{ fontSize:12 }}>
                      {(t.assignedTo||[]).length === 0 ? (
                        <span style={{ color:'var(--muted)' }}>—</span>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          {t.assignedTo.map(a => (
                            <div key={a.userId} style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div className="user-avatar" style={{ width:20,height:20,fontSize:10,flexShrink:0 }}>
                                {(a.name||'U').slice(0,1).toUpperCase()}
                              </div>
                              <span style={{ whiteSpace:'nowrap' }}>{a.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
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

      {/* New task modal */}
      {modal === 'new' && (
        <Modal title="New Task" onClose={() => setModal(null)} wide>
          <TaskForm onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
        </Modal>
      )}

      {/* Edit task modal */}
      {editingTaskId && (
        <Modal title="Modify Task" onClose={() => setEditingTaskId(null)} wide>
          <TaskForm
            taskId={editingTaskId}
            onClose={() => setEditingTaskId(null)}
            onSaved={() => { setEditingTaskId(null); load(); }}
          />
        </Modal>
      )}

      {/* Task detail drawer */}
      {modal && modal !== 'new' && (
        <div className="drawer-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="drawer">
            <button className="drawer-close" onClick={() => setModal(null)}>✕</button>
            <TaskDetail
              taskId={modal}
              onClose={() => setModal(null)}
              onUpdated={load}
              onEdit={(id) => { setModal(null); setEditingTaskId(id); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
