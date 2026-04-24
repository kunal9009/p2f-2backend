import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, reactivateCustomer } from '../../api/admin';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const emptyForm = { name: '', email: '', phone: '', customerType: 'B2C', gstNo: '', address: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
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
    getCustomers(params)
      .then((r) => { setCustomers(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(search, page); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(search, 1);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', customerType: c.customerType || 'B2C', gstNo: c.gstNo || '', address: c.address || '' });
    setModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) { await updateCustomer(editing._id, form); toast.success('Customer updated'); }
      else { await createCustomer(form); toast.success('Customer created'); }
      setModal(false);
      load(search, page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Deactivate "${c.name}"?`)) return;
    try { await deleteCustomer(c._id); toast.success('Deactivated'); load(search, page); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReactivate = async (c) => {
    try { await reactivateCustomer(c._id); toast.success('Reactivated'); load(search, page); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Customers</h1>
        <button className="btn-primary" onClick={openCreate}><PlusIcon className="h-4 w-4" /> Add Customer</button>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search name, email, phone, customer ID…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : customers.length === 0 ? (
          <EmptyState message="No customers found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer ID</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <tr key={c._id} className={`hover:bg-gray-50 ${!c.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">
                        <Link to={`/admin/customers/${c._id}`}>{c.customerId}</Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link to={`/admin/customers/${c._id}`} className="hover:underline">{c.name}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{c.email}</p>
                        <p className="text-gray-400 text-xs">{c.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.customerType}</td>
                      <td className="px-4 py-3"><Badge label={c.isActive ? 'active' : 'inactive'} /></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(c.createdAt), 'dd MMM yy')}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><PencilIcon className="h-4 w-4" /></button>
                          {c.isActive
                            ? <button onClick={() => handleDelete(c)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><TrashIcon className="h-4 w-4" /></button>
                            : <button onClick={() => handleReactivate(c)} className="p-1.5 text-gray-400 hover:text-green-600 rounded" title="Reactivate"><ArrowPathIcon className="h-4 w-4" /></button>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Customer Type</label>
              <select className="input" value={form.customerType} onChange={(e) => setForm((f) => ({ ...f, customerType: e.target.value }))}>
                <option>B2C</option><option>B2B</option><option>Reseller</option>
              </select>
            </div>
            <div>
              <label className="label">GST No</label>
              <input className="input" value={form.gstNo} onChange={(e) => setForm((f) => ({ ...f, gstNo: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
