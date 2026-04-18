import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
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
import Calendar from './pages/Calendar';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) {
  return <div>Loading...</div>; // 🔥 redirect mat karo
}
return children;
}

function AdminRoute({ children }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

/* Ctrl+K → navigate to /search */
function GlobalShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter basename="/app">
            <GlobalShortcuts />
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/kanban"    element={<ProtectedRoute><ErrorBoundary><Kanban /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/tasks"     element={<ProtectedRoute><ErrorBoundary><Tasks /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/my-tasks"  element={<ProtectedRoute><ErrorBoundary><MyTasks /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/search"    element={<ProtectedRoute><ErrorBoundary><Search /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/team"      element={<ProtectedRoute><ErrorBoundary><Team /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/reports"   element={<ProtectedRoute><ErrorBoundary><Reports /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/calendar"  element={<ProtectedRoute><ErrorBoundary><Calendar /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings"  element={<ProtectedRoute><ErrorBoundary><Settings /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/users"     element={<AdminRoute><ErrorBoundary><Users /></ErrorBoundary></AdminRoute>} />
                </Route>
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
