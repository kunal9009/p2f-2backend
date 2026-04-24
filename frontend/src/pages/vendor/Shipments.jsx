import { useEffect, useState, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getVendorShipments, createShipment, updateShipment } from '../../api/vendor';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COURIER_PROVIDERS = ['Delhivery', 'Blue Dart', 'DTDC', 'Ekart', 'Xpressbees', 'Shadowfax', 'Other'];

const emptyCreate = { orderId: '', provider: '', mode: 'Surface', packageWeight: '', packageLength: '', packageWidth: '', packageHeight: '' };

export default function VendorShipments() {
  const [shipments, setShipments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [createModal, setCreateModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [updateForm, setUpdateForm] = useState({ awbNumber: '', trackingUrl: '', status: '', shippedAt: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getVendorShipments({ page, limit: 20 })
      .then((r) => { setShipments(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload = {
        ...createForm,
        packageWeight: Number(createForm.packageWeight),
        packageLength: createForm.packageLength ? Number(createForm.packageLength) : undefined,
        packageWidth: createForm.packageWidth ? Number(createForm.packageWidth) : undefined,
        packageHeight: createForm.packageHeight ? Number(createForm.packageHeight) : undefined,
      };
      await createShipment(payload);
      toast.success('Shipment created');
      setCreateModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const payload = { ...updateForm };
      if (!payload.shippedAt) delete payload.shippedAt;
      await updateShipment(selected._id, payload);
      toast.success('Shipment updated');
      setUpdateModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const openUpdate = (s) => {
    setSelected(s);
    setUpdateForm({ awbNumber: s.awbNumber || '', trackingUrl: s.trackingUrl || '', status: s.status || '', shippedAt: s.shippedAt ? format(new Date(s.shippedAt), "yyyy-MM-dd'T'HH:mm") : '' });
    setUpdateModal(true);
  };

  const f = (setter) => (k) => (e) => setter((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Shipments</h1>
        <button className="btn bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500" onClick={() => { setCreateForm(emptyCreate); setCreateModal(true); }}>
          <PlusIcon className="h-4 w-4" /> New Shipment
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : shipments.length === 0 ? (
          <EmptyState message="No shipments yet" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 text-indigo-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Courier</th>
                    <th className="px-4 py-3 text-left">AWB</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Weight</th>
                    <th className="px-4 py-3 text-left">Shipped At</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shipments.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-indigo-600 text-xs">{s.orderId?.orderId}</td>
                      <td className="px-4 py-3 text-gray-700">{s.provider}</td>
                      <td className="px-4 py-3">
                        {s.awbNumber ? (
                          s.trackingUrl
                            ? <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-600 hover:underline">{s.awbNumber}</a>
                            : <span className="font-mono text-xs">{s.awbNumber}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3"><Badge label={s.status || 'Pending'} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.packageWeight} kg</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{s.shippedAt ? format(new Date(s.shippedAt), 'dd MMM yy') : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openUpdate(s)} className="btn-secondary btn-sm">Update</button>
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

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Shipment">
        <div className="space-y-4">
          <div>
            <label className="label">Order ID (MongoDB _id) *</label>
            <input className="input font-mono text-sm" value={createForm.orderId} onChange={f(setCreateForm)('orderId')} placeholder="Paste order _id from the Orders page" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Courier Provider *</label>
              <select className="input" value={createForm.provider} onChange={f(setCreateForm)('provider')}>
                <option value="">Select…</option>
                {COURIER_PROVIDERS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Mode</label>
              <select className="input" value={createForm.mode} onChange={f(setCreateForm)('mode')}>
                <option>Surface</option><option>Air</option>
              </select>
            </div>
            <div><label className="label">Weight (kg) *</label><input type="number" step="0.01" className="input" value={createForm.packageWeight} onChange={f(setCreateForm)('packageWeight')} /></div>
            <div><label className="label">Length (cm)</label><input type="number" className="input" value={createForm.packageLength} onChange={f(setCreateForm)('packageLength')} /></div>
            <div><label className="label">Width (cm)</label><input type="number" className="input" value={createForm.packageWidth} onChange={f(setCreateForm)('packageWidth')} /></div>
            <div><label className="label">Height (cm)</label><input type="number" className="input" value={createForm.packageHeight} onChange={f(setCreateForm)('packageHeight')} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button className="btn bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleCreate}
              disabled={saving || !createForm.orderId || !createForm.provider || !createForm.packageWeight}>
              {saving ? 'Creating…' : 'Create Shipment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Update Modal */}
      <Modal open={updateModal} onClose={() => setUpdateModal(false)} title="Update Shipment" size="sm">
        <div className="space-y-4">
          <div><label className="label">AWB / Tracking Number</label><input className="input font-mono" value={updateForm.awbNumber} onChange={f(setUpdateForm)('awbNumber')} /></div>
          <div><label className="label">Tracking URL</label><input className="input" type="url" value={updateForm.trackingUrl} onChange={f(setUpdateForm)('trackingUrl')} /></div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={updateForm.status} onChange={f(setUpdateForm)('status')}>
              <option value="">— No change —</option>
              {['Booked', 'In Transit', 'Out for Delivery', 'Delivered', 'RTO', 'Lost'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="label">Shipped At</label><input className="input" type="datetime-local" value={updateForm.shippedAt} onChange={f(setUpdateForm)('shippedAt')} /></div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setUpdateModal(false)}>Cancel</button>
            <button className="btn bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleUpdate} disabled={saving}>
              {saving ? 'Saving…' : 'Update'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
