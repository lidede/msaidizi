import { useState, useEffect } from "react";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-NL", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CalendarPanel() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [analysis, setAnalysis] = useState("");
  const [eventsLoading, setEventsLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar/status")
      .then(r => r.json())
      .then(d => {
        setConnected(d.connected);
        if (d.connected) loadEvents();
      })
      .finally(() => setStatusLoading(false));

    // Handle redirect back from Google OAuth
    if (window.location.search.includes("connected=google")) {
      window.history.replaceState({}, "", window.location.pathname);
      setConnected(true);
    }
  }, []);

  async function loadEvents() {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/calendar/events");
      const d = await res.json();
      setEvents(d.events || []);
    } catch { setEvents([]); }
    finally { setEventsLoading(false); }
  }

  async function aiPlan() {
    setAnalysisLoading(true);
    setAnalysis("");
    try {
      const res = await fetch("/api/calendar/ai/plan", { method: "POST" });
      const d = await res.json();
      setAnalysis(d.analysis || d.detail || "No response");
    } catch { setAnalysis("Error reaching server."); }
    finally { setAnalysisLoading(false); }
  }

  async function disconnect() {
    await fetch("/api/calendar/disconnect", { method: "DELETE" });
    setConnected(false);
    setEvents([]);
    setAnalysis("");
  }

  if (statusLoading) return <p style={s.muted}>Checking connection…</p>;

  if (!connected) return (
    <div style={s.connectBox}>
      <p style={s.connectTitle}>Connect Google Calendar</p>
      <p style={s.connectHint}>Connecting will also give access to Gmail (same Google account). You'll be asked for read-only permissions.</p>
      <a href="/api/calendar/auth" style={s.connectBtn}>Connect Google Account →</a>
      <p style={s.setupNote}>
        <strong>First-time setup:</strong> You need a Google Cloud project with Calendar API + Gmail API enabled, and OAuth credentials. See <code>.env.example</code> for details.
      </p>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.header}>
        <span style={s.connected}>● Connected</span>
        <div style={s.headerRight}>
          <button style={s.btnSecondary} onClick={loadEvents} disabled={eventsLoading}>
            {eventsLoading ? "Loading…" : "↻ Refresh"}
          </button>
          <button style={s.btnAI} onClick={aiPlan} disabled={analysisLoading}>
            {analysisLoading ? "Analysing…" : "✦ AI Analysis"}
          </button>
          <button style={s.btnDanger} onClick={disconnect}>Disconnect</button>
        </div>
      </div>

      {analysis && <pre style={s.result}>{analysis}</pre>}

      {events.length === 0 && !eventsLoading && (
        <p style={s.muted}>No upcoming events found.</p>
      )}

      <div style={s.eventList}>
        {events.map(e => (
          <div key={e.id} style={s.event}>
            <div style={s.eventTime}>{formatDate(e.start)}</div>
            <div style={s.eventTitle}>{e.title}</div>
            {e.location && <div style={s.eventLocation}>📍 {e.location}</div>}
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
  setupNote: { fontSize: "12px", color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border-light)", paddingTop: "10px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" },
  connected: { fontSize: "12px", color: "#3B6D11", fontWeight: 500 },
  headerRight: { display: "flex", gap: "6px" },
  btnSecondary: { fontSize: "12px", padding: "5px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "transparent", cursor: "pointer" },
  btnAI: { fontSize: "12px", padding: "5px 12px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--color-accent)", color: "white", cursor: "pointer" },
  btnDanger: { fontSize: "12px", padding: "5px 12px", border: "1px solid #FDECEA", borderRadius: "var(--radius-sm)", background: "transparent", color: "#C0392B", cursor: "pointer" },
  result: { padding: "12px", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  eventList: { display: "flex", flexDirection: "column", gap: "6px" },
  event: { padding: "10px 14px", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)" },
  eventTime: { fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "3px" },
  eventTitle: { fontSize: "13px", fontWeight: 500 },
  eventLocation: { fontSize: "11px", color: "var(--color-text-muted)", marginTop: "3px" },
};
