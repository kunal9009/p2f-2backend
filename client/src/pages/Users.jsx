import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import { PANEL_SECTIONS } from '../sections';

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'warehouse', isActive: true,
  permissionsRestricted: false,
  permissions: [],
};

export default function Users() {
  const { toast } = useToast();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | 'new' | user object
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [resetPw, setResetPw] = useState({ userId:'', newPassword:'' });
  const [resetModal, setResetModal] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await api('/api/admin/users');
    if (res.success) setUsers(res.data || res.users || []);
    setLoading(false);
  }

  function openNew()  { setForm(EMPTY_FORM); setError(''); setModal('new'); }
  function openEdit(u){
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      isActive: u.isActive,
      permissionsRestricted: !!u.permissionsRestricted,
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
    });
    setError('');
    setModal(u);
  }

  function set(f,v){ setForm(x=>({...x,[f]:v})); }

  function togglePermission(id) {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter(x => x !== id)
        : [...f.permissions, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setError('');
    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      isActive: form.isActive,
    };
    if (modal === 'new' || form.password) payload.password = form.password;
    // Admins always have full access; ignore the toggle for them.
    payload.permissionsRestricted = form.role !== 'admin' && form.permissionsRestricted;
    payload.permissions = payload.permissionsRestricted ? form.permissions : [];
    const res = modal === 'new'
      ? await api('/api/admin/users', 'POST', payload)
      : await api('/api/admin/users/' + (modal._id||modal.id), 'PUT', payload);
    setSaving(false);
    if (res.success) { setModal(null); load(); toast(modal==='new'?'User created':'User updated', 'success'); }
    else setError(res.message || 'Save failed');
  }

  async function toggleActive(u) {
    await api('/api/admin/users/' + (u._id||u.id), 'PUT', { ...u, isActive: !u.isActive });
    load();
  }

  async function handleResetPw(e) {
    e.preventDefault(); setSaving(true); setError('');
    const res = await api('/api/admin/users/' + resetPw.userId + '/reset-password', 'PATCH', { newPassword: resetPw.newPassword });
    setSaving(false);
    if (res.success) { setResetModal(false); setResetPw({ userId:'', newPassword:'' }); toast('Password reset successfully', 'success'); }
    else setError(res.message || 'Reset failed');
  }

  return (
    <div>
      <div className="page-header">
        <div><h2>Users</h2><p className="text-muted">Manage team members and access</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add User</button>
      </div>

      <div className="card" style={{ padding:0, overflow:'auto' }}>
        {loading ? (
          <div style={{ padding:32,textAlign:'center',color:'var(--muted)' }}>Loading…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id||u.id}>
                  <td style={{ fontWeight:500 }}>{u.name}</td>
                  <td style={{ color:'var(--muted)',fontSize:13 }}>{u.email}</td>
                  <td><span className="priority-badge role-badge">{u.role}</span></td>
                  <td>
                    <span className="schedule-badge" style={{ background: u.isActive?'#dcfce7':'#fee2e2', color: u.isActive?'#166534':'#991b1b' }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex',gap:6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setResetPw({userId:u._id||u.id,newPassword:''}); setError(''); setResetModal(true); }}>Reset Pw</button>
                      <button className="btn btn-sm" style={{ background: u.isActive?'#fef3c7':'' }} onClick={() => toggleActive(u)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit modal */}
      {modal && (
        <Modal title={modal === 'new' ? 'Add User' : 'Edit User'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error" style={{ marginBottom:12 }}>{error}</div>}
            <div className="form-group"><label>Name</label><input value={form.name} onChange={e=>set('name',e.target.value)} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} required /></div>
            <div className="form-group"><label>{modal==='new'?'Password':'New Password (leave blank to keep)'}</label><input type="password" value={form.password} onChange={e=>set('password',e.target.value)} required={modal==='new'} /></div>
            <div className="form-row">
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e=>set('role',e.target.value)}>
                  <option value="admin">admin</option>
                  <option value="warehouse">warehouse</option>
                  <option value="vendor">vendor</option>
                  <option value="marketing">marketing</option>
                  <option value="content">content</option>
                  <option value="sales">sales</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={String(form.isActive)} onChange={e=>set('isActive',e.target.value==='true')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {form.role !== 'admin' && (
              <div className="form-group">
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.permissionsRestricted}
                    onChange={e => set('permissionsRestricted', e.target.checked)}
                  />
                  <span>Restrict panel sections (otherwise user sees all non-admin sections)</span>
                </label>
                {form.permissionsRestricted && (
                  <div style={{ marginTop:8, padding:12, border:'1px solid var(--border)', borderRadius:6, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:6 }}>
                    {PANEL_SECTIONS.map(s => (
                      <label key={s.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(s.id)}
                          onChange={() => togglePermission(s.id)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                )}
                {form.permissionsRestricted && form.permissions.length === 0 && (
                  <div style={{ marginTop:6, fontSize:12, color:'#b45309' }}>
                    ⚠️ No sections selected — this user will see only the "No access" page.
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save User'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetModal && (
        <Modal title="Reset Password" onClose={() => setResetModal(false)}>
          <form onSubmit={handleResetPw}>
            {error && <div className="alert alert-error" style={{ marginBottom:12 }}>{error}</div>}
            <div className="form-group"><label>New Password</label><input type="password" value={resetPw.newPassword} onChange={e=>setResetPw(r=>({...r,newPassword:e.target.value}))} required minLength={6} /></div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={()=>setResetModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Resetting…':'Reset Password'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
