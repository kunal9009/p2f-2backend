import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { getRevenueReport, getOrdersReport, getVendorPerformance } from '../../api/admin';
import StatCard from '../../components/StatCard';
import { PageSpinner } from '../../components/Spinner';
import { CurrencyRupeeIcon, ShoppingBagIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { format, subDays } from 'date-fns';

const fmtRs = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const today = () => format(new Date(), 'yyyy-MM-dd');
const monthAgo = () => format(subDays(new Date(), 30), 'yyyy-MM-dd');

export default function Reports() {
  const [tab, setTab] = useState('revenue');
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());
  const [groupBy, setGroupBy] = useState('day');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { from, to, groupBy };
    const fetcher = tab === 'revenue' ? getRevenueReport : tab === 'orders' ? getOrdersReport : getVendorPerformance;
    fetcher(params)
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const timeSeries = data?.timeSeries || data?.series || [];
  const totals = data?.totals || data?.summary || {};

  return (
    <div className="space-y-5">
      <h1 className="page-title">Reports</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'revenue', label: 'Revenue' },
          { key: 'orders',  label: 'Orders' },
          { key: 'vendor',  label: 'Vendor Performance' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-36" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {tab !== 'vendor' && (
          <div>
            <label className="label">Group By</label>
            <select className="input w-28" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        )}
        <button className="btn-primary" onClick={load}>Apply</button>
      </div>

      {loading ? <PageSpinner /> : !data ? null : (
        <>
          {/* Summary cards */}
          {tab === 'revenue' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Revenue"  value={fmtRs(totals.totalRevenue)}  icon={CurrencyRupeeIcon} color="green" />
              <StatCard label="Production Cost" value={fmtRs(totals.totalCost)}     icon={CurrencyRupeeIcon} color="amber" />
              <StatCard label="Gross Profit"    value={fmtRs(totals.totalProfit)}   icon={CurrencyRupeeIcon} color="blue" />
              <StatCard label="Orders"          value={totals.orderCount}           icon={ShoppingBagIcon}   color="purple" />
            </div>
          )}
          {tab === 'orders' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Orders"    value={totals.totalOrders}     icon={ShoppingBagIcon} color="blue" />
              <StatCard label="Completed"       value={totals.completedOrders} icon={ShoppingBagIcon} color="green" />
              <StatCard label="Cancelled"       value={totals.cancelledOrders} icon={ShoppingBagIcon} color="red" />
              <StatCard label="Avg Order Value" value={fmtRs(totals.avgOrderValue)} icon={CurrencyRupeeIcon} color="purple" />
            </div>
          )}

          {/* Chart */}
          {timeSeries.length > 0 && tab !== 'vendor' && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">
                {tab === 'revenue' ? 'Revenue & Cost Over Time' : 'Orders Over Time'}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeries} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, n) => [tab === 'revenue' ? fmtRs(v) : v, n]} />
                  <Legend />
                  {tab === 'revenue' ? (
                    <>
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#rev)" name="Revenue" />
                      <Area type="monotone" dataKey="productionCost" stroke="#f59e0b" fill="url(#cost)" name="Cost" />
                    </>
                  ) : (
                    <Area type="monotone" dataKey="orderCount" stroke="#6366f1" fill="#6366f133" name="Orders" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Vendor Performance table */}
          {tab === 'vendor' && Array.isArray(data) && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 font-semibold">Vendor Performance</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Vendor</th>
                      <th className="px-4 py-3 text-right">Orders</th>
                      <th className="px-4 py-3 text-right">Completed</th>
                      <th className="px-4 py-3 text-right">Cancelled</th>
                      <th className="px-4 py-3 text-right">Production Cost</th>
                      <th className="px-4 py-3 text-right">Avg Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.map((row) => (
                      <tr key={row.vendorId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.vendorName}</td>
                        <td className="px-4 py-3 text-right">{row.totalOrders}</td>
                        <td className="px-4 py-3 text-right text-green-600">{row.completedOrders}</td>
                        <td className="px-4 py-3 text-right text-red-500">{row.cancelledOrders}</td>
                        <td className="px-4 py-3 text-right">{fmtRs(row.totalProductionCost)}</td>
                        <td className="px-4 py-3 text-right">{row.avgCompletionDays?.toFixed(1) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
