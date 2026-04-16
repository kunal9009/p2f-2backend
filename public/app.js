/* ── Auth helpers ── */
function requireAuth() {
  if (!localStorage.getItem('tm_token')) {
    window.location.href = 'index.html';
  }
}

function getToken() {
  return localStorage.getItem('tm_token');
}

function logout() {
  localStorage.removeItem('tm_token');
  localStorage.removeItem('tm_user');
  window.location.href = 'index.html';
}

function currentUser() {
  try { return JSON.parse(localStorage.getItem('tm_user') || '{}'); }
  catch { return {}; }
}

/* ── API helper ── */
async function api(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken(),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    if (res.status === 401) { logout(); return {}; }
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    return { success: false, message: err.message };
  }
}

/* ── Notification state ── */
let _notifData  = null;
let _notifTimer = null;

async function loadNotifications() {
  const res = await api('/api/admin/tasks/my');
  if (!res.success) return { overdue: [], dueToday: [], total: 0 };

  const now       = new Date();
  const todayEnd  = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const active = res.data.filter(t => !['completed','cancelled'].includes(t.status));
  const overdue  = active.filter(t => t.dueDate && new Date(t.dueDate) < now);
  const dueToday = active.filter(t => {
    const d = t.dueDate ? new Date(t.dueDate) : null;
    return d && d >= todayStart && d <= todayEnd;
  });

  _notifData = { overdue, dueToday, total: overdue.length + dueToday.length };
  return _notifData;
}

function updateNotifBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

async function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;

  const isOpen = panel.classList.contains('open');
  if (isOpen) { panel.classList.remove('open'); return; }

  panel.innerHTML = '<div class="notif-loading">Loading…</div>';
  panel.classList.add('open');

  const data = await loadNotifications();
  updateNotifBadge(data.total);

  if (!data.total) {
    panel.innerHTML = '<div class="notif-empty">✅ You\'re all caught up!</div>';
    return;
  }

  let html = '';
  if (data.overdue.length) {
    html += `<div class="notif-section-title">🚨 Overdue (${data.overdue.length})</div>`;
    html += data.overdue.map(t => notifItem(t, 'overdue')).join('');
  }
  if (data.dueToday.length) {
    html += `<div class="notif-section-title">⏰ Due Today (${data.dueToday.length})</div>`;
    html += data.dueToday.map(t => notifItem(t, 'today')).join('');
  }

  panel.innerHTML = html;
}

function notifItem(t, type) {
  const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '';
  return `
    <div class="notif-item notif-${type}" onclick="window.location.href='tasks.html?id=${t._id}'">
      <div class="notif-task-id">${t.taskId}</div>
      <div class="notif-task-title">${t.title}</div>
      <div class="notif-task-meta">${t.project} · ${due}</div>
    </div>`;
}

/* ── Close notif panel on outside click ── */
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notifPanel');
  const bell  = document.getElementById('notifBell');
  if (!panel || !bell) return;
  if (!panel.contains(e.target) && !bell.contains(e.target)) {
    panel.classList.remove('open');
  }
});

/* ── Sidebar renderer ── */
function renderSidebar(active) {
  const user = currentUser();
  const nav = [
    { id: 'dashboard', label: 'Dashboard',    icon: '📊', href: 'dashboard.html' },
    { id: 'kanban',    label: 'Kanban Board',  icon: '📌', href: 'kanban.html'   },
    { id: 'tasks',     label: 'All Tasks',     icon: '📋', href: 'tasks.html'    },
    { id: 'my',        label: 'My Tasks',      icon: '🙋', href: 'my-tasks.html', notif: true },
    { id: 'team',      label: 'Team',          icon: '👥', href: 'team.html'     },
    { id: 'reports',   label: 'Reports',       icon: '📈', href: 'reports.html'  },
    { id: 'users',     label: 'Users',         icon: '⚙️', href: 'users.html', adminOnly: true },
  ];

  const visibleNav = nav.filter(n => !n.adminOnly || user.role === 'admin');

  document.getElementById('sidebar').innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="#1a1a2e"/>
          <rect x="8"  y="8"  width="10" height="10" rx="2" fill="#e94560"/>
          <rect x="22" y="8"  width="10" height="10" rx="2" fill="#0f3460"/>
          <rect x="8"  y="22" width="10" height="10" rx="2" fill="#0f3460"/>
          <rect x="22" y="22" width="10" height="10" rx="2" fill="#e94560"/>
        </svg>
        <span>MahattaART</span>
        <div class="notif-bell-wrap" style="margin-left:auto;position:relative">
          <button id="notifBell" class="notif-bell" onclick="toggleNotifPanel()" title="Notifications">
            🔔
            <span id="notifBadge" class="notif-badge" style="display:none">0</span>
          </button>
          <div id="notifPanel" class="notif-panel"></div>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${visibleNav.map(n => `
          <a href="${n.href}" class="nav-item ${active === n.id ? 'active' : ''}">
            <span class="nav-icon">${n.icon}</span>
            <span>${n.label}</span>
            ${n.notif ? `<span id="myTasksBadge" class="nav-badge" style="display:none"></span>` : ''}
          </a>`).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">${(user.name || 'U').slice(0,1).toUpperCase()}</div>
          <div>
            <div class="user-name">${user.name || 'User'}</div>
            <div class="user-role">${user.role || ''}</div>
          </div>
        </div>
        <button class="btn-logout" onclick="logout()">Sign Out</button>
      </div>
    </aside>`;

  // Load notification count in background after sidebar renders
  loadNotifications().then(data => {
    updateNotifBadge(data.total);
    const myBadge = document.getElementById('myTasksBadge');
    if (myBadge && data.total > 0) {
      myBadge.textContent = data.total;
      myBadge.style.display = 'flex';
    }
  });
}
