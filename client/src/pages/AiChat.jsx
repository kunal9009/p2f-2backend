import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useToast } from '../contexts/ToastContext';

const SUGGESTIONS = [
  'How many tasks are overdue right now?',
  'Summarize my workload for today.',
  'Which tasks should I focus on first?',
  'Give me a status update I can send to my team.',
];

export default function AiChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m the MahattaART task assistant. Ask me anything about your tasks, deadlines, or team workload.' },
  ]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [available, setAvailable] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    api('/api/admin/ai/status').then(r => {
      if (r && r.success && !r.configured) setAvailable(false);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

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
        toast(res.message || 'AI unavailable', 'error');
        setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${res.message || 'Something went wrong.'}` }]);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="ai-chat-page">
      <div className="page-header">
        <div>
          <h2>AI Assistant</h2>
          <p className="text-muted">Ask questions about your tasks in plain English.</p>
        </div>
      </div>

      {!available && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          AI is not configured on this server. Set <code>OPENAI_API_KEY</code> in the environment to enable it.
        </div>
      )}

      <div className="ai-chat-shell">
        <div className="ai-chat-messages" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`ai-msg ai-msg-${m.role}`}>
              <div className="ai-msg-avatar">{m.role === 'user' ? '🧑' : '✨'}</div>
              <div className="ai-msg-bubble">{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="ai-msg ai-msg-assistant">
              <div className="ai-msg-avatar">✨</div>
              <div className="ai-msg-bubble ai-msg-typing">
                <span className="dot"/><span className="dot"/><span className="dot"/>
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && available && (
          <div className="ai-suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} type="button" className="ai-suggestion" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form className="ai-chat-input-row" onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={available ? 'Ask about your tasks… (Shift+Enter for new line)' : 'AI is disabled'}
            disabled={!available || sending}
            rows={1}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!available || sending || !input.trim()}
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
