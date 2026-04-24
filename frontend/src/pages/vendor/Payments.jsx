import { useEffect, useState } from 'react';
import { getVendorPaymentSummary, getVendorPaymentList } from '../../api/vendor';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import StatCard from '../../components/StatCard';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import { CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const fmtRs = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function VendorPayments() {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    getVendorPaymentSummary().then((r) => setSummary(r.data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (filterStatus) params.status = filterStatus;
    getVendorPaymentList(params)
      .then((r) => { setPayments(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setLoading(false));
  }, [page, filterStatus]);

  return (
    <div className="space-y-5">
      <h1 className="page-title">My Payments</h1>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Pending"  value={fmtRs(summary.Pending?.total)}  sub={`${summary.Pending?.count || 0} entries`}  icon={CurrencyRupeeIcon} color="amber" />
          <StatCard label="Paid"     value={fmtRs(summary.Paid?.total)}     sub={`${summary.Paid?.count || 0} entries`}     icon={CurrencyRupeeIcon} color="green" />
          <StatCard label="Disputed" value={fmtRs(summary.Disputed?.total)} sub={`${summary.Disputed?.count || 0} entries`} icon={CurrencyRupeeIcon} color="red" />
        </div>
      )}

      {/* Filter */}
      <div className="card p-4">
        <select className="input w-36" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All</option><option>Pending</option><option>Paid</option><option>Disputed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : payments.length === 0 ? (
          <EmptyState message="No payment records" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 text-indigo-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Payment Date</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-left">Orders</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{fmtRs(p.amount)}</td>
                      <td className="px-4 py-3"><Badge label={p.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.paymentDate ? format(new Date(p.paymentDate), 'dd MMM yyyy') : '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{p.referenceNumber || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.orderIds?.length || 0} order(s)</td>
                      <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-40">{p.notes || '—'}</td>
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
