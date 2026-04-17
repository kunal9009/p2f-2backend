import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Tasks from './pages/Tasks';
import MyTasks from './pages/MyTasks';
import Search from './pages/Search';
import Team from './pages/Team';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter basename="/app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/kanban"    element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
            <Route path="/tasks"     element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/my-tasks"  element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
            <Route path="/search"    element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/team"      element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/reports"   element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/users"     element={<AdminRoute><Users /></AdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
