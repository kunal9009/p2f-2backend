import React, { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { api } from '../api';

const PCOLOR  = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };
const SCOLORS = ['#3b82f6','#f59e0b','#8b5cf6','#10b981','#6b7280','#ef4444'];

export default function Reports() {
  const [data,    setData]    = useState(null);
  const [dateFrom,setDateFrom]= useState('');
  const [dateTo,  setDateTo]  = useState('');
  const [loading, setLoading] = useState(true);

  async function load(from = dateFrom, to = dateTo) {
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set('dueAfter',  from);
    if (to)   qs.set('dueBefore', to);
    const res = await api('/api/admin/tasks/dashboard?' + qs.toString());
    if (res.success) setData(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>Loading…</div>;
  if (!data)   return <div className="alert alert-error">Failed to load reports.</div>;

  const { summary, statusBreakdown=[], priorityBreakdown=[], assigneeBreakdown=[], weeklyActivity=[], projectBreakdown=[] } = data;

  const statusChart = {
    labels: statusBreakdown.map(s => s.label || s.status.replace('_',' ')),
    datasets: [{ data: statusBreakdown.map(s => s.count), backgroundColor: SCOLORS, borderWidth: 0 }],
  };

  const priorityChart = {
    labels: priorityBreakdown.map(p => p.priority),
    datasets: [{
      data: priorityBreakdown.map(p => p.count),
      backgroundColor: priorityBreakdown.map(p => PCOLOR[p.priority] || '#64748b'),
      borderWidth: 0,
    }],
  };

  const trendChart = {
    labels: weeklyActivity.map(w => `Wk ${w._id.week}`),
    datasets: [
      { label:'Created',  data:weeklyActivity.map(w=>w.created),  borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,.1)', fill:true, tension:0.4, pointRadius:4 },
      { label:'Completed',data:weeklyActivity.map(w=>w.completed),borderColor:'#10b981', backgroundColor:'rgba(16,185,129,.1)', fill:false, tension:0.4, pointRadius:4 },
    ],
  };

  const assigneeChart = {
    labels: assigneeBreakdown.map(a => a.name),
    datasets: [
      { label:'Total',     data:assigneeBreakdown.map(a=>a.total),     backgroundColor:'#3b82f6', borderRadius:4 },
      { label:'Completed', data:assigneeBreakdown.map(a=>a.completed), backgroundColor:'#10b981', borderRadius:4 },
    ],
  };

  const chartOpts = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } };

  function clearDates() { setDateFrom(''); setDateTo(''); }

  return (
    <div>
      <div className="page-header">
        <div><h2>Reports</h2><p className="text-muted">Analytics and performance overview</p></div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <label style={{ fontSize:13, color:'#64748b' }}>From</label>
          <input type="date" className="input-sm" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          <label style={{ fontSize:13, color:'#64748b' }}>To</label>
          <input type="date" className="input-sm" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   />
          <button className="btn btn-primary btn-sm"   onClick={load}>Apply</button>
          {(dateFrom||dateTo) && <button className="btn btn-secondary btn-sm" onClick={()=>{ clearDates(); load('',''); }}>Clear</button>}
        </div>
      </div>

      {/* KPI row */}
      <div className="stats-grid" style={{ marginBottom:24 }}>
        {[
          { label:'Total Tasks',     value:summary.total,              color:'#3b82f6' },
          { label:'Completed',       value:summary.completed,          color:'#10b981' },
          { label:'Overdue',         value:summary.overdue,            color:'#ef4444' },
          { label:'Due This Week',   value:summary.dueThisWeek || 0,   color:'#f59e0b' },
          { label:'Completion Rate', value:summary.completionRate+'%', color:'#8b5cf6' },
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
            <Doughnut data={statusChart} options={{ ...chartOpts, plugins:{ legend:{ display:true, position:'right' } } }} />
          </div>
        </div>
        <div className="card chart-card">
          <div className="chart-title">Priority Breakdown</div>
          <div style={{ height:220 }}>
            <Doughnut data={priorityChart} options={{ ...chartOpts, plugins:{ legend:{ display:true, position:'right' } } }} />
          </div>
        </div>
        <div className="card chart-card chart-wide">
          <div className="chart-title">Weekly Activity Trend</div>
          <div style={{ height:220 }}>
            <Line data={trendChart} options={{ ...chartOpts, plugins:{ legend:{ display:true, position:'top' } }, scales:{ y:{ beginAtZero:true } } }} />
          </div>
        </div>
        <div className="card chart-card chart-wide">
          <div className="chart-title">Team Workload</div>
          <div style={{ height:220 }}>
            <Bar data={assigneeChart} options={{ ...chartOpts, plugins:{ legend:{ display:true, position:'top' } }, scales:{ y:{ beginAtZero:true } } }} />
          </div>
        </div>
      </div>

      {/* Project breakdown */}
      {projectBreakdown.length > 0 && (
        <div className="card" style={{ marginTop:24 }}>
          <div className="chart-title" style={{ marginBottom:12 }}>Tasks by Project</div>
          <div style={{ height: Math.max(200, projectBreakdown.length * 36) }}>
            <Bar
              data={{
                labels: projectBreakdown.map(p => p.project || 'Unassigned'),
                datasets: [{
                  label: 'Tasks',
                  data: projectBreakdown.map(p => p.count),
                  backgroundColor: '#8b5cf6',
                  borderRadius: 4,
                }],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } },
              }}
            />
          </div>
        </div>
      )}

      {/* Performance table */}
      {assigneeBreakdown.length > 0 && (
        <div className="card" style={{ marginTop:24, padding:0, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
            <div className="chart-title" style={{ margin:0 }}>Team Performance</div>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Team Member</th><th>Total</th><th>Completed</th><th>Overdue</th><th>Rate</th><th>Workload</th></tr>
            </thead>
            <tbody>
              {assigneeBreakdown.map(a => {
                const rate = a.total ? Math.round(a.completed/a.total*100) : 0;
                const maxTotal = assigneeBreakdown[0]?.total || 1;
                return (
                  <tr key={a._id||a.name}>
                    <td style={{ fontWeight:500 }}>{a.name}</td>
                    <td>{a.total}</td>
                    <td style={{ color:'#10b981', fontWeight:600 }}>{a.completed}</td>
                    <td style={{ color: a.overdue>0?'#ef4444':'#64748b' }}>{a.overdue}</td>
                    <td style={{ fontWeight:600, color: rate>=80?'#10b981':rate>=50?'#f59e0b':'#ef4444' }}>{rate}%</td>
                    <td style={{ width:'25%' }}>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar" style={{ width:Math.round(a.total/maxTotal*100)+'%', background:'#3b82f6' }} />
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
