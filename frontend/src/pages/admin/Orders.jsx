import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';
import { getOrders } from '../../api/admin';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import { format } from 'date-fns';

const STATUSES = [
  '', 'Order Received', 'Confirmed', 'Under Printing', 'Printing Done',
  'Under Framing', 'Framing Done', 'Under Packaging', 'Packaging Done',
  'Ready To Ship', 'Order Shipped', 'Order Completed', 'Cancelled', 'Cancel by Production',
];

const fmtRs = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '', from: '', to: '', page: 1 });

  const load = useCallback((f = filters) => {
    setLoading(true);
    const params = { page: f.page, limit: 20 };
    if (f.status) params.status = f.status;
    if (f.search) params.search = f.search;
    if (f.from) params.from = f.from;
    if (f.to) params.to = f.to;
    getOrders(params)
      .then((r) => {
        setOrders(r.data.data);
        setPagination(r.data.pagination);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(filters); }, [filters.page, filters.status]);

  const handleSearch = (e) => {
    e.preventDefault();
    load({ ...filters, page: 1 });
  };

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: 1 }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Orders</h1>
        <Link to="/admin/orders/new" className="btn-primary">
          <PlusIcon className="h-4 w-4" /> New Order
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search order ID, customer, phone…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn-secondary"><FunnelIcon className="h-4 w-4" /></button>
        </form>

        <select
          className="input w-44"
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>

        <input type="date" className="input w-36" value={filters.from}
          onChange={(e) => setFilter('from', e.target.value)} placeholder="From" />
        <input type="date" className="input w-36" value={filters.to}
          onChange={(e) => setFilter('to', e.target.value)} placeholder="To" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : orders.length === 0 ? (
          <EmptyState message="No orders found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Order ID</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Payment</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Vendor</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => (
                    <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/admin/orders/${o._id}`} className="font-mono font-medium text-blue-600 hover:underline">
                          {o.orderId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{o.customerId?.name || o.customerName}</p>
                        <p className="text-xs text-gray-400">{o.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3"><Badge label={o.status} /></td>
                      <td className="px-4 py-3"><Badge label={o.paymentStatus} /></td>
                      <td className="px-4 py-3 text-right font-medium">{fmtRs(o.totalAmount)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{o.assignedVendorId?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(o.createdAt), 'dd MMM yy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
          </>
        )}
      </div>
    </div>
  );
}
