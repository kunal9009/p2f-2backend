import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, getToken } from '../api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
import TaskDetail from '../components/TaskDetail';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUSES   = ['todo','in_progress','testing','on_hold','completed','cancelled'];
const PRIORITIES = ['critical','high','medium','low'];
const PCOLOR     = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };
const SCOLOR     = { todo:'#64748b', in_progress:'#f59e0b', testing:'#8b5cf6', on_hold:'#94a3b8', completed:'#10b981', cancelled:'#ef4444' };

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { toast } = useToast();
  const [tasks,    setTasks]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState([]);
  const [modal,    setModal]    = useState(null); // null | 'new' | taskId string
  const [confirm,  setConfirm]  = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search:    searchParams.get('search')   || '',
    status:    searchParams.get('status')   || '',
    priority:  searchParams.get('priority') || '',
    project:   searchParams.get('project')  || '',
    tag:       searchParams.get('tag')      || '',
    overdue:   searchParams.get('overdue')  === 'true',
    dueToday:  searchParams.get('dueToday') === 'true',
  });

  const LIMIT = 20;

  const buildQS = (f, p) => {
    const q = new URLSearchParams();
    if (f.search)   q.set('search', f.search);
    if (f.status)   q.set('status', f.status);
    if (f.priority) q.set('priority', f.priority);
    if (f.project)  q.set('project', f.project);
    if (f.tag)      q.set('tag', f.tag);
    if (f.overdue)  q.set('overdue', 'true');
    if (f.dueToday) q.set('dueToday', 'true');
    q.set('page', p); q.set('limit', LIMIT);
    return q.toString();
  };

  const load = useCallback(async () => {
    setLoading(true); setSelected([]);
    const res = await api('/api/admin/tasks?' + buildQS(filters, page));
    if (res.success) { setTasks(res.data); setTotal(res.pagination?.total || 0); }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  // Open task from URL param
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setModal(id);
    if (searchParams.get('new') === '1') setModal('new');
  }, []);

  function setFilter(field, value) {
    setFilters(f => ({ ...f, [field]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ search:'', status:'', priority:'', project:'', overdue:false, dueToday:false });
    setPage(1);
  }

  const hasFilters = filters.search || filters.status || filters.priority || filters.project || filters.tag || filters.overdue || filters.dueToday;

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
        toast(`${selected.length} tasks deleted`, 'info');
        setSelected([]); load();
      },
    });
  }

  async function bulkStatus(status) {
    await Promise.all(selected.map(id => api('/api/admin/tasks/' + id + '/status', 'PATCH', { status })));
    toast(`${selected.length} tasks updated to "${status.replace('_',' ')}"`, 'success');
    setSelected([]); load();
  }

  function toggleSelect(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function toggleAll() {
    setSelected(s => s.length === tasks.length ? [] : tasks.map(t => t._id));
  }

  function exportCSV() {
    const qs = buildQS(filters, 1).replace(`page=1&limit=${LIMIT}`, 'limit=1000');
    window.open('/api/admin/tasks/export?' + qs + '&token=' + getToken());
  }

  const pages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>All Tasks</h2>
          <p className="text-muted">{total} task{total !== 1 ? 's' : ''} total</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={exportCSV}>⬇ Export CSV</button>
          <button className="btn btn-primary" onClick={() => setModal('new')}>+ New Task</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input className="input-sm" placeholder="Search…" value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') load(); }}
          style={{ flex:1, minWidth:140 }} />
        <select className="input-sm" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select className="input-sm" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input className="input-sm" placeholder="Project…" value={filters.project}
          onChange={e => setFilter('project', e.target.value)} style={{ width:110 }} />
        <input className="input-sm" placeholder="Tag…" value={filters.tag}
          onChange={e => setFilter('tag', e.target.value)} style={{ width:90 }} />
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

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="bulk-bar">
          <span>{selected.length} selected</span>
          {STATUSES.map(s => (
            <button key={s} className="btn btn-secondary btn-sm" onClick={() => bulkStatus(s)}>
              → {s.replace('_',' ')}
            </button>
          ))}
          <button className="btn btn-sm" style={{ background:'#ef4444', color:'#fff' }} onClick={bulkDelete}>
            🗑 Delete
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelected([])}>Cancel</button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'auto' }}>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'#64748b' }}>Loading…</div>
        ) : tasks.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'#64748b' }}>No tasks found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selected.length === tasks.length} onChange={toggleAll} /></th>
                <th>ID</th><th>Title</th><th>Project</th><th>Priority</th><th>Status</th><th>Due</th><th>Assignees</th><th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t._id} className={selected.includes(t._id) ? 'row-selected' : ''}>
                  <td><input type="checkbox" checked={selected.includes(t._id)} onChange={() => toggleSelect(t._id)} /></td>
                  <td className="task-id-cell" onClick={() => setModal(t._id)} style={{ cursor:'pointer' }}>{t.taskId}</td>
                  <td onClick={() => setModal(t._id)} style={{ cursor:'pointer', fontWeight:500 }}>{t.title}</td>
                  <td style={{ color:'#64748b', fontSize:13 }}>{t.project || '—'}</td>
                  <td>
                    <span className="priority-badge" style={{ background: PCOLOR[t.priority]+'20', color: PCOLOR[t.priority] }}>
                      {t.priority}
                    </span>
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={t.status}
                      style={{ color: SCOLOR[t.status] }}
                      onChange={e => changeStatus(t._id, e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize:13, color: t.dueDate && new Date(t.dueDate) < new Date() ? '#ef4444' : '#64748b' }}>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:2 }}>
                      {(t.assignedTo||[]).slice(0,3).map(a => (
                        <div key={a.userId} className="user-avatar" style={{ width:22,height:22,fontSize:10 }} title={a.name}>
                          {a.name.slice(0,1).toUpperCase()}
                        </div>
                      ))}
                      {(t.assignedTo||[]).length > 3 && <span style={{ fontSize:11,color:'#64748b' }}>+{t.assignedTo.length-3}</span>}
                    </div>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => deleteTask(t._id)} title="Delete">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</button>
          <span style={{ fontSize:13, color:'#64748b' }}>Page {page} of {pages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === pages} onClick={() => setPage(p => p+1)}>Next →</button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel="Delete"
          danger
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
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
