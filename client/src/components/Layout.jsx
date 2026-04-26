import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatbotWidget from './ChatbotWidget';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile hamburger */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <Outlet />
      </main>

      <ChatbotWidget />
    </div>
  );
}
