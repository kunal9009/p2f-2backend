import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import VendorLayout from './layouts/VendorLayout';

// Admin pages
import AdminLogin    from './pages/admin/Login';
import Dashboard     from './pages/admin/Dashboard';
import Orders        from './pages/admin/Orders';
import OrderDetail   from './pages/admin/OrderDetail';
import Products      from './pages/admin/Products';
import Customers     from './pages/admin/Customers';
import Vendors       from './pages/admin/Vendors';
import Invoices      from './pages/admin/Invoices';
import Reports       from './pages/admin/Reports';
import Pricing       from './pages/admin/Pricing';
import Users         from './pages/admin/Users';
import VendorPayments from './pages/admin/VendorPayments';

// Vendor pages
import VendorLogin        from './pages/vendor/Login';
import VendorDashboard    from './pages/vendor/Dashboard';
import VendorOrders       from './pages/vendor/Orders';
import VendorOrderDetail  from './pages/vendor/OrderDetail';
import VendorShipments    from './pages/vendor/Shipments';
import VendorPaymentsPage from './pages/vendor/Payments';

import { PageSpinner } from './components/Spinner';

function AdminGuard({ children }) {
  const { adminUser, adminLoading } = useAuth();
  if (adminLoading) return <PageSpinner />;
  if (!adminUser) return <Navigate to="/admin/login" replace />;
  return children;
}

function VendorGuard({ children }) {
  const { vendorUser, vendorLoading } = useAuth();
  if (vendorLoading) return <PageSpinner />;
  if (!vendorUser) return <Navigate to="/vendor/login" replace />;
  return children;
}

function AppRoutes() {
  const { adminUser, vendorUser } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Admin login (redirect if already logged in) */}
      <Route path="/admin/login" element={
        adminUser ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />
      } />

      {/* Admin panel */}
      <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"       element={<Dashboard />} />
        <Route path="orders"          element={<Orders />} />
        <Route path="orders/:id"      element={<OrderDetail />} />
        <Route path="products"        element={<Products />} />
        <Route path="customers"       element={<Customers />} />
        <Route path="vendors"         element={<Vendors />} />
        <Route path="invoices"        element={<Invoices />} />
        <Route path="reports"         element={<Reports />} />
        <Route path="pricing"         element={<Pricing />} />
        <Route path="users"           element={<Users />} />
        <Route path="vendor-payments" element={<VendorPayments />} />
      </Route>

      {/* Vendor login */}
      <Route path="/vendor/login" element={
        vendorUser ? <Navigate to="/vendor/dashboard" replace /> : <VendorLogin />
      } />

      {/* Vendor panel */}
      <Route path="/vendor" element={<VendorGuard><VendorLayout /></VendorGuard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"  element={<VendorDashboard />} />
        <Route path="orders"     element={<VendorOrders />} />
        <Route path="orders/:id" element={<VendorOrderDetail />} />
        <Route path="shipments"  element={<VendorShipments />} />
        <Route path="payments"   element={<VendorPaymentsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={
        <div className="flex h-screen items-center justify-center flex-col gap-3 text-gray-400">
          <p className="text-5xl font-bold">404</p>
          <p>Page not found</p>
          <a href="/" className="text-blue-600 hover:underline text-sm">Go home</a>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
