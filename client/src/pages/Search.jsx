import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

const MATCH_STYLE = {
  taskId:      { label: 'ID',          bg:'#dbeafe', color:'#1d4ed8' },
  title:       { label: 'Title',       bg:'#dcfce7', color:'#166534' },
  project:     { label: 'Project',     bg:'#fef3c7', color:'#92400e' },
  tag:         { label: 'Tag',         bg:'#ede9fe', color:'#7c3aed' },
  description: { label: 'Description', bg:'#fce7f3', color:'#9d174d' },
  comment:     { label: 'Comment',     bg:'#e0f2fe', color:'#075985' },
};
const PCOLOR = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };
const SCOLOR = { todo:'#64748b', in_progress:'#f59e0b', testing:'#8b5cf6', on_hold:'#94a3b8', completed:'#10b981', cancelled:'#ef4444' };

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const [query,     setQuery]     = useState(searchParams.get('q') || '');
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [searched,  setSearched]  = useState(false);
  const [statFilt,  setStatFilt]  = useState('');
  const [matchFilt, setMatchFilt] = useState('');

  useEffect(() => {
    if (searchParams.get('q')) doSearch(searchParams.get('q'));
  }, []);

  async function doSearch(q) {
    q = (q ?? query).trim();
    if (!q) return;
    setLoading(true); setSearched(true); setStatFilt(''); setMatchFilt('');
    const res = await api('/api/admin/tasks/search?q=' + encodeURIComponent(q) + '&limit=50');
    if (res.success) setResults(res.data || []);
    setLoading(false);
  }

  const filtered = results.filter(t =>
    (!statFilt  || t.status  === statFilt) &&
    (!matchFilt || t.matchIn === matchFilt)
  );

  const statuses = [...new Set(results.map(t => t.status))].sort();
  const matches  = [...new Set(results.map(t => t.matchIn))].sort();

  return (
    <div>
      <div className="page-header">
        <div><h2>Global Search</h2><p className="text-muted">Search across tasks, projects, tags, and comments</p></div>
      </div>

      {/* Search bar */}
      <div className="search-hero">
        <div className="search-hero-inner">
          <span className="search-hero-icon">🔍</span>
          <input
            className="search-hero-input"
            placeholder="Search tasks, IDs, projects, tags, comments…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
            autoFocus
          />
          <button className="btn btn-primary" onClick={() => doSearch()}>Search</button>
        </div>
      </div>

      {/* Filter chips */}
      {searched && !loading && results.length > 0 && (
        <div className="search-filter-bar">
          <span className="chip-label">Filter:</span>
          {statuses.map(s => (
            <button
              key={s}
              className={`filter-chip${statFilt === s ? ' chip-active' : ''}`}
              onClick={() => setStatFilt(statFilt === s ? '' : s)}
            >
              {s.replace('_',' ')} <span className="chip-count">{results.filter(t=>t.status===s).length}</span>
            </button>
          ))}
          {statuses.length > 0 && <span className="chip-sep">|</span>}
          {matches.map(m => (
            <button
              key={m}
              className={`filter-chip${matchFilt === m ? ' chip-active' : ''}`}
              onClick={() => setMatchFilt(matchFilt === m ? '' : m)}
            >
              {m} <span className="chip-count">{results.filter(t=>t.matchIn===m).length}</span>
            </button>
          ))}
          <span className="search-meta">{filtered.length} result{filtered.length!==1?'s':''}</span>
        </div>
      )}

      {/* Results */}
      {!searched ? (
        <div className="search-empty-state">
          <div className="search-empty-icon">🔍</div>
          <div className="search-empty-title">Search your tasks</div>
          <div className="search-empty-sub">Type a keyword, task ID (e.g. TKT-0012), project name, or tag</div>
        </div>
      ) : loading ? (
        <div className="search-results-list">
          {Array(5).fill(0).map((_,i) => (
            <div key={i} className="result-card skeleton-card">
              <div className="skel" style={{width:120,height:14,borderRadius:4}} />
              <div className="skel skel-line" style={{width:'80%',height:18,marginTop:8}} />
              <div className="skel skel-line" style={{width:'40%',height:12,marginTop:6}} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="search-empty-state">
          <div className="search-empty-icon">😶</div>
          <div className="search-empty-title">No results for "{query}"</div>
          <div className="search-empty-sub">Try a different keyword, a task ID like TKT-0012, or a project name</div>
        </div>
      ) : (
        <div className="search-results-list">
          {filtered.map(t => {
            const ms = MATCH_STYLE[t.matchIn] || { label: t.matchIn, bg:'var(--bg)', color:'var(--muted)' };
            const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '';
            return (
              <div key={t._id} className="result-card" onClick={() => navigate('/tasks?id=' + t._id)}>
                <div className="result-card-header">
                  <span className="result-task-id">{t.taskId}</span>
                  <span className="match-badge" style={{ background:ms.bg, color:ms.color }}>{ms.label}</span>
                  <span className="priority-badge" style={{ background:PCOLOR[t.priority]+'20', color:PCOLOR[t.priority] }}>{t.priority}</span>
                  <span className="status-badge" style={{ background:SCOLOR[t.status]+'20', color:SCOLOR[t.status] }}>{t.status.replace('_',' ')}</span>
                  {due && <span className="result-date">📅 {due}</span>}
                </div>
                <div className="result-title">{t.title}</div>
                {t.project && <div className="result-project">📁 {t.project}</div>}
                {t.matchSnippet && <div className="result-snippet">"…{t.matchSnippet}…"</div>}
                <div className="result-footer">
                  {(t.assignedTo||[]).map(a => <span key={a.userId} className="result-assignee">{a.name}</span>)}
                  {(t.tags||[]).map(tag => <span key={tag} className="tag-chip">{tag}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
