import React from 'react';

export default function ConfirmDialog({ message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,.4)',
        zIndex:500, display:'flex', alignItems:'center', justifyContent:'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background:'#fff', borderRadius:12, padding:'24px 28px',
        maxWidth:380, width:'90%', boxShadow:'0 8px 32px rgba(0,0,0,.2)',
      }}>
        <p style={{ fontSize:15, lineHeight:1.5, margin:'0 0 20px', color:'#1e293b' }}>{message}</p>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={{ background: danger ? '#ef4444' : '#1a1a2e', color:'#fff' }}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
