import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { api } from '../api';

const PCOLOR = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };
const SCOLORS = ['#3b82f6','#f59e0b','#8b5cf6','#10b981','#6b7280','#ef4444'];

export default function Dashboard() {
  const [dash,        setDash]        = useState(null);
  const [activity,    setActivity]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const navigate = useNavigate();

  async function loadAll() {
    const [d, a] = await Promise.all([
      api('/api/admin/tasks/dashboard'),
      api('/api/admin/tasks/activity?limit=20'),
    ]);
    if (d.success) setDash(d.data);
    if (a.success) setActivity(a.data || []);
    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 60_000); // refresh every 60s
    return () => clearInterval(t);
  }, []);

  if (loading) return <Skeleton />;
  if (!dash)   return <div className="alert alert-error">Failed to load dashboard.</div>;

  const { summary, statusBreakdown=[], priorityBreakdown=[], assigneeBreakdown=[], weeklyActivity=[], recentlyCompleted=[] } = dash;

  const inProgress = statusBreakdown.find(s => s.status === 'in_progress')?.count || 0;

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

  // weeklyActivity has { _id: { week, year }, created, completed }
  const trendChart = {
    labels: weeklyActivity.map(w => `Wk ${w._id.week}`),
    datasets: [{
      label: 'Created',
      data: weeklyActivity.map(w => w.created),
      fill: true,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,.15)',
      tension: 0.4, pointRadius: 4,
    },{
      label: 'Completed',
      data: weeklyActivity.map(w => w.completed),
      fill: false,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,.15)',
      tension: 0.4, pointRadius: 4,
    }],
  };

  const assigneeChart = {
    labels: assigneeBreakdown.map(a => a.name),
    datasets: [{
      label: 'Total Tasks',
      data: assigneeBreakdown.map(a => a.total),
      backgroundColor: '#3b82f6', borderRadius: 6,
    },{
      label: 'Completed',
      data: assigneeBreakdown.map(a => a.completed),
      backgroundColor: '#10b981', borderRadius: 6,
    }],
  };

  const chartOpts = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } };
  const legendOpts = { ...chartOpts, plugins:{ legend:{ display:true, position:'right' } } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="text-muted">Overview of all task activity</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {lastRefresh && <span style={{ fontSize:11, color:'var(--muted)' }}>Updated {lastRefresh.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>}
          <button className="btn btn-secondary" onClick={loadAll} title="Refresh">↻ Refresh</button>
          <button className="btn btn-primary" onClick={() => navigate('/tasks?new=1')}>+ New Task</button>
        </div>
      </div>

      {summary.overdue > 0 && (
        <div className="alert-banner alert-overdue" style={{ cursor:'pointer' }} onClick={() => navigate('/tasks?overdue=true')}>
          🚨 <strong>{summary.overdue} overdue task{summary.overdue>1?'s':''}</strong> — click to view
        </div>
      )}
      {summary.dueToday > 0 && (
        <div className="alert-banner alert-today" style={{ cursor:'pointer' }} onClick={() => navigate('/tasks?dueToday=true')}>
          ⏰ <strong>{summary.dueToday} task{summary.dueToday>1?'s':''} due today</strong> — click to view
        </div>
      )}

      {/* Stat cards */}
      <div className="stats-grid">
        {[
          { label:'Total Tasks',     value:summary.total,          icon:'📋', color:'#3b82f6', href:'/tasks' },
          { label:'In Progress',     value:inProgress,             icon:'🔄', color:'#f59e0b', href:'/tasks?status=in_progress' },
          { label:'Completed',       value:summary.completed,      icon:'✅', color:'#10b981', href:'/tasks?status=completed' },
          { label:'Overdue',         value:summary.overdue,        icon:'🚨', color:'#ef4444', href:'/tasks?overdue=true' },
          { label:'Due Today',       value:summary.dueToday,       icon:'⏰', color:'#8b5cf6', href:'/tasks?dueToday=true' },
          { label:'Completion Rate', value:summary.completionRate+'%', icon:'📈', color:'#06b6d4', href:'/reports' },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ cursor:'pointer' }} onClick={() => navigate(c.href)}>
            <div className="stat-icon" style={{ background:c.color+'20', color:c.color }}>{c.icon}</div>
            <div className="stat-value" style={{ color:c.color }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="card chart-card">
          <div className="chart-title">Tasks by Status</div>
          <div style={{ height:220 }}><Doughnut data={statusChart} options={legendOpts} /></div>
        </div>
        <div className="card chart-card">
          <div className="chart-title">Tasks by Priority</div>
          <div style={{ height:220 }}><Doughnut data={priorityChart} options={legendOpts} /></div>
        </div>
        <div className="card chart-card chart-wide">
          <div className="chart-title">Weekly Activity (last 4 weeks)</div>
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

      {/* Bottom row: recent completions + activity feed */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:24 }}>
        <div className="card">
          <div className="chart-title">Recently Completed</div>
          {recentlyCompleted.length === 0 ? (
            <p className="text-muted" style={{ padding:'8px 0' }}>No completions this week.</p>
          ) : recentlyCompleted.map(t => (
            <div key={t._id} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }} onClick={() => navigate('/tasks?id='+t._id)}>
              <div style={{ fontSize:13, fontWeight:500 }}>{t.title}</div>
              <div style={{ fontSize:11, color:'#64748b' }}>{t.taskId} · {t.project} · {t.completedAt ? new Date(t.completedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : ''}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="chart-title">Recent Activity</div>
          <div className="activity-feed">
            {activity.length === 0 ? (
              <p className="text-muted" style={{ padding:'8px 0' }}>No recent activity.</p>
            ) : activity.slice(0,10).map((a,i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" />
                <div className="activity-content">
                  <strong>{a.actor || 'System'}</strong>{' '}
                  {a.type === 'status_change' ? (
                    <>
                      changed status{' '}
                      <span style={{ color:'var(--muted)' }}>{(a.fromStatus||'').replace('_',' ')}</span>
                      {' → '}
                      <span style={{ fontWeight:600 }}>{(a.toStatus||'').replace('_',' ')}</span>
                    </>
                  ) : (
                    <>
                      commented
                      {a.text && <span style={{ color:'var(--muted)', fontStyle:'italic' }}>{' "' + a.text.slice(0,60) + (a.text.length>60?'…':'"')}</span>}
                    </>
                  )}
                  {a.taskId && <span className="activity-task"> · {a.taskId}</span>}
                  <div className="activity-time">{new Date(a.timestamp).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      <div className="page-header"><h2>Dashboard</h2></div>
      <div className="stats-grid">
        {Array(6).fill(0).map((_,i) => (
          <div key={i} className="stat-card">
            <div className="skel" style={{ width:40,height:40,borderRadius:8 }} />
            <div className="skel skel-line" style={{ width:60,height:28,marginTop:8 }} />
            <div className="skel skel-line" style={{ width:80,height:12,marginTop:6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
