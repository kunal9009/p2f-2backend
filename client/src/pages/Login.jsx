import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login }     = useAuth();
  const navigate      = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        const u = data.data || data.user || {};
        login(data.token, { ...u, id: u._id || u.id });
        navigate('/dashboard', { replace: true });
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Connection failed. Is the server running?');
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#1a1a2e"/>
            <rect x="8"  y="8"  width="10" height="10" rx="2" fill="#e94560"/>
            <rect x="22" y="8"  width="10" height="10" rx="2" fill="#0f3460"/>
            <rect x="8"  y="22" width="10" height="10" rx="2" fill="#0f3460"/>
            <rect x="22" y="22" width="10" height="10" rx="2" fill="#e94560"/>
          </svg>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>MahattaART</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Task Management System</p>
          </div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required autoFocus />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
