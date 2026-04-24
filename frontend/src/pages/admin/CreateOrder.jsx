import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { createOrder, getCustomers, getVendors } from '../../api/admin';
import toast from 'react-hot-toast';

const SOURCES = ['WhatsApp', 'Instagram', 'Website', 'Phone', 'In-Person', 'Other'];
const PRODUCT_TYPES = ['Wall Art', 'Print & Frame', 'Wall Paper'];
const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid'];
const PAYMENT_METHODS = ['', 'Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'];

const emptyItem = () => ({
  _key: Date.now() + Math.random(),
  productType: 'Wall Art',
  productName: '',
  size: '',
  quantity: 1,
  unitPrice: '',
  customization: '',
});

const emptyAddress = { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };

export default function CreateOrder() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [manualCustomer, setManualCustomer] = useState({ name: '', email: '', phone: '' });
  const [useExistingCustomer, setUseExistingCustomer] = useState(true);
  const [source, setSource] = useState('WhatsApp');
  const [assignedVendorId, setAssignedVendorId] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [shippingAddress, setShippingAddress] = useState({ ...emptyAddress });
  const [shippingCharge, setShippingCharge] = useState('');
  const [discount, setDiscount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCustomers({ limit: 200 }).then((r) => setCustomers(r.data.data || []));
    getVendors({ limit: 100 }).then((r) => setVendors(r.data.data || []));
  }, []);

  // Compute totals
  const subtotal = items.reduce((s, item) => {
    const price = parseFloat(item.unitPrice) || 0;
    const qty = parseInt(item.quantity) || 0;
    return s + price * qty;
  }, 0);
  const totalAmount = subtotal + (parseFloat(shippingCharge) || 0) + (parseFloat(taxAmount) || 0) - (parseFloat(discount) || 0);

  const setItem = (key, field, value) =>
    setItems((prev) => prev.map((item) => item._key === key ? { ...item, [field]: value } : item));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (key) => setItems((prev) => prev.filter((item) => item._key !== key));

  const setAddr = (field, value) => setShippingAddress((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Add at least one item'); return; }

    setSaving(true);
    try {
      const selectedCustomer = useExistingCustomer && customerId
        ? customers.find((c) => c._id === customerId)
        : null;

      const payload = {
        source,
        customerId: useExistingCustomer ? customerId || undefined : undefined,
        customerName: selectedCustomer?.name || manualCustomer.name,
        customerEmail: selectedCustomer?.email || manualCustomer.email,
        customerPhone: selectedCustomer?.phone || manualCustomer.phone,
        assignedVendorId: assignedVendorId || undefined,
        items: items.map((item) => ({
          productType: item.productType,
          productName: item.productName,
          size: item.size,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1),
          customization: item.customization,
        })),
        shippingAddress,
        subtotal,
        shippingCharge: parseFloat(shippingCharge) || 0,
        discount: parseFloat(discount) || 0,
        taxAmount: parseFloat(taxAmount) || 0,
        totalAmount,
        paymentStatus,
        paymentMethod: paymentMethod || undefined,
        paidAmount: parseFloat(paidAmount) || 0,
        adminNotes,
        status: 'Order Received',
      };

      const r = await createOrder(payload);
      toast.success(`Order ${r.data.data.orderId} created`);
      navigate(`/admin/orders/${r.data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="page-title">New Order</h1>
      </div>

      {/* Customer */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Customer</h2>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" checked={useExistingCustomer} onChange={() => setUseExistingCustomer(true)} className="text-blue-600" />
            Existing customer
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" checked={!useExistingCustomer} onChange={() => setUseExistingCustomer(false)} className="text-blue-600" />
            Manual entry
          </label>
        </div>

        {useExistingCustomer ? (
          <div>
            <label className="label">Select Customer</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Select customer —</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>{c.name} · {c.phone || c.email}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={manualCustomer.name} onChange={(e) => setManualCustomer((p) => ({ ...p, name: e.target.value }))} required={!useExistingCustomer} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={manualCustomer.phone} onChange={(e) => setManualCustomer((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={manualCustomer.email} onChange={(e) => setManualCustomer((p) => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
        )}
      </div>

      {/* Order Meta */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Order Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Source *</label>
            <select className="input" value={source} onChange={(e) => setSource(e.target.value)} required>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assign Vendor</label>
            <select className="input" value={assignedVendorId} onChange={(e) => setAssignedVendorId(e.target.value)}>
              <option value="">— None —</option>
              {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Items</h2>
          <button type="button" className="btn-secondary btn-sm" onClick={addItem}>
            <PlusIcon className="h-4 w-4" /> Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={item._key} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Item {i + 1}</p>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(item._key)} className="text-red-400 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="label">Product Type</label>
                  <select className="input" value={item.productType} onChange={(e) => setItem(item._key, 'productType', e.target.value)}>
                    {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Product Name</label>
                  <input className="input" placeholder="e.g. Satin Paper" value={item.productName} onChange={(e) => setItem(item._key, 'productName', e.target.value)} />
                </div>
                <div>
                  <label className="label">Size</label>
                  <input className="input" placeholder="e.g. 12x18" value={item.size} onChange={(e) => setItem(item._key, 'size', e.target.value)} />
                </div>
                <div>
                  <label className="label">Qty</label>
                  <input className="input" type="number" min="1" value={item.quantity} onChange={(e) => setItem(item._key, 'quantity', e.target.value)} />
                </div>
                <div>
                  <label className="label">Unit Price (₹) *</label>
                  <input className="input" type="number" step="0.01" value={item.unitPrice} onChange={(e) => setItem(item._key, 'unitPrice', e.target.value)} required />
                </div>
                <div className="md:col-span-3">
                  <label className="label">Customization / Notes</label>
                  <input className="input" placeholder="Frame colour, caption, special instructions…" value={item.customization} onChange={(e) => setItem(item._key, 'customization', e.target.value)} />
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                Line total: <strong>₹{((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 flex-1">Shipping (₹)</span>
              <input className="input w-24 text-right" type="number" step="0.01" value={shippingCharge} onChange={(e) => setShippingCharge(e.target.value)} placeholder="0" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 flex-1">Tax (₹)</span>
              <input className="input w-24 text-right" type="number" step="0.01" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 flex-1">Discount (₹)</span>
              <input className="input w-24 text-right" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t pt-2 text-base">
              <span>Total</span>
              <span>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Shipping Address</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="col-span-2 md:col-span-3">
            <label className="label">Address Line 1</label>
            <input className="input" value={shippingAddress.line1} onChange={(e) => setAddr('line1', e.target.value)} />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="label">Address Line 2</label>
            <input className="input" value={shippingAddress.line2} onChange={(e) => setAddr('line2', e.target.value)} />
          </div>
          <div><label className="label">City</label><input className="input" value={shippingAddress.city} onChange={(e) => setAddr('city', e.target.value)} /></div>
          <div><label className="label">State</label><input className="input" value={shippingAddress.state} onChange={(e) => setAddr('state', e.target.value)} /></div>
          <div><label className="label">Pincode</label><input className="input" value={shippingAddress.pincode} onChange={(e) => setAddr('pincode', e.target.value)} /></div>
        </div>
      </div>

      {/* Payment */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Payment</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Payment Status</label>
            <select className="input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m || '— None —'}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount Paid (₹)</label>
            <input className="input" type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Admin Notes</h2>
        <textarea className="input" rows={3} placeholder="Internal notes…" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create Order'}
        </button>
      </div>
    </form>
  );
}
