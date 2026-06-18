import { useState, useEffect } from "react";

const PRIORITY_META = {
  high:   { label: "High",   bg: "#FDECEA", color: "#C0392B" },
  medium: { label: "Medium", bg: "#FEF9E7", color: "#854F0B" },
  low:    { label: "Low",    bg: "#EAF3DE", color: "#3B6D11" },
};

export default function TodoPanel() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    fetch("/api/todos/").then(r => r.json()).then(setTodos).catch(console.error);
  }, []);

  async function addTodo(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/todos/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), priority }),
    });
    if (res.ok) {
      const t = await res.json();
      setTodos(prev => [t, ...prev]);
      setTitle("");
    }
  }

  async function markDone(id) {
    const res = await fetch(`/api/todos/${id}/done`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setTodos(prev => prev.map(t => t.id === id ? updated : t));
    }
  }

  async function deleteTodo(id) {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  async function prioritise() {
    setLoading(true);
    setSuggestion("");
    try {
      const res = await fetch("/api/todos/ai/prioritise", { method: "POST" });
      const d = await res.json();
      setSuggestion(d.suggestion || d.detail || "No response");
    } catch { setSuggestion("Error reaching server."); }
    finally { setLoading(false); }
  }

  const active = todos.filter(t => t.status !== "done");
  const done = todos.filter(t => t.status === "done");

  return (
    <div style={s.container}>
      <form onSubmit={addTodo} style={s.form}>
        <input style={s.input} placeholder="New task…" value={title} onChange={e => setTitle(e.target.value)} />
        <select style={s.select} value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button type="submit" style={s.btn}>Add</button>
      </form>

      {active.length === 0 ? (
        <p style={s.empty}>No open tasks — add one above.</p>
      ) : (
        <div style={s.list}>
          {active.map(t => {
            const pm = PRIORITY_META[t.priority] || PRIORITY_META.medium;
            return (
              <div key={t.id} style={s.row}>
                <div style={s.rowLeft}>
                  <span style={{ ...s.badge, background: pm.bg, color: pm.color }}>{pm.label}</span>
                  <span style={s.taskTitle}>{t.title}</span>
                </div>
                <div style={s.rowRight}>
                  <button style={s.doneBtn} onClick={() => markDone(t.id)}>Done ✓</button>
                  <button style={s.deleteBtn} onClick={() => deleteTodo(t.id)}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button style={s.prioritiseBtn} onClick={prioritise} disabled={loading}>
        {loading ? "Thinking…" : "✦ AI Prioritise"}
      </button>
      {suggestion && <pre style={s.result}>{suggestion}</pre>}

      {done.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <button style={s.toggleBtn} onClick={() => setShowDone(p => !p)}>
            {showDone ? "▾" : "▸"} Completed ({done.length})
          </button>
          {showDone && (
            <div style={{ ...s.list, marginTop: "8px", opacity: 0.5 }}>
              {done.map(t => (
                <div key={t.id} style={s.row}>
                  <span style={{ ...s.taskTitle, textDecoration: "line-through" }}>{t.title}</span>
                  <button style={s.deleteBtn} onClick={() => deleteTodo(t.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", gap: "1rem" },
  form: { display: "flex", gap: "8px", flexWrap: "wrap" },
  input: { flex: 1, minWidth: "160px", padding: "7px 10px", fontSize: "13px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", outline: "none" },
  select: { padding: "7px 10px", fontSize: "13px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "white" },
  btn: { padding: "7px 16px", fontSize: "13px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: "6px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", flexWrap: "wrap", gap: "8px" },
  rowLeft: { display: "flex", alignItems: "center", gap: "8px" },
  rowRight: { display: "flex", gap: "6px" },
  badge: { fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "10px" },
  taskTitle: { fontSize: "13px" },
  doneBtn: { fontSize: "11px", padding: "4px 10px", border: "1px solid #3B6D11", borderRadius: "var(--radius-sm)", background: "#EAF3DE", color: "#3B6D11", cursor: "pointer" },
  deleteBtn: { fontSize: "14px", padding: "2px 8px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" },
  prioritiseBtn: { alignSelf: "flex-start", padding: "7px 16px", fontSize: "13px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" },
  result: { padding: "12px", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  empty: { fontSize: "13px", color: "var(--color-text-muted)" },
  toggleBtn: { fontSize: "12px", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: 0 },
};
