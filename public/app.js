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

/* ── Sidebar renderer ── */
function renderSidebar(active) {
  const user = currentUser();
  const nav = [
    { id: 'dashboard', label: 'Dashboard',  icon: '📊', href: 'dashboard.html' },
    { id: 'kanban',    label: 'Kanban Board',icon: '📌', href: 'kanban.html'   },
    { id: 'tasks',     label: 'All Tasks',   icon: '📋', href: 'tasks.html'    },
    { id: 'my',        label: 'My Tasks',    icon: '🙋', href: 'my-tasks.html' },
  ];

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
      </div>

      <nav class="sidebar-nav">
        ${nav.map(n => `
          <a href="${n.href}" class="nav-item ${active === n.id ? 'active' : ''}">
            <span class="nav-icon">${n.icon}</span>
            <span>${n.label}</span>
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
}
