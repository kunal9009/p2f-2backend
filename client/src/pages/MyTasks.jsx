import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';

const STATUS_ORDER = ['in_progress','todo','testing','on_hold','completed','cancelled'];
const SCOLOR = { todo:'#64748b', in_progress:'#f59e0b', testing:'#8b5cf6', on_hold:'#94a3b8', completed:'#10b981', cancelled:'#ef4444' };
const PCOLOR = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };

export default function MyTasks() {
  const [groups,  setGroups]  = useState({});
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await api('/api/admin/tasks/my');
    if (res.success) {
      const g = {};
      STATUS_ORDER.forEach(s => { g[s] = []; });
      res.data.forEach(t => { (g[t.status] = g[t.status] || []).push(t); });
      setGroups(g);
    }
    setLoading(false);
  }

  async function changeStatus(id, status) {
    await api('/api/admin/tasks/' + id + '/status', 'PATCH', { status });
    load();
  }

  const total     = Object.values(groups).flat().length;
  const completed = (groups['completed'] || []).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Tasks</h2>
          <p className="text-muted">{total} assigned · {completed} completed</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ New Task</button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="card" style={{ padding:'16px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
            <span>Overall progress</span>
            <span style={{ fontWeight:600 }}>{Math.round(completed/total*100)}%</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: Math.round(completed/total*100)+'%', background:'#10b981' }} />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#64748b' }}>Loading…</div>
      ) : total === 0 ? (
        <div className="card" style={{ padding:48, textAlign:'center', color:'#64748b' }}>
          🎉 No tasks assigned to you right now.
        </div>
      ) : (
        STATUS_ORDER.map(status => {
          const ts = groups[status] || [];
          if (!ts.length) return null;
          return (
            <div key={status} style={{ marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ width:10,height:10,borderRadius:'50%',background:SCOLOR[status],display:'inline-block' }} />
                <h3 style={{ margin:0, fontSize:15 }}>{status.replace('_',' ')}</h3>
                <span style={{ fontSize:12,color:'#64748b' }}>{ts.length}</span>
              </div>
              {ts.map(t => (
                <div key={t._id} className="card" style={{ padding:'14px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontSize:11,color:'#64748b' }}>{t.taskId}</span>
                      <span className="priority-badge" style={{ background:PCOLOR[t.priority]+'20', color:PCOLOR[t.priority] }}>{t.priority}</span>
                    </div>
                    <div style={{ fontWeight:500, cursor:'pointer' }} onClick={() => setModal(t._id)}>{t.title}</div>
                    {t.project && <div style={{ fontSize:12,color:'#64748b',marginTop:2 }}>📁 {t.project}</div>}
                    {t.dueDate && (
                      <div style={{ fontSize:12, marginTop:4, color: new Date(t.dueDate)<new Date() ? '#ef4444':'#64748b' }}>
                        📅 {new Date(t.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                      </div>
                    )}
                  </div>
                  <select
                    className="status-select"
                    value={t.status}
                    style={{ color: SCOLOR[t.status] }}
                    onChange={e => changeStatus(t._id, e.target.value)}
                  >
                    {['todo','in_progress','testing','on_hold','completed','cancelled'].map(s => (
                      <option key={s} value={s}>{s.replace('_',' ')}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          );
        })
      )}

      {modal && (
        <Modal title={modal === 'new' ? 'New Task' : 'Edit Task'} onClose={() => setModal(null)} wide>
          <TaskForm
            taskId={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); load(); }}
          />
        </Modal>
      )}
    </div>
  );
}
