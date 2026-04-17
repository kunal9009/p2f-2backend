import React from 'react';

export default function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 52, marginBottom: 16, opacity: .8 }}>{icon}</div>
      {title && <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</div>}
      {message && <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 340, lineHeight: 1.6, margin: '0 0 20px' }}>{message}</p>}
      {action && action}
    </div>
  );
}
