import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { api } from '../api';

const STATUS_COLORS  = ['#3b82f6','#f59e0b','#8b5cf6','#10b981','#6b7280','#ef4444'];
const PRIORITY_COLORS = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };

export default function Dashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const navigate            = useNavigate();

  useEffect(() => {
    api('/api/admin/tasks/dashboard').then(res => {
      if (res.success) setData(res.data);
      setLoad(false);
    });
  }, []);

  if (loading) return <Skeleton />;
  if (!data)   return <div className="alert alert-error">Failed to load dashboard.</div>;

  const { summary, byStatus, byPriority, trend, topAssignees, recentActivity } = data;

  const statusChart = {
    labels: byStatus.map(s => s._id.replace('_',' ')),
    datasets: [{ data: byStatus.map(s => s.count), backgroundColor: STATUS_COLORS, borderWidth: 0 }],
  };

  const priorityChart = {
    labels: byPriority.map(p => p._id),
    datasets: [{
      data: byPriority.map(p => p.count),
      backgroundColor: byPriority.map(p => PRIORITY_COLORS[p._id] || '#64748b'),
      borderWidth: 0,
    }],
  };

  const trendChart = {
    labels: (trend || []).map(t => t._id),
    datasets: [{
      label: 'Tasks Completed',
      data: (trend || []).map(t => t.count),
      fill: true,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,.15)',
      tension: 0.4,
      pointRadius: 4,
    }],
  };

  const assigneeChart = {
    labels: (topAssignees || []).map(a => a.name),
    datasets: [{
      label: 'Active Tasks',
      data: (topAssignees || []).map(a => a.count),
      backgroundColor: '#3b82f6',
      borderRadius: 6,
    }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="text-muted">Overview of all task activity</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tasks?new=1')}>+ New Task</button>
      </div>

      {/* Alert banners */}
      {summary.overdue > 0 && (
        <div className="alert-banner alert-overdue" onClick={() => navigate('/tasks?overdue=true')} style={{ cursor:'pointer' }}>
          🚨 <strong>{summary.overdue} overdue task{summary.overdue>1?'s':''}</strong> — click to view
        </div>
      )}
      {summary.dueToday > 0 && (
        <div className="alert-banner alert-today" onClick={() => navigate('/tasks?dueToday=true')} style={{ cursor:'pointer' }}>
          ⏰ <strong>{summary.dueToday} task{summary.dueToday>1?'s':''} due today</strong> — click to view
        </div>
      )}

      {/* Stat cards */}
      <div className="stats-grid">
        {[
          { label: 'Total Tasks',      value: summary.total,          icon: '📋', color: '#3b82f6', href: '/tasks' },
          { label: 'In Progress',      value: summary.inProgress,     icon: '🔄', color: '#f59e0b', href: '/tasks?status=in_progress' },
          { label: 'Completed',        value: summary.completed,      icon: '✅', color: '#10b981', href: '/tasks?status=completed' },
          { label: 'Overdue',          value: summary.overdue,        icon: '🚨', color: '#ef4444', href: '/tasks?overdue=true' },
          { label: 'Due Today',        value: summary.dueToday,       icon: '⏰', color: '#8b5cf6', href: '/tasks?dueToday=true' },
          { label: 'Completion Rate',  value: summary.completionRate+'%', icon: '📈', color: '#06b6d4', href: '/reports' },
        ].map(c => (
          <div key={c.label} className="stat-card" onClick={() => navigate(c.href)} style={{ cursor:'pointer' }}>
            <div className="stat-icon" style={{ background: c.color + '20', color: c.color }}>{c.icon}</div>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="card chart-card">
          <div className="chart-title">Tasks by Status</div>
          <div className="chart-wrap" style={{ height: 220 }}>
            <Doughnut data={statusChart} options={{ ...chartOpts, plugins: { legend: { display: true, position: 'right' } } }} />
          </div>
        </div>
        <div className="card chart-card">
          <div className="chart-title">Tasks by Priority</div>
          <div className="chart-wrap" style={{ height: 220 }}>
            <Doughnut data={priorityChart} options={{ ...chartOpts, plugins: { legend: { display: true, position: 'right' } } }} />
          </div>
        </div>
        <div className="card chart-card chart-wide">
          <div className="chart-title">Completion Trend (last 30 days)</div>
          <div className="chart-wrap" style={{ height: 220 }}>
            <Line data={trendChart} options={{ ...chartOpts, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
          </div>
        </div>
        <div className="card chart-card chart-wide">
          <div className="chart-title">Top Assignees by Active Tasks</div>
          <div className="chart-wrap" style={{ height: 220 }}>
            <Bar data={assigneeChart} options={{ ...chartOpts, scales: { y: { beginAtZero: true } } }} />
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="chart-title">Recent Activity</div>
        <div className="activity-feed">
          {(recentActivity || []).length === 0
            ? <p className="text-muted" style={{ padding: '16px 0' }}>No activity yet.</p>
            : (recentActivity||[]).slice(0,15).map((a,i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" />
                <div className="activity-content">
                  <strong>{a.by || 'System'}</strong> {a.action}
                  {a.taskId && <span className="activity-task"> · {a.taskId}</span>}
                  <div className="activity-time">{new Date(a.at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))
          }
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
            <div className="skel" style={{ width:40, height:40, borderRadius:8 }} />
            <div className="skel skel-line" style={{ width:60, height:28, marginTop:8 }} />
            <div className="skel skel-line" style={{ width:80, height:12, marginTop:6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
