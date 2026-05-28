import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";
import bg from "./assets/bgd.png";

const portal = document.body;
const API = "/api";
const COLUMN_META = {
  todo:  { label: "To Do",       emoji: "📋", accent: "#a78bfa", glow: "rgba(167,139,250,0.28)", cardBg: "rgba(167,139,250,0.10)", cardBorder: "rgba(167,139,250,0.28)", headerBg: "rgba(167,139,250,0.13)", dot: "#a78bfa" },
  doing: { label: "In Progress", emoji: "⚡", accent: "#fbbf24", glow: "rgba(251,191,36,0.22)",  cardBg: "rgba(251,191,36,0.09)",  cardBorder: "rgba(251,191,36,0.28)",  headerBg: "rgba(251,191,36,0.11)",  dot: "#fbbf24" },
  done:  { label: "Done",        emoji: "🌸", accent: "#34d399", glow: "rgba(52,211,153,0.22)",  cardBg: "rgba(52,211,153,0.09)",  cardBorder: "rgba(52,211,153,0.28)",  headerBg: "rgba(52,211,153,0.11)",  dot: "#34d399" },
};

const columnsConfig = [{ id: "todo" }, { id: "doing" }, { id: "done" }];

// ── Deadline helpers ──────────────────────────────────────────────────────────
function getUrgency(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - Date.now();
  if (diff < 0)          return "overdue";
  if (diff < 3600000)    return "critical";   // < 1h
  if (diff < 86400000)   return "urgent";     // < 24h
  if (diff < 259200000)  return "soon";       // < 3d
  return "ok";
}

const URGENCY_STYLE = {
  overdue:  { color: "#f87171", bg: "rgba(248,113,113,0.13)", border: "rgba(248,113,113,0.35)", label: "Overdue",  icon: "🚨" },
  critical: { color: "#fb923c", bg: "rgba(251,146,60,0.13)",  border: "rgba(251,146,60,0.35)",  label: "Critical", icon: "🔥" },
  urgent:   { color: "#fbbf24", bg: "rgba(251,191,36,0.13)",  border: "rgba(251,191,36,0.35)",  label: "Due soon", icon: "⚡" },
  soon:     { color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.28)", label: "Upcoming", icon: "🕐" },
  ok:       { color: "#34d399", bg: "rgba(52,211,153,0.09)",  border: "rgba(52,211,153,0.22)",  label: "On track",  icon: "✅" },
};

