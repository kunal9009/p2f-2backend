import { useEffect, useState, useCallback } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon, KeyIcon } from '@heroicons/react/24/outline';
import { getUsers, resetPassword, deleteUser, reactivateUser, adminRegisterUser } from '../../api/admin';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [createModal, setCreateModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', phone: '', role: 'warehouse' });
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback((p = page) => {
    setLoading(true);
    getUsers({ page: p, limit: 20 })
      .then((r) => { setUsers(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await adminRegisterUser(createForm);
      toast.success('User created');
      setCreateModal(false);
      load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleResetPw = async () => {
    setSaving(true);
    try {
      await resetPassword(selected._id, { newPassword: newPw });
      toast.success('Password reset');
      setPwModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Deactivate "${u.name}"?`)) return;
    try { await deleteUser(u._id); toast.success('Deactivated'); load(page); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReactivate = async (u) => {
    try { await reactivateUser(u._id); toast.success('Reactivated'); load(page); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const ROLE_COLOR = { admin: 'bg-purple-100 text-purple-700', warehouse: 'bg-blue-100 text-blue-700', vendor: 'bg-amber-100 text-amber-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Users</h1>
        <button className="btn-primary" onClick={() => { setCreateForm({ name: '', email: '', password: '', phone: '', role: 'warehouse' }); setCreateModal(true); }}>
          <PlusIcon className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : users.length === 0 ? (
          <EmptyState message="No users found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u._id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3"><Badge label={u.isActive ? 'active' : 'inactive'} /></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(u.createdAt), 'dd MMM yy')}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setSelected(u); setNewPw(''); setPwModal(true); }} className="p-1.5 text-gray-400 hover:text-amber-600 rounded" title="Reset Password">
                            <KeyIcon className="h-4 w-4" />
                          </button>
                          {u.isActive
                            ? <button onClick={() => handleDelete(u)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><TrashIcon className="h-4 w-4" /></button>
                            : <button onClick={() => handleReactivate(u)} className="p-1.5 text-gray-400 hover:text-green-600 rounded"><ArrowPathIcon className="h-4 w-4" /></button>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create User">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Name *</label><input className="input" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label">Email *</label><input className="input" type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="label">Password *</label><input className="input" type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} /></div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="warehouse">Warehouse</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving || !createForm.name || !createForm.email || !createForm.password}>
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={pwModal} onClose={() => setPwModal(false)} title={`Reset Password — ${selected?.name}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setPwModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleResetPw} disabled={saving || newPw.length < 6}>
              {saving ? 'Saving…' : 'Reset Password'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
