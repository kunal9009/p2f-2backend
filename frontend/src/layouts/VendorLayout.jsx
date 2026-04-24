import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon, ShoppingBagIcon, TruckIcon, CurrencyRupeeIcon,
  Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const NAV = [
  { label: 'Dashboard', href: '/vendor/dashboard', icon: HomeIcon },
  { label: 'Orders',    href: '/vendor/orders',    icon: ShoppingBagIcon },
  { label: 'Shipments', href: '/vendor/shipments', icon: TruckIcon },
  { label: 'Payments',  href: '/vendor/payments',  icon: CurrencyRupeeIcon },
];

function SidebarLink({ item, onClick }) {
  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-indigo-200 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {item.label}
    </NavLink>
  );
}

export default function VendorLayout() {
  const { vendorUser, logoutVendor } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logoutVendor();
    navigate('/vendor/login');
  };

  const Sidebar = ({ onNav }) => (
    <div className="flex flex-col h-full bg-indigo-900 text-white">
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-sm">V</div>
          <div>
            <p className="font-bold text-sm">MahattaART</p>
            <p className="text-xs text-indigo-300">Vendor Portal</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map((item) => (
          <SidebarLink key={item.href} item={item} onClick={onNav} />
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{vendorUser?.name}</p>
            <p className="text-xs text-indigo-300 truncate">Production Vendor</p>
          </div>
          <button onClick={handleLogout} title="Logout" className="text-indigo-300 hover:text-white ml-2 transition-colors">
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden md:flex md:w-60 md:flex-shrink-0">
        <div className="w-60 flex flex-col"><Sidebar /></div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 flex flex-col shadow-xl">
            <Sidebar onNav={() => setSidebarOpen(false)} />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 z-50 text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-indigo-900 border-b border-indigo-800">
          <button onClick={() => setSidebarOpen(true)}>
            <Bars3Icon className="h-6 w-6 text-indigo-200" />
          </button>
          <span className="font-bold text-white">Vendor Portal</span>
          <div className="w-6" />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
