import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

export default function Settings() {
  const { user } = useAuth();
  const [stats,      setStats]      = useState(null);
  const [testEmail,  setTestEmail]  = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testLoading,setTestLoading]= useState(false);
  const [pwForm, setPwForm] = useState({ curPw:'', newPw:'', confirmPw:'' });
  const [pwState, setPwState] = useState({ loading:false, error:'', success:'' });

  useEffect(() => {
    api('/api/admin/tasks/dashboard').then(res => {
      if (res.success) setStats(res.data.summary);
    });
  }, []);

  async function sendTestEmail() {
    if (!testEmail.trim()) { alert('Enter a recipient email.'); return; }
    setTestLoading(true); setTestResult(null);
    const res = await api('/api/admin/tasks/test-email', 'POST', { email: testEmail });
    setTestResult({ ok: res.success, msg: res.success ? '✅ Test email sent! Check your inbox.' : '❌ ' + (res.message || 'Failed — check EMAIL_* env vars.') });
    setTestLoading(false);
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirmPw) { setPwState(s=>({...s,error:'Passwords do not match.',success:''})); return; }
    setPwState(s=>({...s,loading:true,error:'',success:''}));
    const uid = user?.id || user?._id;
    const res = await api('/api/admin/users/' + uid + '/reset-password', 'PATCH', { newPassword: pwForm.newPw });
    if (res.success) {
      setPwState({loading:false,error:'',success:'✅ Password updated successfully.'});
      setPwForm({ curPw:'', newPw:'', confirmPw:'' });
    } else {
      setPwState({loading:false,error:res.message||'Update failed',success:''});
    }
  }

  const CRON_JOBS = [
    { icon:'🌅', name:'Daily Reminders',   time:'Runs every day at 9:00 AM' },
    { icon:'🔁', name:'Due-Soon Alert',    time:'Tasks due within 24 hours' },
    { icon:'🚨', name:'Overdue Alert',     time:'Tasks past due date (daily 9 AM)' },
    { icon:'🔔', name:'Custom Reminders',  time:'Checks every hour for custom reminder dates' },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h2>Settings</h2><p className="text-muted">Email notifications, scheduler status, and system info</p></div>
      </div>

      <div className="settings-grid">
        {/* Email config */}
        <div className="card settings-card">
          <h3 className="settings-section-title">📧 Email Notifications</h3>
          <p className="settings-desc">
            Email alerts are sent via SMTP (nodemailer). Configure the variables below
            in your <code>.env</code> file and restart the server.
          </p>
          <div className="env-table">
            {[
              ['EMAIL_HOST',  'SMTP host (e.g. smtp.gmail.com)'],
              ['EMAIL_PORT',  '587 for TLS, 465 for SSL'],
              ['EMAIL_USER',  'Your email address'],
              ['EMAIL_PASS',  'App password (not your login password)'],
              ['EMAIL_FROM',  '"MahattaART Tasks <you@example.com>"'],
            ].map(([k,v]) => (
              <div key={k} className="env-row">
                <code>{k}</code><span>{v}</span>
              </div>
            ))}
          </div>
          <div className="settings-field" style={{ marginTop:16 }}>
            <label style={{ fontSize:13, fontWeight:500, marginBottom:6, display:'block' }}>Send test email to</label>
            <div className="settings-row">
              <input
                type="email"
                className="input-sm"
                style={{ flex:1 }}
                placeholder="your-email@example.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter') sendTestEmail(); }}
              />
              <button className="btn btn-primary btn-sm" onClick={sendTestEmail} disabled={testLoading}>
                {testLoading ? 'Sending…' : 'Send Test'}
              </button>
            </div>
            {testResult && (
              <div style={{ marginTop:8, fontSize:13, color: testResult.ok ? '#166534' : '#991b1b' }}>
                {testResult.msg}
              </div>
            )}
          </div>
        </div>

        {/* Scheduler */}
        <div className="card settings-card">
          <h3 className="settings-section-title">⏰ Reminder Scheduler</h3>
          <p className="settings-desc">Cron jobs run automatically when the server starts.</p>
          <div className="schedule-table">
            {CRON_JOBS.map(j => (
              <div key={j.name} className="schedule-row">
                <div className="schedule-icon">{j.icon}</div>
                <div>
                  <div className="schedule-name">{j.name}</div>
                  <div className="schedule-time">{j.time}</div>
                </div>
                <span className="schedule-badge active">Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* System snapshot */}
        <div className="card settings-card">
          <h3 className="settings-section-title">📊 System Snapshot</h3>
          <div className="env-table">
            {stats ? [
              ['Total tasks',     stats.total],
              ['Completed',       stats.completed],
              ['Overdue',         stats.overdue],
              ['Due today',       stats.dueToday],
              ['Completion rate', stats.completionRate + '%'],
            ].map(([k,v]) => (
              <div key={k} className="env-row"><code>{k}</code><span>{v}</span></div>
            )) : (
              <div className="env-row"><span>Loading…</span></div>
            )}
          </div>
        </div>

        {/* Change password */}
        <div className="card settings-card">
          <h3 className="settings-section-title">🔐 Change My Password</h3>
          <form onSubmit={changePassword} style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={pwForm.curPw} onChange={e=>setPwForm(f=>({...f,curPw:e.target.value}))} required placeholder="Current password" />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={pwForm.newPw} onChange={e=>setPwForm(f=>({...f,newPw:e.target.value}))} required minLength={6} placeholder="At least 6 characters" />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={pwForm.confirmPw} onChange={e=>setPwForm(f=>({...f,confirmPw:e.target.value}))} required placeholder="Repeat new password" />
            </div>
            {pwState.error   && <div className="alert alert-error">{pwState.error}</div>}
            {pwState.success && <div className="alert alert-success">{pwState.success}</div>}
            <button type="submit" className="btn btn-primary btn-sm" disabled={pwState.loading}>
              {pwState.loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
