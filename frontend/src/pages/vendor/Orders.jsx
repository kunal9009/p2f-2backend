import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getVendorOrders } from '../../api/vendor';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import { format } from 'date-fns';

const VENDOR_STATUSES = [
  '', 'Order Received', 'Confirmed', 'Under Printing', 'Printing Done',
  'Under Framing', 'Framing Done', 'Under Packaging', 'Packaging Done',
  'Ready To Ship', 'Order Shipped', 'Order Completed', 'Cancel by Production',
];

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (status) params.status = status;
    if (search) params.search = search;
    getVendorOrders(params)
      .then((r) => { setOrders(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { e.preventDefault(); load(); };

  return (
    <div className="space-y-4">
      <h1 className="page-title">My Orders</h1>

      <div className="card p-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search order ID, customer…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500">Search</button>
        </form>
        <select className="input w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {VENDOR_STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : orders.length === 0 ? (
          <EmptyState message="No orders assigned" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 text-indigo-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Order ID</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => (
                    <tr key={o._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-indigo-600">{o.orderId}</td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 font-medium">{o.customerId?.name || o.customerName}</p>
                        <p className="text-xs text-gray-400">{o.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3"><Badge label={o.status} /></td>
                      <td className="px-4 py-3 text-center text-gray-500">{o.items?.length ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(o.createdAt), 'dd MMM yy')}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/vendor/orders/${o._id}`} className="btn bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 btn-sm">
                          Open
                        </Link>
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
    </div>
  );
}
