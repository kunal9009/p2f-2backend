import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { api } from '../api';

const SCOLOR = {
  not_started:'#94a3b8', todo:'#64748b', under_discussion:'#0ea5e9',
  in_progress:'#f59e0b', testing:'#8b5cf6', on_hold:'#94a3b8',
  completed:'#10b981', cancelled:'#ef4444',
};

function MemberTaskList({ userId }) {
  const [tasks, setTasks]     = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let alive = true;
    api(`/api/admin/tasks?assignedTo=${userId}&limit=200&sort=-createdAt`).then(res => {
      if (!alive) return;
      if (res.success) setTasks(res.data || []);
      else setError(res.message || 'Failed to load tasks');
    });
    return () => { alive = false; };
  }, [userId]);

  if (error)        return <div style={{ fontSize:12, color:'#ef4444', padding:'8px 0' }}>{error}</div>;
  if (tasks === null) return <div style={{ fontSize:12, color:'var(--muted)', padding:'8px 0' }}>Loading tasks…</div>;
  if (tasks.length === 0) return <div style={{ fontSize:12, color:'var(--muted)', padding:'8px 0' }}>No tasks assigned.</div>;

  return (
    <div style={{ marginTop:12, borderTop:'1px solid var(--border)', paddingTop:12 }}>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:8 }}>
        Tasks ({tasks.length})
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:280, overflowY:'auto' }}>
        {tasks.map(t => {
          const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && !['completed','cancelled'].includes(t.status);
          return (
            <a
              key={t._id}
              href={`/app/tasks?id=${t._id}`}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'8px 10px', background:'var(--bg)', borderRadius:6,
                textDecoration:'none', color:'inherit', fontSize:12,
              }}
            >
              <span style={{ fontFamily:'monospace', color:'var(--muted)', flexShrink:0 }}>{t.taskId}</span>
              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
              <span style={{
                fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:4,
                background: SCOLOR[t.status]+'22', color: SCOLOR[t.status],
                whiteSpace:'nowrap', textTransform:'capitalize',
              }}>
                {t.status.replace(/_/g,' ')}
              </span>
              <span style={{
                fontSize:11, color: isOverdue ? '#ef4444' : 'var(--muted)',
                whiteSpace:'nowrap', minWidth:70, textAlign:'right',
              }}>
                {t.dueDate
                  ? new Date(t.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})
                  : '—'}
                {isOverdue && ' ⚠️'}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function Team() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api('/api/admin/tasks/dashboard').then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading…</div>;
  if (!data)   return <div className="alert alert-error">Failed to load team data.</div>;

  const { assigneeBreakdown = [] } = data;

  // Bar chart: total vs completed per person
  const barData = {
    labels: assigneeBreakdown.map(a => a.name),
    datasets: [
      { label:'Total Tasks', data: assigneeBreakdown.map(a => a.total),     backgroundColor:'#3b82f6', borderRadius:4 },
      { label:'Completed',   data: assigneeBreakdown.map(a => a.completed), backgroundColor:'#10b981', borderRadius:4 },
      { label:'Overdue',     data: assigneeBreakdown.map(a => a.overdue),   backgroundColor:'#ef4444', borderRadius:4 },
    ],
  };

  const chartOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ position:'top' } },
    scales:{ y:{ beginAtZero:true } },
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Team</h2><p className="text-muted">Workload and task distribution across team members</p></div>
      </div>

      {assigneeBreakdown.length > 0 && (
        <div className="card" style={{ marginBottom:24 }}>
          <div className="chart-title">Workload Overview</div>
          <div style={{ height:300 }}>
            <Bar data={barData} options={chartOpts} />
          </div>
        </div>
      )}

      {/* Member cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
        {assigneeBreakdown.map(member => {
          const memberId = member._id || member.name;
          const isOpen   = expanded === memberId;
          const pct      = member.total ? Math.round(member.completed / member.total * 100) : 0;
          const active   = member.total - member.completed;
          return (
            <div key={memberId} className="card" style={{ alignSelf:'start' }}>
              <div
                onClick={() => setExpanded(isOpen ? null : memberId)}
                style={{ display:'flex', gap:12, alignItems:'center', marginBottom:14, cursor:'pointer' }}
                title={isOpen ? 'Click to collapse' : 'Click to view tasks'}
              >
                <div className="user-avatar" style={{ width:44, height:44, fontSize:18, flexShrink:0 }}>
                  {(member.name||'U').slice(0,1).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:15 }}>{member.name}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{member.total} task{member.total!==1?'s':''} total</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:22, fontWeight:700, color:'#10b981' }}>{pct}%</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>done</div>
                </div>
                <div style={{ fontSize:14, color:'var(--muted)', marginLeft:4 }}>{isOpen ? '▾' : '▸'}</div>
              </div>

              <div className="progress-bar-wrap" style={{ marginBottom:12 }}>
                <div className="progress-bar" style={{ width:pct+'%', background:'#10b981' }} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { label:'Active',    value:active,           color:'#3b82f6' },
                  { label:'Done',      value:member.completed, color:'#10b981' },
                  { label:'Overdue',   value:member.overdue,   color:'#ef4444' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:'center', background:'var(--bg)', borderRadius:6, padding:'8px 4px' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {isOpen && member._id && <MemberTaskList userId={member._id} />}
            </div>
          );
        })}
      </div>

      {assigneeBreakdown.length === 0 && (
        <div className="card" style={{ padding:48, textAlign:'center', color:'var(--muted)' }}>
          No team members with assigned tasks yet.
        </div>
      )}
    </div>
  );
}
