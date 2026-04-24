import { useEffect, useState, useCallback } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { getProducts, createProduct, updateProduct, deleteProduct, reactivateProduct } from '../../api/admin';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';

const TYPES = [
  { key: 'paper',         label: 'Paper' },
  { key: 'frame',         label: 'Frame' },
  { key: 'canvas',        label: 'Canvas' },
  { key: 'glass',         label: 'Glass' },
  { key: 'mount',         label: 'Mount' },
  { key: 'framematerial', label: 'Frame Material' },
  { key: 'moulding',      label: 'Moulding' },
];

const fmtRs = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

export default function Products() {
  const [activeType, setActiveType] = useState('paper');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', displayName: '', category: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (!showInactive) params.isActive = true;
    getProducts(activeType, params)
      .then((r) => { setItems(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setLoading(false));
  }, [activeType, page, showInactive]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeType]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', displayName: '', category: '', isActive: true });
    setModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, displayName: item.displayName || '', category: item.category || '', isActive: item.isActive });
    setModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateProduct(activeType, editing._id, form);
        toast.success('Updated');
      } else {
        await createProduct(activeType, form);
        toast.success('Created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Deactivate "${item.name}"?`)) return;
    try {
      await deleteProduct(activeType, item._id);
      toast.success('Deactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleReactivate = async (item) => {
    try {
      await reactivateProduct(activeType, item._id);
      toast.success('Reactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Products</h1>
        <button className="btn-primary" onClick={openCreate}>
          <PlusIcon className="h-4 w-4" /> Add {TYPES.find((t) => t.key === activeType)?.label}
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeType === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded text-blue-600" />
          Show inactive
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : items.length === 0 ? (
          <EmptyState message={`No ${activeType} products found`} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Display Name</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item._id} className={`hover:bg-gray-50 transition-colors ${!item.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.displayName || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{item.category || item.productType || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge label={item.isActive ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {item.isActive ? (
                            <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button onClick={() => handleReactivate(item)} className="p-1.5 text-gray-400 hover:text-green-600 rounded transition-colors" title="Reactivate">
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                          )}
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

      {/* Create / Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.name}` : `Add ${TYPES.find((t) => t.key === activeType)?.label}`}>
        <div className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Display Name</label>
            <input className="input" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
          </div>
          <div>
            <label className="label">Category / Type</label>
            <input className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
