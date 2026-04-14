import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon, PencilIcon, ClockIcon, TruckIcon,
  DocumentTextIcon, CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';
import {
  getOrder, getOrderHistory, updateOrderStatus,
  assignVendor, updatePayment, updateNotes, generateInvoice, getVendors,
} from '../../api/admin';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { PageSpinner } from '../../components/Spinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const fmtRs = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const TRANSITIONS = {
  'Order Received':  ['Confirmed', 'Cancelled'],
  'Confirmed':       ['Under Printing', 'Cancelled'],
  'Under Printing':  ['Printing Done', 'Cancel by Production'],
  'Printing Done':   ['Under Framing', 'Under Packaging'],
  'Under Framing':   ['Framing Done', 'Cancel by Production'],
  'Framing Done':    ['Under Packaging', 'Cancel by Production'],
  'Under Packaging': ['Packaging Done', 'Cancel by Production'],
  'Packaging Done':  ['Ready To Ship'],
  'Ready To Ship':   ['Order Shipped'],
  'Order Shipped':   ['Order Completed'],
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusModal, setStatusModal] = useState(false);
  const [vendorModal, setVendorModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [notesModal, setNotesModal] = useState(false);

  const [statusForm, setStatusForm] = useState({ status: '', remark: '' });
  const [vendorId, setVendorId] = useState('');
  const [paymentForm, setPaymentForm] = useState({ paymentStatus: '', paymentMethod: '', paidAmount: '' });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = () => {
    Promise.all([getOrder(id), getOrderHistory(id), getVendors()])
      .then(([o, h, v]) => {
        setOrder(o.data.data);
        setHistory(h.data.data.history || []);
        setVendors(v.data.data || []);
        setNotes(o.data.data.adminNotes || '');
        setPaymentForm({
          paymentStatus: o.data.data.paymentStatus || '',
          paymentMethod: o.data.data.paymentMethod || '',
          paidAmount: o.data.data.paidAmount || '',
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  const handleStatusUpdate = async () => {
    setSaving(true);
    try {
      await updateOrderStatus(id, statusForm);
      toast.success('Status updated');
      setStatusModal(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleAssignVendor = async () => {
    setSaving(true);
    try {
      await assignVendor(id, vendorId);
      toast.success('Vendor assigned');
      setVendorModal(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handlePayment = async () => {
    setSaving(true);
    try {
      await updatePayment(id, paymentForm);
      toast.success('Payment updated');
      setPaymentModal(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleNotes = async () => {
    setSaving(true);
    try {
      await updateNotes(id, notes);
      toast.success('Notes saved');
      setNotesModal(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleGenerateInvoice = async () => {
    try {
      await generateInvoice(id, {});
      toast.success('Invoice generated');
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <PageSpinner />;
  if (!order) return <div className="text-center py-16 text-gray-400">Order not found</div>;

  const nextStatuses = TRANSITIONS[order.status] || [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{order.orderId}</h1>
            <Badge label={order.status} />
            <Badge label={order.paymentStatus} />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Placed {format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {nextStatuses.length > 0 && (
            <button className="btn-primary btn-sm" onClick={() => {
              setStatusForm({ status: nextStatuses[0], remark: '' });
              setStatusModal(true);
            }}>
              <ClockIcon className="h-4 w-4" /> Update Status
            </button>
          )}
          {!order.invoiceId && order.status === 'Order Completed' && (
            <button className="btn-secondary btn-sm" onClick={handleGenerateInvoice}>
              <DocumentTextIcon className="h-4 w-4" /> Generate Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-200 font-semibold text-gray-900">
              Order Items ({order.items?.length || 0})
            </div>
            <div className="divide-y divide-gray-100">
              {order.items?.map((item) => (
                <div key={item._id} className="px-5 py-4 flex gap-4">
                  {item.designImage && (
                    <img src={`/${item.designImage}`} alt="" className="h-16 w-16 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{item.productName || item.productType}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Size: {item.size} · Qty: {item.quantity}
                      {item.frame && ` · Frame: ${item.frame}`}
                    </p>
                    {item.customization && (
                      <p className="text-xs text-gray-500 mt-1">{item.customization}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">{fmtRs(item.totalPrice)}</p>
                    <p className="text-xs text-gray-400">{fmtRs(item.unitPrice)} × {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmtRs(order.subtotal)}</span></div>
              {order.shippingCharge > 0 && <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{fmtRs(order.shippingCharge)}</span></div>}
              {order.discount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{fmtRs(order.discount)}</span></div>}
              <div className="flex justify-between font-bold text-gray-900 border-t pt-1 mt-1 text-base">
                <span>Total</span><span>{fmtRs(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-200 font-semibold text-gray-900">Status History</div>
            <div className="px-5 py-4 space-y-3">
              {history.length === 0 ? (
                <p className="text-gray-400 text-sm">No history yet</p>
              ) : [...history].reverse().map((h, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.fromStatus && <span className="text-gray-400 line-through text-xs">{h.fromStatus}</span>}
                      <Badge label={h.toStatus} />
                      <span className="text-gray-400 text-xs">
                        by {h.changedBy?.name || h.changedByRole} · {format(new Date(h.changedAt || h.timestamp || Date.now()), 'dd MMM, hh:mm a')}
                      </span>
                    </div>
                    {h.remark && <p className="text-gray-500 text-xs mt-0.5">"{h.remark}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Customer</h3>
            <p className="font-medium text-gray-900">{order.customerId?.name || order.customerName}</p>
            <p className="text-sm text-gray-500">{order.customerEmail}</p>
            <p className="text-sm text-gray-500">{order.customerPhone}</p>
            {order.customerId?._id && (
              <Link to={`/admin/customers/${order.customerId._id}`} className="text-xs text-blue-600 hover:underline mt-2 block">
                View Customer →
              </Link>
            )}
          </div>

          {/* Shipping Address */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
            {order.shippingAddress ? (
              <address className="not-italic text-sm text-gray-600 leading-relaxed">
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}<br />
                {order.shippingAddress.country || 'India'}
              </address>
            ) : <p className="text-sm text-gray-400">No address</p>}
          </div>

          {/* Payment */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Payment</h3>
              <button className="text-blue-600 text-xs hover:underline" onClick={() => setPaymentModal(true)}>
                <PencilIcon className="h-3 w-3 inline mr-1" />Edit
              </button>
            </div>
            <Badge label={order.paymentStatus} />
            <p className="text-sm text-gray-500 mt-2">{order.paymentMethod || 'Method not set'}</p>
            {order.paidAmount > 0 && (
              <p className="text-sm text-gray-500">Paid: {fmtRs(order.paidAmount)}</p>
            )}
          </div>

          {/* Vendor */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Assigned Vendor</h3>
              <button className="text-blue-600 text-xs hover:underline" onClick={() => { setVendorId(order.assignedVendorId?._id || ''); setVendorModal(true); }}>
                <TruckIcon className="h-3 w-3 inline mr-1" />{order.assignedVendorId ? 'Change' : 'Assign'}
              </button>
            </div>
            {order.assignedVendorId ? (
              <p className="text-sm font-medium text-gray-900">{order.assignedVendorId.name}</p>
            ) : (
              <p className="text-sm text-gray-400">Not assigned</p>
            )}
          </div>

          {/* Production Cost */}
          {order.totalProductionCost > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Production Cost</h3>
              <p className="text-lg font-bold text-gray-900">{fmtRs(order.totalProductionCost)}</p>
              <p className="text-xs text-gray-400 mt-1">
                Margin: {fmtRs(order.totalAmount - order.totalProductionCost)}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Admin Notes</h3>
              <button className="text-blue-600 text-xs hover:underline" onClick={() => setNotesModal(true)}>
                <PencilIcon className="h-3 w-3 inline mr-1" />Edit
              </button>
            </div>
            <p className="text-sm text-gray-500 whitespace-pre-line">{order.adminNotes || 'No notes'}</p>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Update Order Status">
        <div className="space-y-4">
          <div>
            <label className="label">New Status</label>
            <select className="input" value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}>
              {nextStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Remark (optional)</label>
            <textarea className="input" rows={3} value={statusForm.remark}
              onChange={(e) => setStatusForm((f) => ({ ...f, remark: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setStatusModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleStatusUpdate} disabled={saving}>
              {saving ? 'Saving…' : 'Update Status'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Vendor Modal */}
      <Modal open={vendorModal} onClose={() => setVendorModal(false)} title="Assign Vendor">
        <div className="space-y-4">
          <div>
            <label className="label">Select Vendor</label>
            <select className="input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">— Select —</option>
              {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setVendorModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAssignVendor} disabled={saving || !vendorId}>
              {saving ? 'Saving…' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Update Payment">
        <div className="space-y-4">
          <div>
            <label className="label">Payment Status</label>
            <select className="input" value={paymentForm.paymentStatus}
              onChange={(e) => setPaymentForm((f) => ({ ...f, paymentStatus: e.target.value }))}>
              {['Pending', 'Partial', 'Paid', 'Refunded'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
              <option value="">— Select —</option>
              {['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount Paid (₹)</label>
            <input type="number" className="input" value={paymentForm.paidAmount}
              onChange={(e) => setPaymentForm((f) => ({ ...f, paidAmount: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setPaymentModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handlePayment} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      {/* Notes Modal */}
      <Modal open={notesModal} onClose={() => setNotesModal(false)} title="Admin Notes">
        <div className="space-y-4">
          <textarea className="input" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setNotesModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleNotes} disabled={saving}>{saving ? 'Saving…' : 'Save Notes'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
