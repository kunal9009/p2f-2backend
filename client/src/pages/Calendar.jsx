import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import TaskDetail from '../components/TaskDetail';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const PCOLOR = { critical:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#10b981' };
const SCOLOR = { todo:'#64748b', in_progress:'#f59e0b', testing:'#8b5cf6', on_hold:'#94a3b8', completed:'#10b981', cancelled:'#ef4444' };

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const dow      = firstDay.getDay(); // 0=Sun
  const startOff = dow === 0 ? 6 : dow - 1; // shift to Mon start
  const start    = new Date(firstDay);
  start.setDate(start.getDate() - startOff);
  const days = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return days;
}

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function Calendar() {
  const now   = new Date();
  const [year,   setYear]   = useState(now.getFullYear());
  const [month,  setMonth]  = useState(now.getMonth());
  const [tasks,  setTasks]  = useState([]);
  const [loading,setLoading]= useState(true);
  const [drawer, setDrawer] = useState(null);  // taskId
  const [newModal,setNewModal] = useState(null); // date string or null='new'
  const [selected, setSelected] = useState(null); // { date, tasks[] }

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString().slice(0,10);
    const to   = new Date(year, month+1, 0).toISOString().slice(0,10);
    const res  = await api(`/api/admin/tasks?dueAfter=${from}&dueBefore=${to}&limit=500`);
    if (res.success) setTasks(res.data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y-1); }
    else             { setMonth(m => m-1); }
    setSelected(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y+1); }
    else              { setMonth(m => m+1); }
    setSelected(null);
  }

  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(null); }

  const days = getCalendarDays(year, month);

  // Group tasks by due date key
  const byDay = {};
  tasks.forEach(t => {
    if (!t.dueDate) return;
    const key = toDateKey(new Date(t.dueDate));
    (byDay[key] = byDay[key] || []).push(t);
  });

  const todayKey = toDateKey(now);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>📅 Calendar</h2>
          <p className="text-muted">Task due dates at a glance</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={prevMonth}>‹</button>
          <button className="btn btn-secondary btn-sm" onClick={goToday}>Today</button>
          <button className="btn btn-secondary btn-sm" onClick={nextMonth}>›</button>
          <strong style={{ minWidth:160, textAlign:'center' }}>{MONTH_NAMES[month]} {year}</strong>
          <button className="btn btn-primary" onClick={() => setNewModal(null)}>+ New Task</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12 }}>
        {Object.entries(PCOLOR).map(([p, c]) => (
          <div key={p} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--muted)' }}>
            <span style={{ width:10, height:10, borderRadius:2, background:c, display:'inline-block' }} />
            {p}
          </div>
        ))}
        <div style={{ marginLeft:'auto', fontSize:12, color:'var(--muted)' }}>
          {tasks.length} task{tasks.length!==1?'s':''} this month
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {/* Day-of-week headers */}
        <div className="cal-header-row">
          {DAY_NAMES.map(d => (
            <div key={d} className="cal-header-cell">{d}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:'var(--muted)' }}>Loading…</div>
        ) : (
          <div className="cal-grid">
            {days.map((day, i) => {
              const key       = toDateKey(day);
              const dayTasks  = byDay[key] || [];
              const isToday   = key === todayKey;
              const inMonth   = day.getMonth() === month;
              const isPast    = day < now && !isToday;
              const isSelected= selected?.date === key;

              return (
                <div
                  key={i}
                  className={`cal-cell${isToday?' cal-today':''}${!inMonth?' cal-other-month':''}${isSelected?' cal-selected':''}`}
                  onClick={() => setSelected(isSelected ? null : { date: key, tasks: dayTasks, day })}
                >
                  <div className="cal-day-number">
                    {day.getDate()}
                    {dayTasks.length > 0 && (
                      <span className="cal-count">{dayTasks.length}</span>
                    )}
                  </div>
                  <div className="cal-pills">
                    {dayTasks.slice(0,3).map(t => (
                      <div
                        key={t._id}
                        className="cal-pill"
                        style={{
                          background: PCOLOR[t.priority] || '#64748b',
                          opacity: ['completed','cancelled'].includes(t.status) ? .45 : 1,
                          textDecoration: t.status==='completed' ? 'line-through' : 'none',
                        }}
                        onClick={e => { e.stopPropagation(); setDrawer(t._id); }}
                        title={`${t.taskId}: ${t.title}`}
                      >
                        {t.taskId} {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="cal-more">+{dayTasks.length-3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day detail panel (appears below calendar when a day is clicked) */}
      {selected && selected.tasks.length > 0 && (
        <div className="card" style={{ marginTop:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <strong style={{ fontSize:15 }}>
              {selected.day.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
            </strong>
            <span style={{ fontSize:12, color:'var(--muted)' }}>{selected.tasks.length} task{selected.tasks.length!==1?'s':''}</span>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginLeft:'auto' }}
              onClick={() => setNewModal(selected.date)}
            >
              + Add task for this day
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {selected.tasks.map(t => (
              <div
                key={t._id}
                className="result-card"
                style={{ cursor:'pointer' }}
                onClick={() => setDrawer(t._id)}
              >
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--muted)' }}>{t.taskId}</span>
                  <span style={{ fontWeight:600, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
                  <span style={{ fontSize:11, background:PCOLOR[t.priority]+'20', color:PCOLOR[t.priority], padding:'2px 8px', borderRadius:4, fontWeight:600, flexShrink:0 }}>{t.priority}</span>
                  <span style={{ fontSize:11, background:SCOLOR[t.status]+'20', color:SCOLOR[t.status], padding:'2px 8px', borderRadius:4, fontWeight:600, flexShrink:0 }}>{t.status.replace('_',' ')}</span>
                </div>
                {t.project && <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>📁 {t.project}</div>}
                {(t.assignedTo||[]).length>0 && (
                  <div style={{ display:'flex', gap:4, marginTop:4 }}>
                    {t.assignedTo.map(a=>(
                      <span key={a.userId} className="result-assignee">{a.name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && selected.tasks.length === 0 && (
        <div className="card" style={{ marginTop:12, padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ color:'var(--muted)', fontSize:14 }}>
            No tasks due on {selected.day.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => setNewModal(selected.date)}>
            + Add task for this day
          </button>
        </div>
      )}

      {/* Task detail drawer */}
      {drawer && (
        <div className="drawer-overlay" onClick={e => { if (e.target===e.currentTarget) setDrawer(null); }}>
          <div className="drawer">
            <button className="drawer-close" onClick={() => setDrawer(null)}>✕</button>
            <TaskDetail taskId={drawer} onClose={() => setDrawer(null)} onUpdated={load} />
          </div>
        </div>
      )}

      {/* New task modal — pre-fill due date if created from a day cell */}
      {newModal !== undefined && (
        <Modal title="New Task" onClose={() => setNewModal(undefined)} wide>
          <TaskForm
            defaultDueDate={newModal || ''}
            onClose={() => setNewModal(undefined)}
            onSaved={() => { setNewModal(undefined); load(); }}
          />
        </Modal>
      )}
    </div>
  );
}
