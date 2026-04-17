import React, { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { api } from '../api';

const PCOLOR  = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };
const SCOLORS = ['#3b82f6','#f59e0b','#8b5cf6','#10b981','#6b7280','#ef4444'];

export default function Reports() {
  const [data,       setData]       = useState(null);
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [loading,    setLoading]    = useState(true);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (dateFrom) qs.set('dueAfter', dateFrom);
    if (dateTo)   qs.set('dueBefore', dateTo);
    const [dash] = await Promise.all([
      api('/api/admin/tasks/dashboard?' + qs.toString()),
    ]);
    if (dash.success) setData(dash.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>Loading…</div>;
  if (!data)   return <div className="alert alert-error">Failed to load reports.</div>;

  const { summary, byStatus, byPriority, trend, topAssignees } = data;

  const statusChart = {
    labels: byStatus.map(s => s._id.replace('_',' ')),
    datasets: [{ data: byStatus.map(s => s.count), backgroundColor: SCOLORS, borderWidth: 0 }],
  };

  const priorityChart = {
    labels: byPriority.map(p => p._id),
    datasets: [{
      data: byPriority.map(p => p.count),
      backgroundColor: byPriority.map(p => PCOLOR[p._id] || '#64748b'),
      borderWidth: 0,
    }],
  };

  const trendChart = {
    labels: (trend||[]).map(t => t._id),
    datasets: [{
      label: 'Completed',
      data: (trend||[]).map(t => t.count),
      fill: true,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,.15)',
      tension: 0.4, pointRadius: 4,
    }],
  };

  const assigneeChart = {
    labels: (topAssignees||[]).map(a => a.name),
    datasets: [{
      label: 'Tasks',
      data: (topAssignees||[]).map(a => a.count),
      backgroundColor: '#3b82f6', borderRadius: 6,
    }],
  };

  const chartOpts = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} } };

  return (
    <div>
      <div className="page-header">
        <div><h2>Reports</h2><p className="text-muted">Analytics and performance overview</p></div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label style={{ fontSize:13, color:'#64748b' }}>From</label>
          <input type="date" className="input-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <label style={{ fontSize:13, color:'#64748b' }}>To</label>
          <input type="date" className="input-sm" value={dateTo}   onChange={e => setDateTo(e.target.value)}   />
          <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
          {(dateFrom||dateTo) && <button className="btn btn-secondary btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(load,0); }}>Clear</button>}
        </div>
      </div>

      {/* KPI row */}
      <div className="stats-grid" style={{ marginBottom:24 }}>
        {[
          { label:'Total Tasks',      value:summary.total,           color:'#3b82f6' },
          { label:'Completed',        value:summary.completed,       color:'#10b981' },
          { label:'Overdue',          value:summary.overdue,         color:'#ef4444' },
          { label:'Completion Rate',  value:summary.completionRate+'%', color:'#8b5cf6' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-value" style={{ color:c.color }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="card chart-card">
          <div className="chart-title">Status Distribution</div>
          <div style={{ height:220 }}>
            <Doughnut data={statusChart} options={{ ...chartOpts, plugins:{ legend:{display:true,position:'right'} } }} />
          </div>
        </div>
        <div className="card chart-card">
          <div className="chart-title">Priority Breakdown</div>
          <div style={{ height:220 }}>
            <Doughnut data={priorityChart} options={{ ...chartOpts, plugins:{ legend:{display:true,position:'right'} } }} />
          </div>
        </div>
        <div className="card chart-card chart-wide">
          <div className="chart-title">Completion Trend (last 30 days)</div>
          <div style={{ height:220 }}>
            <Line data={trendChart} options={{ ...chartOpts, plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true } } }} />
          </div>
        </div>
        <div className="card chart-card chart-wide">
          <div className="chart-title">Team Workload</div>
          <div style={{ height:220 }}>
            <Bar data={assigneeChart} options={{ ...chartOpts, scales:{ y:{ beginAtZero:true } } }} />
          </div>
        </div>
      </div>

      {/* Performance table */}
      {(topAssignees||[]).length > 0 && (
        <div className="card" style={{ marginTop:24 }}>
          <div className="chart-title" style={{ marginBottom:12 }}>Team Performance</div>
          <table className="data-table">
            <thead>
              <tr><th>Team Member</th><th>Active Tasks</th><th>Workload</th></tr>
            </thead>
            <tbody>
              {topAssignees.map(a => {
                const maxCount = topAssignees[0].count || 1;
                return (
                  <tr key={a.name}>
                    <td style={{ fontWeight:500 }}>{a.name}</td>
                    <td>{a.count}</td>
                    <td style={{ width:'40%' }}>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar" style={{ width:Math.round(a.count/maxCount*100)+'%', background:'#3b82f6' }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
