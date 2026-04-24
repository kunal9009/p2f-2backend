import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBagIcon, CheckCircleIcon, XCircleIcon,
  UsersIcon, TruckIcon, CurrencyRupeeIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';
import { getDashboardStats, getRecentOrders, getPipeline } from '../../api/admin';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { PageSpinner } from '../../components/Spinner';
import { format } from 'date-fns';

const fmt = (n) => n?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '0';
const fmtRs = (n) => `₹${fmt(n)}`;

const PIPELINE_COLORS = [
  '#3b82f6','#6366f1','#f59e0b','#06b6d4','#f97316',
  '#84cc16','#a855f7','#14b8a6','#10b981','#0ea5e9',
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getRecentOrders(8), getPipeline()])
      .then(([s, r, p]) => {
        setStats(s.data.data);
        setRecent(r.data.data);
        setPipeline(p.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Today: {format(new Date(), 'dd MMM yyyy')}</p>
      </div>

      {/* Today's quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-4 col-span-2 md:col-span-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <p className="text-blue-100 text-sm font-medium">Today's Revenue</p>
          <p className="text-3xl font-bold mt-1">{fmtRs(stats?.today?.revenue)}</p>
          <div className="flex gap-6 mt-2 text-blue-100 text-sm">
            <span>{stats?.today?.orders} orders</span>
            <span>{stats?.today?.newCustomers} new customers</span>
          </div>
        </div>
      </div>

      {/* All-time stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Orders"     value={fmt(stats?.totalOrders)}     icon={ShoppingBagIcon} color="blue" />
        <StatCard label="Pending"          value={fmt(stats?.pendingOrders)}    icon={ClockIcon}       color="amber" />
        <StatCard label="Completed"        value={fmt(stats?.completedOrders)}  icon={CheckCircleIcon} color="green" />
        <StatCard label="Cancelled"        value={fmt(stats?.cancelledOrders)}  icon={XCircleIcon}     color="red" />
        <StatCard label="Customers"        value={fmt(stats?.totalCustomers)}   icon={UsersIcon}       color="purple" />
        <StatCard label="Vendors"          value={fmt(stats?.totalVendors)}     icon={TruckIcon}       color="cyan" />
      </div>

      {/* Revenue + profit */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Revenue"        value={fmtRs(stats?.totalRevenue)}        icon={CurrencyRupeeIcon} color="green" />
        <StatCard label="Total Production Cost" value={fmtRs(stats?.totalProductionCost)} icon={CurrencyRupeeIcon} color="amber" />
        <StatCard label="Gross Profit"         value={fmtRs(stats?.profit)}              icon={CurrencyRupeeIcon} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Pipeline */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Production Pipeline</h2>
          {pipeline.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No active orders</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipeline} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="_id" type="category" tick={{ fontSize: 11 }} width={130} />
                <Tooltip formatter={(v) => [v, 'Orders']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {pipeline.map((_, i) => (
                    <Cell key={i} fill={PIPELINE_COLORS[i % PIPELINE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders by Status donut-style */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {stats?.ordersByStatus && Object.entries(stats.ordersByStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between py-1">
                  <Badge label={status} />
                  <span className="text-sm font-semibold text-gray-700">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link to="/admin/orders" className="text-sm text-blue-600 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Order ID</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-blue-600">
                    <Link to={`/admin/orders/${order._id}`}>{order.orderId}</Link>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{order.customerId?.name || order.customerName}</td>
                  <td className="px-5 py-3"><Badge label={order.status} /></td>
                  <td className="px-5 py-3 text-right font-medium">{fmtRs(order.totalAmount)}</td>
                  <td className="px-5 py-3 text-gray-400">{format(new Date(order.createdAt), 'dd MMM')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
