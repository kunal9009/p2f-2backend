import { useEffect, useState, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import {
  getVendorPayments, createVendorPayment, updateVendorPaymentStatus,
  getVendorLedger, getVendors,
} from '../../api/admin';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import StatCard from '../../components/StatCard';
import { CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const fmtRs = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function VendorPayments() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [filterVendor, setFilterVendor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const [ledger, setLedger] = useState(null);
  const [ledgerVendorId, setLedgerVendorId] = useState('');

  const [createModal, setCreateModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [createForm, setCreateForm] = useState({ vendorId: '', amount: '', notes: '', paymentDate: format(new Date(), 'yyyy-MM-dd') });
  const [statusForm, setStatusForm] = useState({ status: 'Paid', referenceNumber: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback((p = page) => {
    setLoading(true);
    const params = { page: p, limit: 20 };
    if (filterVendor) params.vendorId = filterVendor;
    if (filterStatus) params.status = filterStatus;
    getVendorPayments(params)
      .then((r) => { setPayments(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setLoading(false));
  }, [filterVendor, filterStatus, page]);

  useEffect(() => { load(page); }, [page, filterVendor, filterStatus]);
  useEffect(() => { getVendors().then((r) => setVendors(r.data.data || [])); }, []);

  const loadLedger = async () => {
    if (!ledgerVendorId) return;
    try {
      const r = await getVendorLedger(ledgerVendorId);
      setLedger(r.data.data);
    } catch (err) { toast.error('Failed to load ledger'); }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createVendorPayment({ ...createForm, amount: Number(createForm.amount) });
      toast.success('Payment recorded');
      setCreateModal(false);
      load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleStatusUpdate = async () => {
    setSaving(true);
    try {
      await updateVendorPaymentStatus(selected._id, statusForm);
      toast.success('Status updated');
      setStatusModal(false);
      load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Vendor Payments</h1>
        <button className="btn-primary" onClick={() => { setCreateForm({ vendorId: '', amount: '', notes: '', paymentDate: format(new Date(), 'yyyy-MM-dd') }); setCreateModal(true); }}>
          <PlusIcon className="h-4 w-4" /> Record Payment
        </button>
      </div>

      {/* Ledger lookup */}
      <div className="card p-4 space-y-3">
        <p className="font-medium text-gray-700 text-sm">Vendor Ledger</p>
        <div className="flex gap-2">
          <select className="input flex-1" value={ledgerVendorId} onChange={(e) => setLedgerVendorId(e.target.value)}>
            <option value="">Select vendor…</option>
            {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
          <button className="btn-secondary" onClick={loadLedger} disabled={!ledgerVendorId}>View Ledger</button>
        </div>
        {ledger && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <StatCard label="Total Production Cost" value={fmtRs(ledger.totalProductionCost)} icon={CurrencyRupeeIcon} color="amber" />
            <StatCard label="Total Paid"            value={fmtRs(ledger.totalPaid)}            icon={CurrencyRupeeIcon} color="green" />
            <StatCard label="Outstanding"           value={fmtRs(ledger.outstanding)}          icon={CurrencyRupeeIcon} color="red" />
            <StatCard label="Orders"                value={ledger.orderCount}                                           color="blue" />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-44" value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)}>
          <option value="">All Vendors</option>
          {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
        <select className="input w-36" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Pending</option><option>Paid</option><option>Disputed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : payments.length === 0 ? (
          <EmptyState message="No payments found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Vendor</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Payment Date</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.vendorId?.name}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtRs(p.amount)}</td>
                      <td className="px-4 py-3"><Badge label={p.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.paymentDate ? format(new Date(p.paymentDate), 'dd MMM yy') : '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{p.referenceNumber || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-32">{p.notes || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'Pending' && (
                          <button
                            onClick={() => { setSelected(p); setStatusForm({ status: 'Paid', referenceNumber: '', notes: '' }); setStatusModal(true); }}
                            className="btn-secondary btn-sm"
                          >
                            Mark Paid
                          </button>
                        )}
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
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Record Vendor Payment">
        <div className="space-y-4">
          <div>
            <label className="label">Vendor *</label>
            <select className="input" value={createForm.vendorId} onChange={(e) => setCreateForm((f) => ({ ...f, vendorId: e.target.value }))}>
              <option value="">Select vendor…</option>
              {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount (₹) *</label><input className="input" type="number" value={createForm.amount} onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))} /></div>
            <div><label className="label">Payment Date</label><input className="input" type="date" value={createForm.paymentDate} onChange={(e) => setCreateForm((f) => ({ ...f, paymentDate: e.target.value }))} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={3} value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving || !createForm.vendorId || !createForm.amount}>
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Status Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Update Payment Status" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Status</label>
            <select className="input" value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}>
              <option>Paid</option><option>Disputed</option>
            </select>
          </div>
          <div><label className="label">Reference Number</label><input className="input" value={statusForm.referenceNumber} onChange={(e) => setStatusForm((f) => ({ ...f, referenceNumber: e.target.value }))} /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={statusForm.notes} onChange={(e) => setStatusForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setStatusModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleStatusUpdate} disabled={saving}>{saving ? 'Saving…' : 'Update'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
