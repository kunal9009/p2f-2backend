import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { api } from '../api';

export default function Team() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {assigneeBreakdown.map(member => {
          const pct = member.total ? Math.round(member.completed / member.total * 100) : 0;
          const active = member.total - member.completed;
          return (
            <div key={member._id || member.name} className="card">
              <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:14 }}>
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
