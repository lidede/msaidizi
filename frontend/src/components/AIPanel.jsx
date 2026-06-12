import { useState, useEffect } from "react";

export default function AIPanel({ pendingPrompt, onPromptConsumed }) {
  const [chatInput, setChatInput] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!pendingPrompt) return;
    setChatInput(pendingPrompt);
    onPromptConsumed();
    // auto-send
    setChatLoading(true);
    setChatReply("");
    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: pendingPrompt }),
    })
      .then(r => r.json())
      .then(d => setChatReply(d.reply || d.detail || "No response"))
      .catch(() => setChatReply("Error reaching server."))
      .finally(() => setChatLoading(false));
  }, [pendingPrompt]);

  const [weather, setWeather] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function sendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatLoading(true);
    setChatReply("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput }),
      });
      const data = await res.json();
      setChatReply(data.reply || data.detail || "No response");
    } catch {
      setChatReply("Error reaching server.");
    } finally {
      setChatLoading(false);
    }
  }

  async function getSuggestions() {
    setSuggestLoading(true);
    setSuggestion("");
    try {
      const res = await fetch("/api/ai/suggest-chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather }),
      });
      const data = await res.json();
      setSuggestion(data.suggestion || data.detail || "No response");
    } catch {
      setSuggestion("Error reaching server.");
    } finally {
      setSuggestLoading(false);
    }
  }

  async function getWeekSummary() {
    setSummaryLoading(true);
    setSummary("");
    try {
      const res = await fetch("/api/ai/week-summary");
      const data = await res.json();
      setSummary(data.summary || data.detail || "No response");
    } catch {
      setSummary("Error reaching server.");
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div style={styles.container}>

      {/* Chore suggestions */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Suggest chores</h2>
        <p style={styles.hint}>GreenPT looks at your chore history and suggests what to do today.</p>
        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="Weather in Haarlem (optional, e.g. rainy)"
            value={weather}
            onChange={e => setWeather(e.target.value)}
          />
          <button style={styles.btn} onClick={getSuggestions} disabled={suggestLoading}>
            {suggestLoading ? "Thinking…" : "Suggest"}
          </button>
        </div>
        {suggestion && <pre style={styles.result}>{suggestion}</pre>}
      </section>

      {/* Week summary */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Week summary</h2>
        <p style={styles.hint}>A friendly summary of what you did and what's overdue.</p>
        <button style={styles.btn} onClick={getWeekSummary} disabled={summaryLoading}>
          {summaryLoading ? "Summarising…" : "Summarise my week"}
        </button>
        {summary && <pre style={styles.result}>{summary}</pre>}
      </section>

      {/* General chat */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Ask GreenPT</h2>
        <p style={styles.hint}>General AI chat — ask anything about your agents, chores, or ideas.</p>
        <form onSubmit={sendChat} style={styles.row}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="Ask something…"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
          />
          <button type="submit" style={styles.btn} disabled={chatLoading}>
            {chatLoading ? "…" : "Send"}
          </button>
        </form>
        {chatReply && <pre style={styles.result}>{chatReply}</pre>}
      </section>

    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: "2rem" },
  section: {
    border: "1px solid var(--color-border-light)",
    borderRadius: "var(--radius-lg)",
    padding: "1.25rem",
  },
  sectionTitle: { fontSize: "14px", fontWeight: 500, marginBottom: "4px" },
  hint: { fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "12px" },
  row: { display: "flex", gap: "8px", flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: "180px",
    padding: "7px 10px",
    fontSize: "13px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
  },
  btn: {
    padding: "7px 16px",
    fontSize: "13px",
    background: "var(--color-accent)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  result: {
    marginTop: "12px",
    padding: "12px",
    background: "var(--color-bg-secondary)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};
