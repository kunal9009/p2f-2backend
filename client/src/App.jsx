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
import AiChat from './pages/AiChat';

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

// Section-level guard: admin sees everything; everyone else needs the
// section in their permissions array (or permissions unset = legacy all).
function SectionRoute({ section, children }) {
  const { token, hasSection } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!hasSection(section)) return <Navigate to="/no-access" replace />;
  return children;
}

function NoAccess() {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
      <h2 style={{ marginBottom: 8 }}>No access</h2>
      <p>You don't have permission to view this section. Ask an admin to grant access.</p>
    </div>
  );
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
                  <Route path="/dashboard" element={<SectionRoute section="dashboard"><ErrorBoundary><Dashboard /></ErrorBoundary></SectionRoute>} />
                  <Route path="/kanban"    element={<SectionRoute section="kanban"><ErrorBoundary><Kanban /></ErrorBoundary></SectionRoute>} />
                  <Route path="/tasks"     element={<SectionRoute section="tasks"><ErrorBoundary><Tasks /></ErrorBoundary></SectionRoute>} />
                  <Route path="/my-tasks"  element={<SectionRoute section="my-tasks"><ErrorBoundary><MyTasks /></ErrorBoundary></SectionRoute>} />
                  <Route path="/search"    element={<SectionRoute section="search"><ErrorBoundary><Search /></ErrorBoundary></SectionRoute>} />
                  <Route path="/team"      element={<SectionRoute section="team"><ErrorBoundary><Team /></ErrorBoundary></SectionRoute>} />
                  <Route path="/reports"   element={<SectionRoute section="reports"><ErrorBoundary><Reports /></ErrorBoundary></SectionRoute>} />
                  <Route path="/calendar"  element={<SectionRoute section="calendar"><ErrorBoundary><Calendar /></ErrorBoundary></SectionRoute>} />
                  <Route path="/ai-chat"   element={<SectionRoute section="ai-chat"><ErrorBoundary><AiChat /></ErrorBoundary></SectionRoute>} />
                  <Route path="/settings"  element={<SectionRoute section="settings"><ErrorBoundary><Settings /></ErrorBoundary></SectionRoute>} />
                  <Route path="/users"     element={<AdminRoute><ErrorBoundary><Users /></ErrorBoundary></AdminRoute>} />
                  <Route path="/no-access" element={<ProtectedRoute><NoAccess /></ProtectedRoute>} />
                </Route>
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
