/* Shared task create/edit form HTML + submission logic */

function taskFormHTML(task) {
  const v = task || {};
  const assignees = (v.assignedTo || []).map(a => `${a.name}|${a.userId}|${a.email || ''}`).join('\n');

  const toDate = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';

  return `
    <form id="taskForm" class="task-form" onsubmit="submitTaskForm(event)">
      <input type="hidden" id="editTaskId" value="${v._id || ''}" />

      <div class="form-row">
        <div class="form-group flex-2">
          <label>Title <span class="req">*</span></label>
          <input type="text" id="fTitle" value="${v.title || ''}" required placeholder="What needs to be done?" />
        </div>
        <div class="form-group">
          <label>Project</label>
          <input type="text" id="fProject" value="${v.project || 'MahattaART'}" placeholder="MahattaART" />
        </div>
      </div>

      <div class="form-group">
        <label>Description</label>
        <textarea id="fDescription" rows="3" placeholder="Add details, acceptance criteria, links…">${v.description || ''}</textarea>
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
        <div class="form-group">
          <label>Due Date</label>
          <input type="datetime-local" id="fDueDate" value="${toDate(v.dueDate)}" />
        </div>
        <div class="form-group">
          <label>Reminder Date</label>
          <input type="datetime-local" id="fReminderDate" value="${toDate(v.reminderDate)}" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Est. Hours</label>
          <input type="number" id="fEstHours" value="${v.estimatedHours || ''}" min="0" step="0.5" placeholder="e.g. 4" />
        </div>
        <div class="form-group">
          <label>Actual Hours</label>
          <input type="number" id="fActHours" value="${v.actualHours || ''}" min="0" step="0.5" placeholder="e.g. 3.5" />
        </div>
        <div class="form-group">
          <label>Tags (comma-separated)</label>
          <input type="text" id="fTags" value="${(v.tags || []).join(', ')}" placeholder="design, backend, urgent" />
        </div>
      </div>

      <div class="form-group">
        <label>Assignees</label>
        <p class="form-hint">One per line: <code>Name | UserID | email@example.com</code></p>
        <textarea id="fAssignees" rows="3" placeholder="Alice | 64abc123... | alice@mahattaart.com">${assignees}</textarea>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="fEmailNotif" ${v.emailNotificationsEnabled !== false ? 'checked' : ''} />
          Send email notifications
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

async function submitTaskForm(e) {
  e.preventDefault();
  const btn = document.getElementById('submitTaskBtn');
  const err = document.getElementById('formError');
  err.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const id = document.getElementById('editTaskId').value;

  // Parse assignees
  const assignees = document.getElementById('fAssignees').value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [name, userId, email] = line.split('|').map(s => s.trim());
      return { name: name || '', userId: userId || undefined, email: email || '' };
    });

  const payload = {
    title:                      document.getElementById('fTitle').value.trim(),
    description:                document.getElementById('fDescription').value.trim(),
    project:                    document.getElementById('fProject').value.trim() || 'MahattaART',
    status:                     document.getElementById('fStatus').value,
    priority:                   document.getElementById('fPriority').value,
    dueDate:                    document.getElementById('fDueDate').value || undefined,
    reminderDate:               document.getElementById('fReminderDate').value || undefined,
    estimatedHours:             parseFloat(document.getElementById('fEstHours').value) || undefined,
    actualHours:                parseFloat(document.getElementById('fActHours').value) || undefined,
    tags:                       document.getElementById('fTags').value.split(',').map(t => t.trim()).filter(Boolean),
    assignedTo:                 assignees,
    emailNotificationsEnabled:  document.getElementById('fEmailNotif').checked,
  };

  // Remove undefined keys
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  const res = id
    ? await api('/api/admin/tasks/' + id, 'PUT',  payload)
    : await api('/api/admin/tasks',        'POST', payload);

  if (res.success) {
    closeTaskModal();
    if (typeof loadTasks    === 'function') loadTasks();
    if (typeof loadKanban   === 'function') loadKanban();
    if (typeof loadMyTasks  === 'function') loadMyTasks();
  } else {
    err.textContent = res.message || 'Save failed';
    err.style.display = 'block';
    btn.disabled = false;
    btn.textContent = id ? 'Save Changes' : 'Create Task';
  }
}
