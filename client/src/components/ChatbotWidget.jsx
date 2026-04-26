import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'tm_chatbot_messages';
const INITIAL_MESSAGES = [
  { role: 'assistant', content: 'Hi! Ask me anything — your tasks, the panel, or just general questions.' },
];

function loadMessages() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_MESSAGES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : INITIAL_MESSAGES;
  } catch {
    return INITIAL_MESSAGES;
  }
}

export default function ChatbotWidget() {
  const { token, hasSection } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [available, setAvailable] = useState(true);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Hide entirely if user has no auth or no ai-chat permission.
  const visible = !!token && hasSection('ai-chat');

  useEffect(() => {
    if (!visible) return;
    api('/api/admin/ai/status').then(r => {
      if (r && r.success && !r.configured) setAvailable(false);
    });
  }, [visible]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  if (!visible) return null;

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(m => [...m, { role: 'user', content: message }]);
    setSending(true);
    try {
      const res = await api('/api/admin/ai/chat', 'POST', { message, history });
      if (res.success) {
        setMessages(m => [...m, { role: 'assistant', content: res.data.reply }]);
      } else {
        if (res.notConfigured) setAvailable(false);
        setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${res.message || 'Something went wrong.'}` }]);
      }
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    setMessages(INITIAL_MESSAGES);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <>
      <button
        type="button"
        className={`chatbot-fab${open ? ' chatbot-fab-hidden' : ''}`}
        aria-label="Open AI assistant"
        title="AI Assistant"
        onClick={() => setOpen(true)}
      >
        ✨
      </button>

      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="AI assistant chat">
          <div className="chatbot-header">
            <div className="chatbot-header-title">
              <span className="chatbot-header-icon">✨</span>
              <span>AI Assistant</span>
            </div>
            <div className="chatbot-header-actions">
              <button type="button" className="chatbot-icon-btn" title="Clear chat" onClick={clearChat}>↺</button>
              <button type="button" className="chatbot-icon-btn" title="Close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {!available && (
            <div className="chatbot-banner">
              AI is not configured on this server. Set <code>OPENAI_API_KEY</code> to enable it.
            </div>
          )}

          <div className="chatbot-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-msg chatbot-msg-${m.role}`}>
                <div className="chatbot-msg-avatar">{m.role === 'user' ? '🧑' : '✨'}</div>
                <div className="chatbot-msg-bubble">{m.content}</div>
              </div>
            ))}
            {sending && (
              <div className="chatbot-msg chatbot-msg-assistant">
                <div className="chatbot-msg-avatar">✨</div>
                <div className="chatbot-msg-bubble chatbot-msg-typing">
                  <span className="dot"/><span className="dot"/><span className="dot"/>
                </div>
              </div>
            )}
          </div>

          <form
            className="chatbot-input-row"
            onSubmit={e => { e.preventDefault(); send(); }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={available ? 'Ask anything…' : 'AI is disabled'}
              disabled={!available || sending}
              rows={1}
            />
            <button
              type="submit"
              className="btn btn-primary chatbot-send"
              disabled={!available || sending || !input.trim()}
            >
              {sending ? '…' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
