import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { getVendors, createVendor, updateVendor, deleteVendor, reactivateVendor } from '../../api/admin';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';

const emptyForm = { name: '', contactPerson: '', email: '', phone: '', password: '', gstNo: '', commissionRate: '' };

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback((s = search, p = page) => {
    setLoading(true);
    const params = { page: p, limit: 20 };
    if (s) params.search = s;
    getVendors(params)
      .then((r) => { setVendors(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(search, page); }, [page]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(search, 1); };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({ name: v.name, contactPerson: v.contactPerson || '', email: v.email || '', phone: v.phone || '', password: '', gstNo: v.gstNo || '', commissionRate: v.commissionRate || '' });
    setModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) { delete payload.password; await updateVendor(editing._id, payload); toast.success('Updated'); }
      else { await createVendor(payload); toast.success('Vendor created' + (payload.email && payload.password ? ' with login account' : '')); }
      setModal(false);
      load(search, page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (v) => {
    if (!confirm(`Deactivate "${v.name}"?`)) return;
    try { await deleteVendor(v._id); toast.success('Deactivated'); load(search, page); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReactivate = async (v) => {
    try { await reactivateVendor(v._id); toast.success('Reactivated'); load(search, page); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Vendors</h1>
        <button className="btn-primary" onClick={openCreate}><PlusIcon className="h-4 w-4" /> Add Vendor</button>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search name, contact, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : vendors.length === 0 ? (
          <EmptyState message="No vendors found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">GST</th>
                    <th className="px-4 py-3 text-left">Login</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendors.map((v) => (
                    <tr key={v._id} className={`hover:bg-gray-50 ${!v.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{v.name}</p>
                        <p className="text-xs text-gray-400">{v.contactPerson}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{v.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{v.email}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{v.gstNo || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge label={v.userId ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-4 py-3"><Badge label={v.isActive ? 'active' : 'inactive'} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><PencilIcon className="h-4 w-4" /></button>
                          {v.isActive
                            ? <button onClick={() => handleDelete(v)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><TrashIcon className="h-4 w-4" /></button>
                            : <button onClick={() => handleReactivate(v)} className="p-1.5 text-gray-400 hover:text-green-600 rounded"><ArrowPathIcon className="h-4 w-4" /></button>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Vendor' : 'Add Vendor'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Company Name *</label><input className="input" value={form.name} onChange={f('name')} /></div>
            <div><label className="label">Contact Person</label><input className="input" value={form.contactPerson} onChange={f('contactPerson')} /></div>
            <div><label className="label">Email {!editing && '(for login)'}</label><input className="input" type="email" value={form.email} onChange={f('email')} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={f('phone')} /></div>
            {!editing && (
              <div className="col-span-2">
                <label className="label">Password (creates login account)</label>
                <input className="input" type="password" value={form.password} onChange={f('password')} placeholder="Leave blank to skip" />
              </div>
            )}
            <div><label className="label">GST No</label><input className="input" value={form.gstNo} onChange={f('gstNo')} /></div>
            <div><label className="label">Commission Rate (%)</label><input className="input" type="number" value={form.commissionRate} onChange={f('commissionRate')} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Vendor'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
