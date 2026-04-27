import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';

const NAV = [
  { id: 'dashboard', label: 'Dashboard',   icon: '📊', to: '/dashboard' },
  { id: 'kanban',    label: 'Kanban Board', icon: '📌', to: '/kanban'   },
  { id: 'tasks',     label: 'All Tasks',    icon: '📋', to: '/tasks'    },
  { id: 'add-task',  label: 'Add Task',     icon: '➕', to: '/tasks/new' },
  { id: 'my-tasks',  label: 'My Tasks',     icon: '🙋', to: '/my-tasks', notif: true },
  { id: 'search',    label: 'Search',       icon: '🔍', to: '/search'   },
  { id: 'team',      label: 'Team',         icon: '👥', to: '/team'     },
  { id: 'reports',   label: 'Reports',      icon: '📈', to: '/reports'  },
  { id: 'calendar',  label: 'Calendar',     icon: '📅', to: '/calendar' },
  { id: 'ai-chat',   label: 'AI Assistant', icon: '✨', to: '/ai-chat'  },
  { id: 'users',     label: 'Users',        icon: '👤', to: '/users',   adminOnly: true },
  { id: 'settings',  label: 'Settings',     icon: '⚙️', to: '/settings' },
];

// Admin always sees Users. For non-admins, gate every entry through
// hasSection() so admins can hide sections per-user via permissions.

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, isAdmin, hasSection, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(0);
  const [notifData,  setNotifData]  = useState(null);
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const panelRef = useRef(null);
  const bellRef  = useRef(null);

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 2 * 60 * 1000); // refresh every 2 min
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onOutside(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) setPanelOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  async function loadCount() {
    const res = await api('/api/admin/tasks/my');
    if (!res.success) return;
    const now = new Date();
    const s = new Date(); s.setHours(0,0,0,0);
    const e = new Date(); e.setHours(23,59,59,999);
    const active   = res.data.filter(t => !['completed','cancelled'].includes(t.status));
    const overdue  = active.filter(t => t.dueDate && new Date(t.dueDate) < now);
    const dueToday = active.filter(t => {
      const d = t.dueDate ? new Date(t.dueDate) : null;
      return d && d >= s && d <= e;
    });
    setNotifData({ overdue, dueToday });
    setNotifCount(overdue.length + dueToday.length);
  }

  async function togglePanel() {
    if (panelOpen) { setPanelOpen(false); return; }
    setPanelOpen(true);
    setLoading(true);
    await loadCount();
    setLoading(false);
  }

  const visible = NAV.filter(n => {
    if (n.adminOnly && !isAdmin) return false;
    return hasSection(n.id);
  });

  return (
    <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="#1a1a2e"/>
          <rect x="8"  y="8"  width="10" height="10" rx="2" fill="#e94560"/>
          <rect x="22" y="8"  width="10" height="10" rx="2" fill="#0f3460"/>
          <rect x="8"  y="22" width="10" height="10" rx="2" fill="#0f3460"/>
          <rect x="22" y="22" width="10" height="10" rx="2" fill="#e94560"/>
        </svg>
        <span>MahattaART</span>
        <div className="notif-bell-wrap" style={{ marginLeft: 'auto', position: 'relative' }}>
          <button ref={bellRef} className="notif-bell" onClick={togglePanel} title="Notifications">
            🔔
            {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
          </button>
          {panelOpen && (
            <div ref={panelRef} className="notif-panel open">
              {loading ? (
                <div className="notif-loading">Loading…</div>
              ) : !notifData || notifCount === 0 ? (
                <div className="notif-empty">✅ You're all caught up!</div>
              ) : (
                <>
                  {notifData.overdue.length > 0 && <>
                    <div className="notif-section-title">🚨 Overdue ({notifData.overdue.length})</div>
                    {notifData.overdue.map(t => (
                      <div key={t._id} className="notif-item notif-overdue" onClick={() => { navigate('/tasks?id=' + t._id); setPanelOpen(false); }}>
                        <div className="notif-task-id">{t.taskId}</div>
                        <div className="notif-task-title">{t.title}</div>
                        <div className="notif-task-meta">{t.project} · {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : ''}</div>
                      </div>
                    ))}
                  </>}
                  {notifData.dueToday.length > 0 && <>
                    <div className="notif-section-title">⏰ Due Today ({notifData.dueToday.length})</div>
                    {notifData.dueToday.map(t => (
                      <div key={t._id} className="notif-item notif-today" onClick={() => { navigate('/tasks?id=' + t._id); setPanelOpen(false); }}>
                        <div className="notif-task-id">{t.taskId}</div>
                        <div className="notif-task-title">{t.title}</div>
                        <div className="notif-task-meta">{t.project} · {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : ''}</div>
                      </div>
                    ))}
                  </>}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        {visible.map(n => (
          <NavLink key={n.id} to={n.to} onClick={onClose} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
            {n.notif && notifCount > 0 && <span className="nav-badge">{notifCount}</span>}
            {n.id === 'search' && <span className="nav-shortcut">^K</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{(user?.name || 'U').slice(0,1).toUpperCase()}</div>
          <div>
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role || ''}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:8 }}>
          <button
            onClick={toggleTheme}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ flex:1, padding:'6px 0', background:'rgba(255,255,255,.1)', border:'none', borderRadius:6, color:'rgba(255,255,255,.8)', cursor:'pointer', fontSize:14 }}
          >
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        <button className="btn-logout" onClick={() => { logout(); navigate('/login'); }}>Sign Out</button>
      </div>
    </aside>
  );
}
