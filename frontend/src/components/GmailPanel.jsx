import { useState, useEffect } from "react";

export default function GmailPanel() {
  const [connected, setConnected] = useState(false);
  const [emails, setEmails] = useState([]);
  const [todos, setTodos] = useState("");
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [todosLoading, setTodosLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gmail/status")
      .then(r => r.json())
      .then(d => {
        setConnected(d.connected);
        if (d.connected) loadDigest();
      })
      .finally(() => setStatusLoading(false));
  }, []);

  async function loadDigest() {
    setEmailsLoading(true);
    try {
      const res = await fetch("/api/gmail/digest");
      const d = await res.json();
      setEmails(d.emails || []);
    } catch { setEmails([]); }
    finally { setEmailsLoading(false); }
  }

  async function extractTodos() {
    setTodosLoading(true);
    setTodos("");
    try {
      const res = await fetch("/api/gmail/ai/todos", { method: "POST" });
      const d = await res.json();
      setTodos(d.todos || d.detail || "No response");
    } catch { setTodos("Error reaching server."); }
    finally { setTodosLoading(false); }
  }

  if (statusLoading) return <p style={s.muted}>Checking connection…</p>;

  if (!connected) return (
    <div style={s.connectBox}>
      <p style={s.connectTitle}>Connect Gmail</p>
      <p style={s.connectHint}>
        Gmail uses the same Google OAuth as Calendar. Connect via the{" "}
        <strong>Family calendar</strong> panel, then come back here.
      </p>
      <a href="/api/calendar/auth" style={s.connectBtn}>Connect Google Account →</a>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.header}>
        <span style={s.connected}>● Connected</span>
        <div style={s.headerRight}>
          <button style={s.btnSecondary} onClick={loadDigest} disabled={emailsLoading}>
            {emailsLoading ? "Loading…" : "↻ Refresh"}
          </button>
          <button style={s.btnAI} onClick={extractTodos} disabled={todosLoading}>
            {todosLoading ? "Scanning…" : "✦ Extract todos"}
          </button>
        </div>
      </div>

      {todos && (
        <div style={s.todosBox}>
          <h3 style={s.todosTitle}>Action items from email</h3>
          <pre style={s.result}>{todos}</pre>
        </div>
      )}

      {emails.length === 0 && !emailsLoading && (
        <p style={s.muted}>No unread emails found.</p>
      )}

      <div style={s.emailList}>
        {emails.map(e => (
          <div key={e.id} style={s.email}>
            <div style={s.emailFrom}>{e.from_}</div>
            <div style={s.emailSubject}>{e.subject}</div>
            <div style={s.emailSnippet}>{e.snippet}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", gap: "1rem" },
  muted: { fontSize: "13px", color: "var(--color-text-muted)" },
  connectBox: { border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px" },
  connectTitle: { fontSize: "15px", fontWeight: 500 },
  connectHint: { fontSize: "13px", color: "var(--color-text-muted)" },
  connectBtn: { display: "inline-block", padding: "9px 20px", fontSize: "13px", background: "var(--color-accent)", color: "white", borderRadius: "var(--radius-sm)", textDecoration: "none", alignSelf: "flex-start" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" },
  connected: { fontSize: "12px", color: "#3B6D11", fontWeight: 500 },
  headerRight: { display: "flex", gap: "6px" },
  btnSecondary: { fontSize: "12px", padding: "5px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "transparent", cursor: "pointer" },
  btnAI: { fontSize: "12px", padding: "5px 12px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--color-accent)", color: "white", cursor: "pointer" },
  todosBox: { border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "1rem" },
  todosTitle: { fontSize: "13px", fontWeight: 500, marginBottom: "8px" },
  result: { fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  emailList: { display: "flex", flexDirection: "column", gap: "6px" },
  email: { padding: "10px 14px", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)" },
  emailFrom: { fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "2px" },
  emailSubject: { fontSize: "13px", fontWeight: 500 },
  emailSnippet: { fontSize: "12px", color: "var(--color-text-muted)", marginTop: "3px", lineHeight: 1.4 },
};
