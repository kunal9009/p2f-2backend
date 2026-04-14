import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon, ShoppingBagIcon, CubeIcon, UsersIcon, TruckIcon,
  DocumentTextIcon, ChartBarIcon, CurrencyRupeeIcon, UserGroupIcon,
  Cog6ToothIcon, Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon,
  BuildingStorefrontIcon, TagIcon,
} from '@heroicons/react/24/outline';

const NAV = [
  { label: 'Dashboard',       href: '/admin/dashboard',        icon: HomeIcon },
  { label: 'Orders',          href: '/admin/orders',           icon: ShoppingBagIcon },
  { label: 'Products',        href: '/admin/products',         icon: CubeIcon },
  { label: 'Customers',       href: '/admin/customers',        icon: UsersIcon },
  { label: 'Vendors',         href: '/admin/vendors',          icon: TruckIcon },
  { label: 'Invoices',        href: '/admin/invoices',         icon: DocumentTextIcon },
  { label: 'Reports',         href: '/admin/reports',          icon: ChartBarIcon },
  { label: 'Pricing',         href: '/admin/pricing',          icon: TagIcon },
  { label: 'Vendor Payments', href: '/admin/vendor-payments',  icon: CurrencyRupeeIcon },
  { label: 'Users',           href: '/admin/users',            icon: UserGroupIcon },
];

function SidebarLink({ item, onClick }) {
  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {item.label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { adminUser, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  const Sidebar = ({ onNav }) => (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">M</div>
          <div>
            <p className="font-bold text-sm">MahattaART</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map((item) => (
          <SidebarLink key={item.href} item={item} onClick={onNav} />
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{adminUser?.name}</p>
            <p className="text-xs text-gray-400 truncate capitalize">{adminUser?.role}</p>
          </div>
          <button onClick={handleLogout} title="Logout" className="text-gray-400 hover:text-white ml-2 transition-colors">
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-60 md:flex-shrink-0">
        <div className="w-60 flex flex-col">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 flex flex-col shadow-xl">
            <Sidebar onNav={() => setSidebarOpen(false)} />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 z-50 text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)}>
            <Bars3Icon className="h-6 w-6 text-gray-500" />
          </button>
          <span className="font-bold text-gray-900">MahattaART</span>
          <div className="w-6" />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
