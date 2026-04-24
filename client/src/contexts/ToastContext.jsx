import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const ICONS  = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
const COLORS = {
  success: { bg:'#dcfce7', border:'#86efac', text:'#166534' },
  error:   { bg:'#fee2e2', border:'#fca5a5', text:'#991b1b' },
  info:    { bg:'#dbeafe', border:'#93c5fd', text:'#1e40af' },
  warning: { bg:'#fef3c7', border:'#fcd34d', text:'#92400e' },
};

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:9999,
      display:'flex', flexDirection:'column', gap:8, maxWidth:360,
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info;
        return (
          <div
            key={t.id}
            style={{
              background:c.bg, border:`1px solid ${c.border}`, color:c.text,
              borderRadius:10, padding:'12px 16px', fontSize:13, fontWeight:500,
              display:'flex', alignItems:'center', gap:10,
              boxShadow:'0 4px 16px rgba(0,0,0,.12)',
              animation:'toastIn .2s ease',
            }}
          >
            <span style={{ fontSize:16 }}>{ICONS[t.type]}</span>
            <span style={{ flex:1, lineHeight:1.4 }}>{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              style={{ background:'none', border:'none', color:c.text, cursor:'pointer', fontSize:16, opacity:.6, padding:'0 2px', lineHeight:1 }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
