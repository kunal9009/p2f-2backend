import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getVendorOrder, updateVendorOrderStatus, updateProductionCost } from '../../api/vendor';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { PageSpinner } from '../../components/Spinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const fmtRs = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const VENDOR_NEXT = {
  'Order Received':  ['Confirmed'],
  'Confirmed':       ['Under Printing', 'Cancel by Production'],
  'Under Printing':  ['Printing Done', 'Cancel by Production'],
  'Printing Done':   ['Under Framing', 'Under Packaging'],
  'Under Framing':   ['Framing Done', 'Cancel by Production'],
  'Framing Done':    ['Under Packaging', 'Cancel by Production'],
  'Under Packaging': ['Packaging Done', 'Cancel by Production'],
  'Packaging Done':  ['Ready To Ship'],
  'Ready To Ship':   ['Order Shipped'],
};

export default function VendorOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [statusModal, setStatusModal] = useState(false);
  const [costModal, setCostModal] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', remark: '' });
  const [costForm, setCostForm] = useState({ productionCost: '', notes: '', itemCosts: [] });
  const [saving, setSaving] = useState(false);

  const reload = () => {
    getVendorOrder(id)
      .then((r) => {
        const o = r.data.data;
        setOrder(o);
        setCostForm({
          productionCost: o.totalProductionCost || '',
          notes: o.vendorNotes || '',
          itemCosts: o.items?.map((item) => ({ itemId: item._id, cost: item.productionCost || '' })) || [],
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  const handleStatusUpdate = async () => {
    setSaving(true);
    try {
      await updateVendorOrderStatus(id, statusForm);
      toast.success('Status updated');
      setStatusModal(false);
      reload();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCostUpdate = async () => {
    setSaving(true);
    try {
      await updateProductionCost(id, {
        productionCost: costForm.productionCost ? Number(costForm.productionCost) : undefined,
        notes: costForm.notes,
        itemCosts: costForm.itemCosts.filter((ic) => ic.cost).map((ic) => ({ itemId: ic.itemId, cost: Number(ic.cost) })),
      });
      toast.success('Production cost updated');
      setCostModal(false);
      reload();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <PageSpinner />;
  if (!order) return <div className="text-center py-16 text-gray-400">Order not found</div>;

  const nextStatuses = VENDOR_NEXT[order.status] || [];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{order.orderId}</h1>
            <Badge label={order.status} />
          </div>
          <p className="text-sm text-gray-400 mt-0.5">Received {format(new Date(order.createdAt), 'dd MMM yyyy')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {nextStatuses.length > 0 && (
            <button className="btn bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 btn-sm"
              onClick={() => { setStatusForm({ status: nextStatuses[0], remark: '' }); setStatusModal(true); }}>
              Update Status
            </button>
          )}
          <button className="btn-secondary btn-sm" onClick={() => setCostModal(true)}>Log Cost</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Items */}
        <div className="lg:col-span-2 card">
          <div className="px-5 py-4 border-b border-gray-200 font-semibold text-gray-900">
            Items ({order.items?.length || 0})
          </div>
          <div className="divide-y divide-gray-100">
            {order.items?.map((item, i) => (
              <div key={item._id} className="px-5 py-4">
                <div className="flex gap-4">
                  {item.designImage && (
                    <img src={`/${item.designImage}`} alt="" className="h-20 w-20 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.productName || item.productType || `Item ${i + 1}`}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      {item.size && <span>Size: <strong>{item.size}</strong></span>}
                      {item.quantity && <span>Qty: <strong>{item.quantity}</strong></span>}
                      {item.frame && <span>Frame: <strong>{item.frame}</strong></span>}
                      {item.paper && <span>Paper: <strong>{item.paper}</strong></span>}
                    </div>
                    {item.customization && (
                      <p className="text-xs text-indigo-600 mt-1 bg-indigo-50 px-2 py-1 rounded-md inline-block">
                        {item.customization}
                      </p>
                    )}
                    {item.productionCost > 0 && (
                      <p className="text-xs text-gray-400 mt-1">Production cost: {fmtRs(item.productionCost)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Shipping Address */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Ship To</h3>
            {order.shippingAddress ? (
              <address className="not-italic text-sm text-gray-600 leading-relaxed">
                <strong>{order.customerName}</strong><br />
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
              </address>
            ) : <p className="text-sm text-gray-400">No address</p>}
            {order.customerPhone && <p className="text-sm text-gray-500 mt-2">📞 {order.customerPhone}</p>}
          </div>

          {/* Production Cost */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Production Cost</h3>
            <p className="text-2xl font-bold text-gray-900">{fmtRs(order.totalProductionCost)}</p>
            {order.vendorNotes && <p className="text-xs text-gray-500 mt-2 whitespace-pre-line">{order.vendorNotes}</p>}
          </div>

          {/* Status History */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">History</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...(order.statusHistory || [])].reverse().map((h, i) => (
                <div key={i} className="text-xs">
                  <Badge label={h.toStatus} />
                  <span className="text-gray-400 ml-2">{format(new Date(h.changedAt || h.timestamp || Date.now()), 'dd MMM')}</span>
                  {h.remark && <p className="text-gray-400 mt-0.5 ml-1">"{h.remark}"</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Update Status">
        <div className="space-y-4">
          <div>
            <label className="label">New Status</label>
            <select className="input" value={statusForm.status}
              onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}>
              {nextStatuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Remark (optional)</label>
            <textarea className="input" rows={3} value={statusForm.remark}
              onChange={(e) => setStatusForm((f) => ({ ...f, remark: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setStatusModal(false)}>Cancel</button>
            <button className="btn bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleStatusUpdate} disabled={saving}>
              {saving ? 'Saving…' : 'Update'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cost Modal */}
      <Modal open={costModal} onClose={() => setCostModal(false)} title="Log Production Cost" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Total Production Cost (₹)</label>
            <input type="number" className="input" value={costForm.productionCost}
              onChange={(e) => setCostForm((f) => ({ ...f, productionCost: e.target.value }))}
              placeholder="Leave blank to auto-sum from items" />
          </div>
          {order.items?.length > 1 && (
            <div>
              <label className="label">Per-Item Costs (optional)</label>
              <div className="space-y-2">
                {costForm.itemCosts.map((ic, i) => (
                  <div key={ic.itemId} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 flex-1 truncate">
                      {order.items[i]?.productName || order.items[i]?.productType || `Item ${i + 1}`}
                    </span>
                    <input type="number" className="input w-28" placeholder="₹"
                      value={ic.cost}
                      onChange={(e) => setCostForm((f) => ({
                        ...f,
                        itemCosts: f.itemCosts.map((x, j) => j === i ? { ...x, cost: e.target.value } : x),
                      }))} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={costForm.notes}
              onChange={(e) => setCostForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setCostModal(false)}>Cancel</button>
            <button className="btn bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleCostUpdate} disabled={saving}>
              {saving ? 'Saving…' : 'Save Cost'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
