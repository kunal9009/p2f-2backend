/* Shared task create/edit form HTML + submission logic */

// Cache users so we don't re-fetch on every modal open
let _cachedUsers = null;

async function fetchUsers() {
  if (_cachedUsers) return _cachedUsers;
  const res = await api('/api/admin/users?limit=100&isActive=true');
  _cachedUsers = res.success ? res.data : [];
  return _cachedUsers;
}

async function renderTaskForm(editId) {
  let task = null;
  if (editId) {
    const d = await api('/api/admin/tasks/' + editId);
    if (d.success) task = d.data;
  }

  const [users] = await Promise.all([fetchUsers()]);
  document.getElementById('modalTitle').textContent = task ? 'Edit Task' : 'New Task';
  document.getElementById('modalBody').innerHTML = taskFormHTML(task, users);
}

function taskFormHTML(task, users) {
  const v   = task || {};
  const assignedIds = new Set((v.assignedTo || []).map(a => String(a.userId)));

  const toDate = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';

  const userCheckboxes = (users || []).map(u => `
    <label class="user-check ${assignedIds.has(String(u._id)) ? 'checked' : ''}"
           id="uc-label-${u._id}">
      <input type="checkbox" class="assignee-cb"
             value="${u._id}"
             data-name="${u.name}"
             data-email="${u.email || ''}"
             ${assignedIds.has(String(u._id)) ? 'checked' : ''}
             onchange="toggleUserLabel(this)" />
      <span class="user-check-avatar">${u.name.slice(0,2).toUpperCase()}</span>
      <span class="user-check-info">
        <span class="user-check-name">${u.name}</span>
        <span class="user-check-role">${u.role}</span>
      </span>
    </label>`).join('');

  return `
    <form id="taskForm" class="task-form" onsubmit="submitTaskForm(event)">
      <input type="hidden" id="editTaskId" value="${v._id || ''}" />

      <div class="form-row">
        <div class="form-group flex-2">
          <label>Title <span class="req">*</span></label>
          <input type="text" id="fTitle" value="${esc(v.title)}" required
                 placeholder="What needs to be done?" />
        </div>
        <div class="form-group">
          <label>Project</label>
          <input type="text" id="fProject" value="${esc(v.project || 'MahattaART')}"
                 placeholder="MahattaART" />
        </div>
      </div>

      <div class="form-group">
        <label>Description</label>
        <textarea id="fDescription" rows="3"
                  placeholder="Add details, acceptance criteria, links…">${esc(v.description)}</textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Status</label>
          <select id="fStatus">
            ${['todo','in_progress','testing','completed','on_hold','cancelled'].map(s =>
              `<option value="${s}" ${(v.status||'todo')===s?'selected':''}>${s.replace('_',' ')}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="fPriority">
            ${['critical','high','medium','low'].map(p =>
              `<option value="${p}" ${(v.priority||'medium')===p?'selected':''}>${p}</option>`
            ).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Due Date</label>
          <input type="datetime-local" id="fDueDate" value="${toDate(v.dueDate)}" />
        </div>
        <div class="form-group">
          <label>Reminder Date</label>
          <input type="datetime-local" id="fReminderDate" value="${toDate(v.reminderDate)}" />
        </div>
        <div class="form-group">
          <label>Est. Hours</label>
          <input type="number" id="fEstHours" value="${v.estimatedHours || ''}"
                 min="0" step="0.5" placeholder="e.g. 4" />
        </div>
        <div class="form-group">
          <label>Actual Hours</label>
          <input type="number" id="fActHours" value="${v.actualHours || ''}"
                 min="0" step="0.5" placeholder="e.g. 3.5" />
        </div>
      </div>

      <div class="form-group">
        <label>Tags <span class="form-hint-inline">(comma-separated)</span></label>
        <input type="text" id="fTags" value="${esc((v.tags || []).join(', '))}"
               placeholder="design, backend, urgent" />
      </div>

      <div class="form-group">
        <label>Assign To Team Members</label>
        ${userCheckboxes
          ? `<div class="user-check-grid">${userCheckboxes}</div>`
          : `<p class="text-muted" style="font-size:13px">No team members found.</p>`}
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="fEmailNotif"
                 ${v.emailNotificationsEnabled !== false ? 'checked' : ''} />
          Send email notifications to assignees
        </label>
      </div>

      <div id="formError" class="alert alert-error" style="display:none"></div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeTaskModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" id="submitTaskBtn">
          ${task ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </form>`;
}

function toggleUserLabel(cb) {
  const label = document.getElementById('uc-label-' + cb.value);
  if (label) label.classList.toggle('checked', cb.checked);
}

// HTML-escape helper used inside the form template
function esc(str) {
  return (str || '').toString()
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function submitTaskForm(e) {
  e.preventDefault();
  const btn = document.getElementById('submitTaskBtn');
  const err = document.getElementById('formError');
  err.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const id = document.getElementById('editTaskId').value;

  // Collect checked assignees
  const assignees = [...document.querySelectorAll('.assignee-cb:checked')].map(cb => ({
    userId: cb.value,
    name:   cb.dataset.name,
    email:  cb.dataset.email,
  }));

  const payload = {
    title:                     document.getElementById('fTitle').value.trim(),
    description:               document.getElementById('fDescription').value.trim(),
    project:                   document.getElementById('fProject').value.trim() || 'MahattaART',
    status:                    document.getElementById('fStatus').value,
    priority:                  document.getElementById('fPriority').value,
    dueDate:                   document.getElementById('fDueDate').value || undefined,
    reminderDate:              document.getElementById('fReminderDate').value || undefined,
    estimatedHours:            parseFloat(document.getElementById('fEstHours').value) || undefined,
    actualHours:               parseFloat(document.getElementById('fActHours').value) || undefined,
    tags:                      document.getElementById('fTags').value.split(',').map(t => t.trim()).filter(Boolean),
    assignedTo:                assignees,
    emailNotificationsEnabled: document.getElementById('fEmailNotif').checked,
  };

  // Strip undefined
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  const res = id
    ? await api('/api/admin/tasks/' + id, 'PUT',  payload)
    : await api('/api/admin/tasks',        'POST', payload);

  if (res.success) {
    _cachedUsers = null; // invalidate so next open re-fetches
    closeTaskModal();
    if (typeof loadTasks   === 'function') loadTasks();
    if (typeof loadKanban  === 'function') loadKanban();
    if (typeof loadMyTasks === 'function') loadMyTasks();
  } else {
    err.textContent = res.message || 'Save failed';
    err.style.display = 'block';
    btn.disabled = false;
    btn.textContent = id ? 'Save Changes' : 'Create Task';
  }
}