function formatCountdown(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - Date.now();
  if (diff < 0) {
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    if (h >= 24) return `${Math.floor(h/24)}d overdue`;
    if (h > 0)   return `${h}h ${m}m overdue`;
    return `${m}m overdue`;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h left`;
  }
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

function formatDeadlineDate(deadline) {
  if (!deadline) return "";
  return new Date(deadline).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Countdown chip ────────────────────────────────────────────────────────────
function CountdownChip({ deadline }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!deadline) return null;
  const urgency = getUrgency(deadline);
  const u = URGENCY_STYLE[urgency];
  return (
    <span className="countdown-chip" style={{ color: u.color, background: u.bg, border: `1px solid ${u.border}` }}>
      {u.icon} {formatCountdown(deadline)}
    </span>
  );
}

// ── Deadline modal ────────────────────────────────────────────────────────────
function DeadlineModal({ task, onSave, onClose }) {
  const [val, setVal] = useState(task.deadline ? task.deadline.slice(0, 16) : "");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">⏰ Set deadline</div>
        <div className="modal-task-name">{task.title}</div>
        <input
          type="datetime-local"
          className="deadline-input"
          value={val}
          min={new Date().toISOString().slice(0, 16)}
          onChange={e => setVal(e.target.value)}
        />
        <div className="modal-actions">
          {task.deadline && (
            <button className="modal-btn clear" onClick={() => onSave(null)}>Remove</button>
          )}
          <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn save" onClick={() => val && onSave(new Date(val).toISOString())} disabled={!val}>
            Save ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Deadline panel ────────────────────────────────────────────────────────────
function DeadlinePanel({ tasks, onEdit }) {
  const withDeadline = tasks
    .filter(t => t.deadline && t.status !== "done")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  return (
    <div className="deadline-panel">
      <div className="panel-header">
        <span className="panel-title">⏳ Deadline tracker</span>
        <span className="panel-sub">{withDeadline.length} task{withDeadline.length !== 1 ? "s" : ""} with deadlines</span>
      </div>
      {withDeadline.length === 0 ? (
        <div className="panel-empty">No deadlines set yet — click the 🕐 on any task!</div>
      ) : (
        <div className="panel-list">
          {withDeadline.map(t => {
            const urgency = getUrgency(t.deadline);
            const u = URGENCY_STYLE[urgency];
            return (
              <div
                key={t._id}
                className="panel-item"
                style={{ borderLeft: `3px solid ${u.color}` }}
                onClick={() => onEdit(t)}
              >
                <div className="panel-item-top">
                  <span className="panel-item-title">{t.title}</span>
                  <span className="panel-urgency-badge" style={{ color: u.color, background: u.bg }}>
                    {u.icon} {u.label}
                  </span>
                </div>
                <div className="panel-item-meta">
                  <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.75rem" }}>
                    📅 {formatDeadlineDate(t.deadline)}
                  </span>
                  <CountdownChip deadline={t.deadline} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [task, setTask]         = useState("");
  const [deadline, setDeadline] = useState("");
  const [tasks, setTasks]       = useState([]);
  const [token, setToken]       = useState(localStorage.getItem("token"));
  const [isDragging, setIsDragging] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading]   = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showPanel, setShowPanel]    = useState(false);

  // ── auth ──
  const login = async () => {
    setLoading(true);
    const res  = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return alert(data.message || "Login failed");
    localStorage.setItem("token", data.token);
    setToken(data.token);
  };

  const register = async () => {
    setLoading(true);
    const res = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    setLoading(false);
    if (res.ok) { alert("Account created ✅"); setAuthMode("login"); } else alert("Signup failed");
  };

  const logout = () => { localStorage.removeItem("token"); setToken(null); setTasks([]); };

  // ── fetch ──
  const getTasks = useCallback(async () => {
    if (!token || isDragging) return;
    try {
      const res = await fetch(`${API}/tasks`, { headers: { Authorization: "Bearer " + token } });
      if (res.status === 401) return logout();
      const data = await res.json();
      const serverTasks = Array.isArray(data) ? data : Array.isArray(data.tasks) ? data.tasks : [];
      setTasks(prev => {
        const localMap = new Map(prev.map(t => [t._id, t]));
        const result = serverTasks.map(st => {
          const local = localMap.get(st._id);
          return {
            ...st,
            // Always keep whatever status is in local state — it may be ahead of the server
            status: local ? local.status : st.status,
            // Same for deadline
            deadline: local ? local.deadline : st.deadline,
          };
        });
        // Keep any optimistic tasks not yet confirmed by server
        prev.forEach(t => {
          if (!serverTasks.find(st => st._id === t._id)) result.unshift(t);
        });
        return result;
      });
    } catch (err) { console.log(err); }
  }, [token, isDragging]);

  useEffect(() => {
    if (!token) return;
    getTasks();
    const id = setInterval(() => { if (document.visibilityState === "visible") getTasks(); }, 15000);
    return () => clearInterval(id);
  }, [token]);

  const normalize = s => (s || "todo").toLowerCase();
  const columns = {
    todo:  tasks.filter(t => normalize(t.status) === "todo"),
    doing: tasks.filter(t => normalize(t.status) === "doing"),
    done:  tasks.filter(t => normalize(t.status) === "done"),
  };

  // ── create ──
  const createTask = async () => {
    const clean = task.trim();
    if (!clean) return;
    setTask(""); setDeadline("");
    const temp = { _id: Date.now().toString(), title: clean, status: "todo", deadline: deadline ? new Date(deadline).toISOString() : null };
    setTasks(prev => [temp, ...prev]);
    try {
      await fetch(`${API}/tasks`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(temp) });
      // Don't call getTasks() here — it races with optimistic state and resets statuses
    } catch { getTasks(); }
  };

  // ── update status ──
  const updateStatus = async (id, status) => {
    // Optimistic update first — this is what the user sees immediately
    setTasks(prev => prev.map(t => t._id === id ? { ...t, status } : t));
    try {
      await fetch(`${API}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ status }),
      });
      // After server confirms, sync — but stamp local status AFTER server responds
      // so the merge in getTasks still sees our status as the latest
    } catch {
      // Only revert on actual network error
      getTasks();
    }
  };

  // ── update deadline ──
  const updateDeadline = async (id, deadlineISO) => {
    setTasks(prev => prev.map(t => t._id === id ? { ...t, deadline: deadlineISO } : t));
    setEditingTask(null);
    try {
      await fetch(`${API}/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ deadline: deadlineISO }) });
    } catch { getTasks(); }
  };

  // ── delete ──
  const deleteTask = async id => {
    setTasks(prev => prev.filter(t => t._id !== id));
    await fetch(`${API}/tasks/${id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
  };

  const handleDragEnd = result => {
    setIsDragging(false);
    if (!result.destination) return;
    updateStatus(result.draggableId, result.destination.droppableId);
  };

  const totalTasks = tasks.length;
  const doneTasks  = columns.done.length;
  const overdueCount = tasks.filter(t => t.status !== "done" && getUrgency(t.deadline) === "overdue").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Nunito:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito', sans-serif; }

        .app-root {
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 28px 20px;
          background-color: #0e0b1a;
          background-image: linear-gradient(rgba(14,11,26,0.83), rgba(14,11,26,0.9)), url(${bg ? bg : ''});
          background-size: cover;
          background-position: center;
          position: relative;
        }
        .app-root::before {
          content:''; position:fixed; top:-20%; left:-10%; width:55%; height:55%;
          background: radial-gradient(ellipse, rgba(167,139,250,0.14) 0%, transparent 70%);
          pointer-events:none; z-index:0;
        }
        .app-root::after {
          content:''; position:fixed; bottom:-15%; right:-5%; width:50%; height:50%;
          background: radial-gradient(ellipse, rgba(52,211,153,0.10) 0%, transparent 70%);
          pointer-events:none; z-index:0;
        }

        .main-col {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1160px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .glass-card {
          background: rgba(255,255,255,0.035);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 32px;
          padding: 36px 38px;
          box-shadow: 0 40px 90px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07);
        }

        /* ── HEADER ── */
        .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; }

        .logo {
          font-family: 'Pacifico', cursive;
          font-size: 2rem; color: #fff;
          display: flex; align-items: center; gap: 10px;
          text-shadow: 0 2px 20px rgba(167,139,250,0.4);
        }
        .logo-sparkle {
          font-family: 'Nunito', sans-serif; font-size: 1.5rem;
          display: inline-block; animation: wobble 3s ease-in-out infinite;
        }
        @keyframes wobble {
          0%,100% { transform: rotate(0deg) scale(1); }
          30%      { transform: rotate(14deg) scale(1.18); }
          60%      { transform: rotate(-8deg) scale(0.94); }
        }

        .header-right { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }

        .progress-pill {
          font-family:'Nunito',sans-serif; font-size:0.8rem; font-weight:700;
          color:rgba(255,255,255,0.5); background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.09); border-radius:999px; padding:5px 14px;
        }
        .progress-pill strong { color:#34d399; }

        .overdue-badge {
          font-family:'Nunito',sans-serif; font-size:0.78rem; font-weight:700;
          color:#f87171; background:rgba(248,113,113,0.12);
          border:1px solid rgba(248,113,113,0.3); border-radius:999px; padding:5px 13px;
          animation: pulse-red 1.8s ease-in-out infinite;
        }
        @keyframes pulse-red {
          0%,100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); }
          50%      { box-shadow: 0 0 0 5px rgba(248,113,113,0.15); }
        }

        .deadline-panel-btn {
          font-family:'Nunito',sans-serif; font-size:0.82rem; font-weight:700;
          color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.1); border-radius:999px; padding:6px 16px;
          cursor:pointer; transition:all 0.2s;
        }
        .deadline-panel-btn:hover, .deadline-panel-btn.active {
          background:rgba(167,139,250,0.18); border-color:rgba(167,139,250,0.38); color:#e9d5ff;
        }

        .logout-btn {
          font-family:'Nunito',sans-serif; font-size:0.82rem; font-weight:700;
          color:#fca5a5; background:rgba(239,68,68,0.10); border:1px solid rgba(239,68,68,0.28);
          border-radius:999px; padding:6px 17px; cursor:pointer; transition:all 0.2s;
        }
        .logout-btn:hover { background:rgba(239,68,68,0.20); border-color:rgba(239,68,68,0.45); }

        /* ── AUTH ── */
        .auth-wrap { max-width:400px; margin:0 auto; }
        .auth-title {
          font-family:'Pacifico',cursive; font-size:1.6rem; color:#fff;
          text-align:center; margin-bottom:24px; text-shadow:0 2px 14px rgba(167,139,250,0.3);
        }
        .auth-tabs {
          display:flex; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
          border-radius:999px; padding:4px; margin-bottom:20px; gap:4px;
        }
        .auth-tab {
          flex:1; padding:9px; border-radius:999px; border:none; cursor:pointer;
          font-family:'Nunito',sans-serif; font-size:0.88rem; font-weight:700;
          transition:all 0.2s; background:transparent; color:rgba(255,255,255,0.38);
        }
        .auth-tab.active {
          background:linear-gradient(135deg,rgba(167,139,250,0.35),rgba(167,139,250,0.18));
          color:#e9d5ff; border:1px solid rgba(167,139,250,0.38);
        }
        .auth-input {
          width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10);
          color:#fff; font-family:'Nunito',sans-serif; font-size:0.92rem; font-weight:500;
          padding:13px 18px; border-radius:16px; outline:none;
          transition:border-color 0.2s,box-shadow 0.2s; margin-bottom:12px; display:block;
        }
        .auth-input::placeholder { color:rgba(255,255,255,0.22); }
        .auth-input:focus { border-color:rgba(167,139,250,0.5); box-shadow:0 0 0 3px rgba(167,139,250,0.12); }
        .auth-submit {
          width:100%; padding:13px; border-radius:999px; border:none; cursor:pointer;
          font-family:'Nunito',sans-serif; font-size:0.95rem; font-weight:800;
          background:linear-gradient(135deg,#a78bfa,#7c3aed); color:#fff;
          box-shadow:0 4px 22px rgba(167,139,250,0.38); transition:all 0.2s;
        }
        .auth-submit:hover { transform:translateY(-1px); box-shadow:0 7px 28px rgba(167,139,250,0.48); }
        .auth-submit:disabled { opacity:0.55; cursor:not-allowed; transform:none; }

        /* ── TASK INPUT ── */
        .task-input-area { margin-bottom:24px; }

        .task-input-row { display:flex; gap:10px; margin-bottom:10px; }
        .task-input {
          flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10);
          color:#fff; font-family:'Nunito',sans-serif; font-size:0.94rem; font-weight:500;
          padding:13px 20px; border-radius:999px; outline:none;
          transition:border-color 0.2s,box-shadow 0.2s;
        }
        .task-input::placeholder { color:rgba(255,255,255,0.22); }
        .task-input:focus { border-color:rgba(167,139,250,0.48); box-shadow:0 0 0 3px rgba(167,139,250,0.10); }

        .add-btn {
          background:linear-gradient(135deg,#34d399,#059669); border:none; color:#fff;
          font-family:'Nunito',sans-serif; font-size:0.92rem; font-weight:800;
          padding:13px 26px; border-radius:999px; cursor:pointer; transition:all 0.2s;
          white-space:nowrap; box-shadow:0 4px 18px rgba(52,211,153,0.32);
        }
        .add-btn:hover { transform:translateY(-1px); box-shadow:0 7px 24px rgba(52,211,153,0.42); }

        .deadline-row {
          display:flex; align-items:center; gap:12px; padding:0 4px;
        }
        .deadline-row-label {
          font-family:'Nunito',sans-serif; font-size:0.78rem; font-weight:700;
          color:rgba(255,255,255,0.35); white-space:nowrap;
        }
        .deadline-picker {
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10);
          color:rgba(255,255,255,0.75); font-family:'Nunito',sans-serif; font-size:0.82rem;
          padding:7px 14px; border-radius:999px; outline:none; cursor:pointer;
          transition:border-color 0.2s; color-scheme:dark;
        }
        .deadline-picker:focus { border-color:rgba(167,139,250,0.45); }
        .deadline-clear {
          background:none; border:none; color:rgba(255,255,255,0.28); font-size:0.9rem;
          cursor:pointer; transition:color 0.15s; font-family:'Nunito',sans-serif;
          padding:4px 6px; border-radius:6px;
        }
        .deadline-clear:hover { color:#f87171; background:rgba(239,68,68,0.10); }
        .deadline-preview {
          font-family:'Nunito',sans-serif; font-size:0.78rem; font-weight:700;
          padding:5px 12px; border-radius:999px;
        }

        /* ── BOARD ── */
        .board { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; align-items:start; }

        .col-droppable {
          border-radius:22px; min-height:280px;
          border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.025);
          transition:box-shadow 0.2s, background 0.2s;
        }
        .col-droppable.over {
          background:rgba(255,255,255,0.045);
          box-shadow:0 0 0 2px var(--accent),0 0 28px var(--glow);
        }

        .col-header {
          padding:15px 18px 13px; display:flex; align-items:center; justify-content:space-between;
          border-bottom:1px solid rgba(255,255,255,0.055); border-radius:22px 22px 0 0;
        }
        .col-header-left { display:flex; align-items:center; gap:9px; }
        .col-dot { width:8px; height:8px; border-radius:50%; background:var(--dot); box-shadow:0 0 7px var(--dot); flex-shrink:0; }
        .col-title { font-family:'Nunito',sans-serif; font-size:0.82rem; font-weight:800; color:rgba(255,255,255,0.88); letter-spacing:0.8px; text-transform:uppercase; }
        .col-emoji { font-size:0.95rem; }
        .col-count { font-family:'Nunito',sans-serif; font-size:0.72rem; font-weight:700; color:rgba(255,255,255,0.32); background:rgba(255,255,255,0.06); border-radius:999px; padding:2px 10px; }
        .col-body { padding:13px; }

        /* ── TASK CARD ── */
        .task-card {
          padding:11px 13px; margin-bottom:9px; border-radius:16px;
          border:1px solid var(--card-border); background:var(--card-bg);
          cursor:grab; user-select:none; gap:0;
        }
        .task-card:not(.dragging) { transition:transform 0.15s,box-shadow 0.15s; }
        .task-card:not(.dragging):hover { transform:translateY(-2px); box-shadow:0 7px 22px rgba(0,0,0,0.28); }
        .task-card.dragging { cursor:grabbing; box-shadow:0 14px 40px rgba(0,0,0,0.55); }

        /* urgency overrides */
        .task-card.urgency-overdue  { background:rgba(248,113,113,0.10) !important; border-color:rgba(248,113,113,0.32) !important; }
        .task-card.urgency-critical { background:rgba(251,146,60,0.10)  !important; border-color:rgba(251,146,60,0.32)  !important; }
        .task-card.urgency-urgent   { background:rgba(251,191,36,0.10)  !important; border-color:rgba(251,191,36,0.30)  !important; }

        .card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:4px; }
        .task-title { font-family:'Nunito',sans-serif; font-size:0.88rem; font-weight:600; color:rgba(255,255,255,0.88); line-height:1.45; flex:1; word-break:break-word; }

        .card-actions { display:flex; gap:4px; flex-shrink:0; margin-top:1px; }
        .clock-btn {
          background:none; border:none; cursor:pointer; font-size:0.8rem; line-height:1;
          padding:2px 4px; border-radius:6px; transition:background 0.15s; opacity:0.4;
        }
        .clock-btn:hover { background:rgba(167,139,250,0.18); opacity:1; }
        .clock-btn.has-deadline { opacity:0.85; }
        .delete-btn {
          background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.18);
          font-size:1rem; line-height:1; padding:1px 3px; border-radius:6px;
          transition:color 0.15s,background 0.15s;
          font-family:'Nunito',sans-serif;
        }
        .delete-btn:hover { color:#f87171; background:rgba(239,68,68,0.13); }

        .countdown-chip {
          display:inline-flex; align-items:center; gap:4px;
          font-family:'Nunito',sans-serif; font-size:0.71rem; font-weight:700;
          padding:3px 9px; border-radius:999px; margin-top:5px;
        }

        /* ── EMPTY STATE ── */
        .empty-state {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:36px 16px; color:rgba(255,255,255,0.13);
          font-family:'Nunito',sans-serif; font-size:0.82rem; font-weight:600;
          gap:8px; text-align:center;
        }
        .empty-icon { font-size:1.9rem; opacity:0.35; }

        /* ── DEADLINE PANEL ── */
        .deadline-panel {
          background:rgba(255,255,255,0.03); backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.08); border-radius:26px;
          overflow:hidden;
        }
        .panel-header {
          display:flex; justify-content:space-between; align-items:center;
          padding:16px 22px; border-bottom:1px solid rgba(255,255,255,0.06);
          background:rgba(167,139,250,0.07);
        }
        .panel-title { font-family:'Pacifico',cursive; font-size:1.05rem; color:#e9d5ff; }
        .panel-sub { font-family:'Nunito',sans-serif; font-size:0.78rem; font-weight:700; color:rgba(255,255,255,0.3); }
        .panel-empty {
          padding:28px 22px; font-family:'Nunito',sans-serif; font-size:0.84rem;
          font-weight:600; color:rgba(255,255,255,0.2); text-align:center;
        }
        .panel-list { padding:12px 14px; display:flex; flex-direction:column; gap:8px; }
        .panel-item {
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
          border-radius:14px; padding:11px 14px; cursor:pointer;
          transition:background 0.15s, transform 0.15s;
          padding-left:16px;
        }
        .panel-item:hover { background:rgba(255,255,255,0.06); transform:translateX(2px); }
        .panel-item-top { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:5px; }
        .panel-item-title { font-family:'Nunito',sans-serif; font-size:0.86rem; font-weight:700; color:rgba(255,255,255,0.85); flex:1; }
        .panel-urgency-badge { font-family:'Nunito',sans-serif; font-size:0.72rem; font-weight:700; padding:2px 9px; border-radius:999px; white-space:nowrap; }
        .panel-item-meta { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; }

        /* ── MODAL ── */
        .modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.65);
          display:flex; align-items:center; justify-content:center;
          z-index:1000; backdrop-filter:blur(4px);
        }
        .modal-box {
          background:#1a1628; border:1px solid rgba(167,139,250,0.25);
          border-radius:24px; padding:32px 28px; width:100%; max-width:380px;
          box-shadow:0 24px 60px rgba(0,0,0,0.7);
        }
        .modal-title { font-family:'Pacifico',cursive; font-size:1.2rem; color:#e9d5ff; margin-bottom:8px; }
        .modal-task-name {
          font-family:'Nunito',sans-serif; font-size:0.88rem; font-weight:600;
          color:rgba(255,255,255,0.55); margin-bottom:20px;
          padding:8px 12px; background:rgba(255,255,255,0.04); border-radius:10px;
        }
        .deadline-input {
          width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(167,139,250,0.3);
          color:#fff; font-family:'Nunito',sans-serif; font-size:0.9rem; padding:12px 16px;
          border-radius:14px; outline:none; margin-bottom:22px; color-scheme:dark;
          transition:border-color 0.2s,box-shadow 0.2s;
        }
        .deadline-input:focus { border-color:rgba(167,139,250,0.6); box-shadow:0 0 0 3px rgba(167,139,250,0.12); }
        .modal-actions { display:flex; gap:8px; justify-content:flex-end; }
        .modal-btn {
          font-family:'Nunito',sans-serif; font-size:0.86rem; font-weight:800;
          padding:9px 20px; border-radius:999px; border:none; cursor:pointer; transition:all 0.2s;
        }
        .modal-btn.clear  { background:rgba(239,68,68,0.12);  color:#fca5a5; border:1px solid rgba(239,68,68,0.28); margin-right:auto; }
        .modal-btn.clear:hover  { background:rgba(239,68,68,0.22); }
        .modal-btn.cancel { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.5); border:1px solid rgba(255,255,255,0.1); }
        .modal-btn.cancel:hover { background:rgba(255,255,255,0.12); }
        .modal-btn.save   { background:linear-gradient(135deg,#a78bfa,#7c3aed); color:#fff; box-shadow:0 3px 14px rgba(167,139,250,0.35); }
        .modal-btn.save:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(167,139,250,0.45); }
        .modal-btn.save:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

        @media (max-width:768px) {
          .board { grid-template-columns:1fr; }
          .glass-card { padding:22px 18px; }
          .logo { font-size:1.65rem; }
          .header-right { gap:8px; }
        }
      `}</style>

      <div className="app-root">
        <div className="main-col">

          <div className="glass-card">
            {/* HEADER */}
            <div className="header">
              <div className="logo">
                Taskieboo <span className="logo-sparkle">✨</span>
              </div>
              {token && (
                <div className="header-right">
                  {totalTasks > 0 && (
                    <div className="progress-pill"><strong>{doneTasks}</strong> / {totalTasks} done</div>
                  )}
                  {overdueCount > 0 && (
                    <div className="overdue-badge">🚨 {overdueCount} overdue</div>
                  )}
                  <button
                    className={`deadline-panel-btn ${showPanel ? "active" : ""}`}
                    onClick={() => setShowPanel(p => !p)}
                  >
                    ⏳ Deadlines
                  </button>
                  <button className="logout-btn" onClick={logout}>Sign out</button>
                </div>
              )}
            </div>

            {/* AUTH */}
            {!token && (
              <div className="auth-wrap">
                <p className="auth-title">{authMode === "login" ? "welcome back 👋" : "join us ✨"}</p>
                <div className="auth-tabs">
                  <button className={`auth-tab ${authMode === "login" ? "active" : ""}`} onClick={() => setAuthMode("login")}>Login</button>
                  <button className={`auth-tab ${authMode === "signup" ? "active" : ""}`} onClick={() => setAuthMode("signup")}>Sign Up</button>
                </div>
                <input className="auth-input" placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <input className="auth-input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (authMode === "login" ? login() : register())} />
                <button className="auth-submit" onClick={authMode === "login" ? login : register} disabled={loading}>
                  {loading ? "one sec…" : authMode === "login" ? "Login →" : "Create Account →"}
                </button>
              </div>
            )}

            {/* BOARD */}
            {token && (
              <>
                {/* INPUT */}
                <div className="task-input-area">
                  <div className="task-input-row">
                    <input
                      className="task-input"
                      value={task}
                      onChange={e => setTask(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && createTask()}
                      placeholder="What needs to be done? Hit Enter or click Add…"
                    />
                    <button className="add-btn" onClick={createTask}>+ Add</button>
                  </div>
                  <div className="deadline-row">
                    <span className="deadline-row-label">⏰ deadline (optional)</span>
                    <input
                      type="datetime-local"
                      className="deadline-picker"
                      value={deadline}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={e => setDeadline(e.target.value)}
                    />
                    {deadline && (
                      <>
                        <button className="deadline-clear" onClick={() => setDeadline("")} title="Clear deadline">×</button>
                        <span
                          className="deadline-preview"
                          style={{
                            color: URGENCY_STYLE[getUrgency(new Date(deadline).toISOString())].color,
                            background: URGENCY_STYLE[getUrgency(new Date(deadline).toISOString())].bg,
                            border: `1px solid ${URGENCY_STYLE[getUrgency(new Date(deadline).toISOString())].border}`,
                          }}
                        >
                          {URGENCY_STYLE[getUrgency(new Date(deadline).toISOString())].icon} {URGENCY_STYLE[getUrgency(new Date(deadline).toISOString())].label}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* KANBAN */}
                <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd}>
                  <div className="board">
                    {columnsConfig.map(col => {
                      const meta  = COLUMN_META[col.id];
                      const items = columns[col.id];
                      return (
                        <Droppable droppableId={col.id} key={col.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`col-droppable ${snapshot.isDraggingOver ? "over" : ""}`}
                              style={{ "--accent": meta.accent, "--glow": meta.glow, "--dot": meta.dot }}
                            >
                              <div className="col-header" style={{ background: meta.headerBg }}>
                                <div className="col-header-left">
                                  <div className="col-dot" />
                                  <span className="col-title">{meta.label}</span>
                                  <span className="col-emoji">{meta.emoji}</span>
                                </div>
                                <span className="col-count">{items.length}</span>
                              </div>
                              <div className="col-body">
                                {items.length === 0 && (
                                  <div className="empty-state">
                                    <span className="empty-icon">{meta.emoji}</span>
                                    <span>drop tasks here</span>
                                  </div>
                                )}
                                {items.map((t, index) => {
                                  const urgency = t.deadline && t.status !== "done" ? getUrgency(t.deadline) : null;
                                  return (
                                    <Draggable key={t._id} draggableId={t._id} index={index}>
                                      {(provided, snapshot) => {
                                        const card = (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`task-card ${snapshot.isDragging ? "dragging" : ""} ${urgency ? `urgency-${urgency}` : ""}`}
                                            style={{
                                              "--card-bg": meta.cardBg,
                                              "--card-border": meta.cardBorder,
                                              ...provided.draggableProps.style,
                                            }}
                                          >
                                            <div className="card-top">
                                              <span className="task-title">{t.title}</span>
                                              <div className="card-actions">
                                                <button
                                                  className={`clock-btn ${t.deadline ? "has-deadline" : ""}`}
                                                  onClick={() => setEditingTask(t)}
                                                  title="Set deadline"
                                                >
                                                  {t.deadline ? "⏰" : "🕐"}
                                                </button>
                                                <button className="delete-btn" onClick={() => deleteTask(t._id)} title="Delete">×</button>
                                              </div>
                                            </div>
                                            {t.deadline && t.status !== "done" && (
                                              <CountdownChip deadline={t.deadline} />
                                            )}
                                            {t.deadline && t.status === "done" && (
                                              <span style={{ fontSize: "0.71rem", color: "rgba(255,255,255,0.28)", fontFamily: "'Nunito',sans-serif" }}>
                                                📅 {formatDeadlineDate(t.deadline)}
                                              </span>
                                            )}
                                          </div>
                                        );
                                        return snapshot.isDragging ? createPortal(card, portal) : card;
                                      }}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                </DragDropContext>
              </>
            )}
          </div>

          {/* DEADLINE PANEL */}
          {token && showPanel && (
            <DeadlinePanel tasks={tasks} onEdit={setEditingTask} />
          )}
        </div>
      </div>

      {/* DEADLINE MODAL */}
      {editingTask && (
        <DeadlineModal
          task={editingTask}
          onSave={iso => updateDeadline(editingTask._id, iso)}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
}
