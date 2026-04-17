import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { api } from '../api';

const SCOLOR = { todo:'#64748b', in_progress:'#f59e0b', testing:'#8b5cf6', on_hold:'#94a3b8', completed:'#10b981', cancelled:'#ef4444' };

export default function Team() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/admin/tasks/dashboard').then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>Loading…</div>;
  if (!data)   return <div className="alert alert-error">Failed to load team data.</div>;

  const { topAssignees = [], byAssigneeStatus = [] } = data;

  // Build stacked bar chart: each assignee × status
  const assignees = [...new Set(byAssigneeStatus.map(r => r.name))];
  const statuses  = ['todo','in_progress','testing','on_hold','completed','cancelled'];

  const stackedData = {
    labels: assignees,
    datasets: statuses.map(s => ({
      label: s.replace('_',' '),
      data: assignees.map(name => {
        const row = byAssigneeStatus.find(r => r.name === name && r.status === s);
        return row ? row.count : 0;
      }),
      backgroundColor: SCOLOR[s],
      borderRadius: 4,
    })),
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Team</h2><p className="text-muted">Workload and task distribution across team members</p></div>
      </div>

      {/* Stacked chart */}
      {assignees.length > 0 && (
        <div className="card" style={{ marginBottom:24 }}>
          <div className="chart-title">Workload by Status</div>
          <div style={{ height: 300 }}>
            <Bar data={stackedData} options={chartOpts} />
          </div>
        </div>
      )}

      {/* Member cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {topAssignees.map(member => {
          const memberRows = byAssigneeStatus.filter(r => r.name === member.name);
          const total = memberRows.reduce((s,r) => s+r.count, 0);
          const done  = memberRows.find(r => r.status === 'completed')?.count || 0;
          const pct   = total ? Math.round(done/total*100) : 0;
          return (
            <div key={member.name} className="card">
              <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
                <div className="user-avatar" style={{ width:44,height:44,fontSize:18 }}>
                  {(member.name||'U').slice(0,1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:600 }}>{member.name}</div>
                  <div style={{ fontSize:12,color:'#64748b' }}>{total} active task{total!==1?'s':''}</div>
                </div>
                <div style={{ marginLeft:'auto', textAlign:'right' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:'#10b981' }}>{pct}%</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>complete</div>
                </div>
              </div>
              <div className="progress-bar-wrap" style={{ marginBottom:10 }}>
                <div className="progress-bar" style={{ width:pct+'%', background:'#10b981' }} />
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {memberRows.filter(r=>r.count>0).map(r => (
                  <div key={r.status} style={{ fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:8,height:8,borderRadius:'50%',background:SCOLOR[r.status],display:'inline-block' }} />
                    {r.status.replace('_',' ')} ({r.count})
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {topAssignees.length === 0 && (
        <div className="card" style={{ padding:48,textAlign:'center',color:'#64748b' }}>
          No team members with assigned tasks yet.
        </div>
      )}
    </div>
  );
}
