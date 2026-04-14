import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon, PencilIcon, TrashIcon, ArrowPathIcon, ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import {
  getCustomer, getCustomerOrders, updateCustomer, deleteCustomer, reactivateCustomer,
} from '../../api/admin';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const fmtRs = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const loadCustomer = () =>
    getCustomer(id).then((r) => {
      setCustomer(r.data.data);
      setForm({
        name: r.data.data.name,
        email: r.data.data.email || '',
        phone: r.data.data.phone || '',
        customerType: r.data.data.customerType || 'B2C',
        gstNo: r.data.data.gstNo || '',
      });
    });

  const loadOrders = (p = page) => {
    setOrdersLoading(true);
    getCustomerOrders(id, { page: p, limit: 10 })
      .then((r) => { setOrders(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setOrdersLoading(false));
  };

  useEffect(() => {
    Promise.all([loadCustomer(), loadOrders(1)]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (!loading) loadOrders(page); }, [page]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCustomer(id, form);
      toast.success('Customer updated');
      setEditModal(false);
      loadCustomer();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    if (!confirm('Deactivate this customer?')) return;
    try {
      await deleteCustomer(id);
      toast.success('Deactivated');
      navigate('/admin/customers');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReactivate = async () => {
    try {
      await reactivateCustomer(id);
      toast.success('Reactivated');
      loadCustomer();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <PageSpinner />;
  if (!customer) return <div className="text-center py-16 text-gray-400">Customer not found</div>;

  // Compute order stats from what we have
  const totalSpent = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{customer.name}</h1>
            <Badge label={customer.isActive ? 'active' : 'inactive'} />
            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{customer.customerId}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Customer since {format(new Date(customer.createdAt), 'dd MMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setEditModal(true)}>
            <PencilIcon className="h-4 w-4" /> Edit
          </button>
          {customer.isActive ? (
            <button className="btn-danger btn-sm" onClick={handleDeactivate}>
              <TrashIcon className="h-4 w-4" /> Deactivate
            </button>
          ) : (
            <button className="btn-secondary btn-sm" onClick={handleReactivate}>
              <ArrowPathIcon className="h-4 w-4" /> Reactivate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Profile</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium">{customer.customerType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-right truncate max-w-40">{customer.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{customer.phone || '—'}</span>
              </div>
              {customer.gstNo && (
                <div className="flex justify-between">
                  <span className="text-gray-500">GST</span>
                  <span className="font-mono text-xs">{customer.gstNo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Order Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><ShoppingBagIcon className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-400">Total Orders</p>
                  <p className="font-bold text-gray-900">{pagination.total}</p>
                </div>
              </div>
              <div className="h-px bg-gray-100" />
              <div>
                <p className="text-xs text-gray-400 mb-1">Lifetime Spend (visible)</p>
                <p className="text-lg font-bold text-gray-900">{fmtRs(totalSpent)}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          {customer.address && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Address</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{customer.address}</p>
            </div>
          )}
        </div>

        {/* Order history */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 font-semibold text-gray-900">
            Order History
          </div>
          {ordersLoading ? <PageSpinner /> : orders.length === 0 ? (
            <EmptyState message="No orders yet" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Order ID</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Payment</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Vendor</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((o) => (
                      <tr key={o._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link to={`/admin/orders/${o._id}`} className="font-mono text-blue-600 hover:underline text-xs font-medium">
                            {o.orderId}
                          </Link>
                        </td>
                        <td className="px-4 py-3"><Badge label={o.status} /></td>
                        <td className="px-4 py-3"><Badge label={o.paymentStatus} /></td>
                        <td className="px-4 py-3 text-right font-medium">{fmtRs(o.totalAmount)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{o.assignedVendorId?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(o.createdAt), 'dd MMM yy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination {...pagination} onChange={setPage} />
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Customer">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input className="input" value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Customer Type</label>
              <select className="input" value={form.customerType || 'B2C'} onChange={(e) => setForm((f) => ({ ...f, customerType: e.target.value }))}>
                <option>B2C</option><option>B2B</option><option>Reseller</option>
              </select>
            </div>
            <div>
              <label className="label">GST No</label>
              <input className="input" value={form.gstNo || ''} onChange={(e) => setForm((f) => ({ ...f, gstNo: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
