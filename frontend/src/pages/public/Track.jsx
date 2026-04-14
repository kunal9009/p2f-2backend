import { useState } from 'react';
import axios from 'axios';
import { MagnifyingGlassIcon, TruckIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Public tracking uses unauthenticated requests directly
const publicApi = axios.create({ baseURL: '/api/public' });

const STEP_ORDER = [
  'Order Received', 'Confirmed',
  'Under Printing', 'Printing Done',
  'Under Framing', 'Framing Done',
  'Under Packaging', 'Packaging Done',
  'Ready To Ship', 'Order Shipped', 'Order Completed',
];

const STATUS_ICONS = {
  'Order Completed': CheckCircleIcon,
  'Order Shipped':   TruckIcon,
  'Cancelled':       XCircleIcon,
  'Cancel by Production': XCircleIcon,
};

const isCancelled = (s) => s === 'Cancelled' || s === 'Cancel by Production';

export default function Track() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('order'); // 'order' | 'awb'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const endpoint = mode === 'awb' ? `/track/${query.trim()}` : `/order/${query.trim().toUpperCase()}`;
      const r = await publicApi.get(endpoint);
      setResult(r.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No record found for that ID. Please check and try again.');
    } finally { setLoading(false); }
  };

  const currentStep = result?.orderStatus
    ? STEP_ORDER.indexOf(result.orderStatus)
    : result?.order?.status
      ? STEP_ORDER.indexOf(result.order.status)
      : -1;

  const status = result?.orderStatus || result?.order?.status || result?.status;
  const cancelled = isCancelled(status);

  const shipment = result?.shipment || (result?.awbNumber ? result : null);
  const orderInfo = result?.orderId ? result : result?.order;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">M</div>
          <div>
            <p className="font-bold text-gray-900 text-sm">MahattaART</p>
            <p className="text-xs text-gray-400">Order Tracking</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-12 pb-20">
        <div className="w-full max-w-2xl space-y-6">
          {/* Search box */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Track Your Order</h1>
            <p className="text-sm text-gray-500 mb-5">Enter your Order ID (e.g. ORD-20260414-0001) or courier AWB number</p>

            {/* Mode toggle */}
            <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
              {[
                { key: 'order', label: 'Order ID' },
                { key: 'awb',   label: 'AWB Number' },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => { setMode(m.key); setQuery(''); setResult(null); setError(''); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <form onSubmit={search} className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  className="input pl-9 font-mono tracking-wide"
                  placeholder={mode === 'awb' ? 'Enter AWB number…' : 'ORD-YYYYMMDD-XXXX'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary px-6">
                {loading ? (
                  <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Searching…</span>
                ) : 'Track'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Order Header */}
              <div className={`px-6 py-5 ${cancelled ? 'bg-red-50' : 'bg-blue-50'}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      {mode === 'awb' ? 'Shipment' : 'Order'}
                    </p>
                    <p className="text-xl font-bold text-gray-900 font-mono">
                      {orderInfo?.orderId || shipment?.awbNumber}
                    </p>
                    {orderInfo?.customerName && (
                      <p className="text-sm text-gray-600 mt-1">{orderInfo.customerName}</p>
                    )}
                    {orderInfo?.placedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Placed {format(new Date(orderInfo.placedAt), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {status && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                        cancelled ? 'bg-red-100 text-red-700' :
                        status === 'Order Completed' ? 'bg-green-100 text-green-700' :
                        status === 'Order Shipped' ? 'bg-sky-100 text-sky-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {(() => {
                          const Icon = STATUS_ICONS[status] || ClockIcon;
                          return <Icon className="h-4 w-4" />;
                        })()}
                        {status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {!cancelled && currentStep >= 0 && (
                <div className="px-6 py-5 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Order Progress</p>
                  <div className="relative">
                    {/* Track line */}
                    <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-gray-200">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(((currentStep) / (STEP_ORDER.length - 1)) * 100, 100)}%` }}
                      />
                    </div>
                    {/* Steps */}
                    <div className="relative flex justify-between">
                      {STEP_ORDER.filter((_, i) => [0, 2, 4, 6, 8, 9, 10].includes(i)).map((step, displayIdx) => {
                        const realIdx = [0, 2, 4, 6, 8, 9, 10][displayIdx];
                        const done = realIdx <= currentStep;
                        const active = realIdx === currentStep;
                        return (
                          <div key={step} className="flex flex-col items-center gap-2">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                              done ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                            } ${active ? 'ring-4 ring-blue-100' : ''}`}>
                              {done && <CheckCircleIcon className="h-4 w-4 text-white" />}
                            </div>
                            <p className={`text-xs text-center max-w-14 leading-tight ${done ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                              {step.replace('Order ', '').replace('Under ', '')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Shipment info */}
              {shipment && (
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Shipment Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Courier</p>
                      <p className="font-medium">{shipment.provider}</p>
                    </div>
                    {shipment.awbNumber && (
                      <div>
                        <p className="text-gray-400 text-xs">AWB Number</p>
                        {shipment.trackingUrl ? (
                          <a href={shipment.trackingUrl} target="_blank" rel="noreferrer"
                            className="font-mono font-medium text-blue-600 hover:underline text-xs">
                            {shipment.awbNumber} ↗
                          </a>
                        ) : (
                          <p className="font-mono font-medium text-xs">{shipment.awbNumber}</p>
                        )}
                      </div>
                    )}
                    {shipment.shippedAt && (
                      <div>
                        <p className="text-gray-400 text-xs">Shipped</p>
                        <p className="font-medium">{format(new Date(shipment.shippedAt), 'dd MMM yyyy')}</p>
                      </div>
                    )}
                    {shipment.estimatedDelivery && (
                      <div>
                        <p className="text-gray-400 text-xs">Est. Delivery</p>
                        <p className="font-medium text-green-600">{format(new Date(shipment.estimatedDelivery), 'dd MMM yyyy')}</p>
                      </div>
                    )}
                    {shipment.deliveredAt && (
                      <div>
                        <p className="text-gray-400 text-xs">Delivered</p>
                        <p className="font-medium text-green-600 font-bold">{format(new Date(shipment.deliveredAt), 'dd MMM yyyy')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Shipping address */}
              {orderInfo?.shippingAddress && (
                <div className="px-6 py-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Delivery Address</p>
                  <address className="not-italic text-sm text-gray-600 leading-relaxed">
                    {orderInfo.shippingAddress.line1}<br />
                    {orderInfo.shippingAddress.line2 && <>{orderInfo.shippingAddress.line2}<br /></>}
                    {orderInfo.shippingAddress.city}, {orderInfo.shippingAddress.state} {orderInfo.shippingAddress.pincode}
                  </address>
                  {orderInfo.itemCount > 0 && (
                    <p className="text-xs text-gray-400 mt-2">{orderInfo.itemCount} item(s)</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400">
            Need help? Contact us with your order ID for support.
          </p>
        </div>
      </main>
    </div>
  );
}
