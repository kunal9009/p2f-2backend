import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getVendorStats, getVendorOrders } from '../../api/vendor';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { PageSpinner } from '../../components/Spinner';
import { format } from 'date-fns';

const fmtRs = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function VendorDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getVendorStats(), getVendorOrders({ limit: 8, page: 1 })])
      .then(([s, r]) => { setStats(s.data.data); setRecent(r.data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const pipeline = stats?.ordersByStatus
    ? Object.entries(stats.ordersByStatus)
        .filter(([s]) => !['Order Completed', 'Cancelled', 'Cancel by Production'].includes(s))
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Production Dashboard</h1>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Orders"    value={stats?.total}      icon={ShoppingBagIcon}  color="blue" />
        <StatCard label="In Production"   value={stats?.inPipeline} icon={ClockIcon}        color="amber" />
        <StatCard label="Completed"       value={stats?.completed}  icon={CheckCircleIcon}  color="green" />
        <StatCard label="Cancelled"       value={stats?.cancelled}  icon={XCircleIcon}      color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline breakdown */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Current Pipeline</h2>
          {pipeline.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No active orders</p>
          ) : (
            <div className="space-y-2">
              {pipeline.map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <Badge label={status} />
                      <span className="text-sm font-semibold text-gray-700">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${Math.min((count / (stats?.inPipeline || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/vendor/orders" className="text-sm text-indigo-600 hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {recent.slice(0, 6).map((o) => (
              <Link key={o._id} to={`/vendor/orders/${o._id}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                <div>
                  <p className="font-mono text-sm font-medium text-indigo-600">{o.orderId}</p>
                  <p className="text-xs text-gray-400">{o.customerName}</p>
                </div>
                <Badge label={o.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
