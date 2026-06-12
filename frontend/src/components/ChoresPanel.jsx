import { useState, useEffect } from "react";

const FREQ_DAYS = { daily: 1, weekly: 7, monthly: 30 };

function daysOverdue(chore) {
  if (!chore.last_done) return null;
  const due = new Date(chore.last_done);
  due.setDate(due.getDate() + (FREQ_DAYS[chore.frequency] || 7));
  return Math.floor((Date.now() - due.getTime()) / 86400000);
}

function dueLabel(chore) {
  if (!chore.last_done) return { text: "Never done", color: "#854F0B" };
  const days = daysOverdue(chore);
  if (days > 0) return { text: `Overdue ${days}d`, color: "#c0392b" };
  if (days === 0) return { text: "Due today", color: "#854F0B" };
  return { text: `Due in ${-days}d`, color: "#3B6D11" };
}

export default function ChoresPanel() {
  const [chores, setChores] = useState([]);
  const [newName, setNewName] = useState("");
  const [newFreq, setNewFreq] = useState("weekly");

  useEffect(() => {
    fetch("/api/chores/")
      .then(r => r.json())
      .then(setChores)
      .catch(console.error);
  }, []);

  async function addChore(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/chores/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), frequency: newFreq }),
    });
    if (res.ok) {
      const chore = await res.json();
      setChores(prev => [...prev, chore]);
      setNewName("");
    }
  }

  async function markDone(id) {
    const res = await fetch(`/api/chores/${id}/done`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setChores(prev => prev.map(c => c.id === id ? updated : c));
    }
  }

  async function deleteChore(id) {
    await fetch(`/api/chores/${id}`, { method: "DELETE" });
    setChores(prev => prev.filter(c => c.id !== id));
  }

  const sorted = [...chores].sort((a, b) => {
    const da = daysOverdue(a) ?? 999;
    const db = daysOverdue(b) ?? 999;
    return db - da;
  });

  return (
    <div>
      <h2 style={styles.sectionTitle}>Home chores</h2>

      {/* Add form */}
      <form onSubmit={addChore} style={styles.form}>
        <input
          style={styles.input}
          placeholder="Chore name…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <select
          style={styles.select}
          value={newFreq}
          onChange={e => setNewFreq(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <button type="submit" style={styles.addBtn}>Add</button>
      </form>

      {/* List */}
      {chores.length === 0 ? (
        <p style={styles.empty}>No chores yet — add one above.</p>
      ) : (
        <div style={styles.list}>
          {sorted.map(c => {
            const due = dueLabel(c);
            return (
              <div key={c.id} style={styles.row}>
                <div style={styles.rowLeft}>
                  <span style={styles.choreName}>{c.name}</span>
                  <span style={styles.freq}>{c.frequency}</span>
                </div>
                <div style={styles.rowRight}>
                  <span style={{ ...styles.dueTag, color: due.color }}>{due.text}</span>
                  <button style={styles.doneBtn} onClick={() => markDone(c.id)}>Done ✓</button>
                  <button style={styles.deleteBtn} onClick={() => deleteChore(c.id)}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: { fontSize: "15px", fontWeight: 500, marginBottom: "1rem" },
  form: { display: "flex", gap: "8px", marginBottom: "1.25rem", flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: "160px",
    padding: "7px 10px",
    fontSize: "13px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
  },
  select: {
    padding: "7px 10px",
    fontSize: "13px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "white",
  },
  addBtn: {
    padding: "7px 16px",
    fontSize: "13px",
    background: "var(--color-accent)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
  },
  empty: { fontSize: "13px", color: "var(--color-text-muted)" },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    border: "1px solid var(--color-border-light)",
    borderRadius: "var(--radius-md)",
    flexWrap: "wrap",
    gap: "8px",
  },
  rowLeft: { display: "flex", alignItems: "center", gap: "10px" },
  choreName: { fontSize: "13px", fontWeight: 500 },
  freq: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
    background: "var(--color-bg-secondary)",
    padding: "2px 7px",
    borderRadius: "10px",
  },
  rowRight: { display: "flex", alignItems: "center", gap: "8px" },
  dueTag: { fontSize: "11px", fontWeight: 500 },
  doneBtn: {
    fontSize: "11px",
    padding: "4px 10px",
    border: "1px solid #3B6D11",
    borderRadius: "var(--radius-sm)",
    background: "#EAF3DE",
    color: "#3B6D11",
    cursor: "pointer",
  },
  deleteBtn: {
    fontSize: "14px",
    padding: "2px 8px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },
};
