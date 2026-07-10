import { useState, useEffect } from "react";

function priorityColor(p) {
  return p === "high" ? { background: "#FAEEDA", color: "#854F0B" }
       : p === "low"  ? { background: "#EEEDFE", color: "#534AB7" }
       :                { background: "#EAF3DE", color: "#3B6D11" };
}

function fmtDuration(secs) {
  if (!secs) return null;
  const m = Math.round(secs / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PocketPanel() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/pocket/recordings")
      .then(r => r.json())
      .then(d => { if (d.success) setRecordings(d.data || []); else setError(d.error || "Failed to load"); })
      .catch(() => setError("Could not reach server"))
      .finally(() => setLoading(false));
  }, []);

  async function aiSummarise(id) {
    setAiSummaryLoading(true);
    setAiSummary("");
    try {
      const r = await fetch(`/api/pocket/recordings/${id}/ai/summarise`, { method: "POST" });
      const d = await r.json();
      setAiSummary(d.summary || d.detail || "No summary returned");
    } catch { setAiSummary("Error reaching server."); }
    finally { setAiSummaryLoading(false); }
  }

  async function extractTasks(id) {
    setExtractLoading(true);
    setExtractedTasks(null);
    try {
      const r = await fetch(`/api/pocket/recordings/${id}/ai/extract-tasks`, { method: "POST" });
      const d = await r.json();
      setExtractedTasks(d);
    } catch { setExtractedTasks({ error: "Error reaching server." }); }
    finally { setExtractLoading(false); }
  }

  async function openRecording(rec) {
    setSelected(rec);
    setDetail(null);
    setAiSummary("");
    setExtractedTasks(null);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/pocket/recordings/${rec.id}`);
      const d = await r.json();
      setDetail(d.data || d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function doSearch(e) {
    e.preventDefault();
    if (!query.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const r = await fetch("/api/pocket/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const d = await r.json();
      setSearchResults(d.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  if (selected) {
    return (
      <div style={s.container}>
        <button style={s.backBtn} onClick={() => { setSelected(null); setDetail(null); }}>
          ← All recordings
        </button>
        <h2 style={s.recTitle}>{selected.title}</h2>
        <div style={s.recMeta}>
          {fmtDate(selected.recording_at)}
          {selected.duration ? ` · ${fmtDuration(selected.duration)}` : ""}
          {selected.language ? ` · ${selected.language.toUpperCase()}` : ""}
        </div>

        <div style={s.aiRow}>
          <button style={s.btnAi} onClick={() => aiSummarise(selected.id)} disabled={aiSummaryLoading}>
            {aiSummaryLoading ? "Summarising…" : "✦ Summarise"}
          </button>
          <button style={s.btnAi} onClick={() => extractTasks(selected.id)} disabled={extractLoading}>
            {extractLoading ? "Extracting…" : "✦ Extract tasks"}
          </button>
        </div>

        {aiSummary && (
          <section style={s.section}>
            <div style={s.sectionLabel}>AI Summary</div>
            <p style={s.body}>{aiSummary}</p>
          </section>
        )}

        {extractedTasks && !extractedTasks.error && (
          <section style={s.section}>
            <div style={s.sectionLabel}>
              Tasks created ({extractedTasks.created})
            </div>
            {extractedTasks.tasks.length === 0
              ? <p style={s.muted}>No action items found in this recording.</p>
              : extractedTasks.tasks.map((t, i) => (
                <div key={i} style={s.taskRow}>
                  <span style={{ ...s.priority, ...priorityColor(t.priority) }}>{t.priority}</span>
                  <div>
                    <div style={s.taskTitle}>{t.title}</div>
                    {t.notes && <div style={s.taskNotes}>{t.notes}</div>}
                  </div>
                </div>
              ))
            }
          </section>
        )}
        {extractedTasks?.error && <p style={s.error}>{extractedTasks.error}</p>}

        {detailLoading && <p style={s.muted}>Loading transcript…</p>}

        {detail && (
          <>
            {detail.summary && (
              <section style={s.section}>
                <div style={s.sectionLabel}>Summary</div>
                <p style={s.body}>{typeof detail.summary === "object" ? detail.summary.text : detail.summary}</p>
              </section>
            )}
            {detail.transcript && (
              <section style={s.section}>
                <div style={s.sectionLabel}>Transcript</div>
                <pre style={s.transcript}>
                  {typeof detail.transcript === "object" ? detail.transcript.text : detail.transcript}
                </pre>
              </section>
            )}
            {!detail.summary && !detail.transcript && (
              <p style={s.muted}>No transcript or summary available yet.</p>
            )}
          </>
        )}
      </div>
    );
  }

  const listToShow = searchResults !== null ? searchResults : recordings;

  return (
    <div style={s.container}>
      <form onSubmit={doSearch} style={s.searchRow}>
        <input
          style={s.input}
          placeholder="Search recordings…"
          value={query}
          onChange={e => { setQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
        />
        <button type="submit" style={s.btn} disabled={searching}>
          {searching ? "…" : "Search"}
        </button>
        {searchResults !== null && (
          <button type="button" style={s.btnSecondary} onClick={() => { setSearchResults(null); setQuery(""); }}>
            Clear
          </button>
        )}
      </form>

      {error && <p style={s.error}>{error}</p>}
      {loading && <p style={s.muted}>Loading…</p>}
      {!loading && !error && listToShow.length === 0 && (
        <p style={s.muted}>{searchResults !== null ? "No results for that query." : "No recordings found."}</p>
      )}

      <div style={s.list}>
        {listToShow.map(rec => (
          <button key={rec.id} style={s.recCard} onClick={() => openRecording(rec)}>
            <div style={s.recTop}>
              <span style={s.recName}>{rec.title}</span>
              {rec.duration && <span style={s.recDur}>{fmtDuration(rec.duration)}</span>}
            </div>
            <div style={s.recDate}>{fmtDate(rec.recording_at)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", gap: "1rem" },
  searchRow: { display: "flex", gap: "8px" },
  input: { flex: 1, padding: "7px 10px", fontSize: "13px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", outline: "none", background: "var(--color-bg)" },
  btn: { padding: "7px 16px", fontSize: "13px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", whiteSpace: "nowrap" },
  btnSecondary: { padding: "7px 14px", fontSize: "13px", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-muted)", whiteSpace: "nowrap" },
  list: { display: "flex", flexDirection: "column", gap: "6px" },
  recCard: { display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", background: "var(--color-bg)", cursor: "pointer", transition: "border-color 0.15s" },
  recTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" },
  recName: { fontSize: "13px", fontWeight: 500, color: "var(--color-text)" },
  recDur: { fontSize: "11px", color: "var(--color-text-muted)", whiteSpace: "nowrap", flexShrink: 0 },
  recDate: { fontSize: "11px", color: "var(--color-text-muted)", marginTop: "3px" },
  backBtn: { alignSelf: "flex-start", fontSize: "12px", padding: "4px 10px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)" },
  recTitle: { fontSize: "16px", fontWeight: 600, margin: 0 },
  recMeta: { fontSize: "12px", color: "var(--color-text-muted)" },
  section: { border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "1rem", overflow: "hidden" },
  sectionLabel: { fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", marginBottom: "8px" },
  body: { fontSize: "13px", lineHeight: 1.6, margin: 0, overflowWrap: "break-word", wordBreak: "break-word" },
  transcript: { fontSize: "12px", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, maxHeight: "420px", overflowY: "auto" },
  aiRow: { display: "flex", gap: "8px" },
  btnAi: { padding: "7px 14px", fontSize: "13px", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-muted)", whiteSpace: "nowrap" },
  taskRow: { display: "flex", alignItems: "flex-start", gap: "10px", padding: "6px 0", borderBottom: "1px solid var(--color-border-light)" },
  priority: { fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "10px", whiteSpace: "nowrap", marginTop: "2px" },
  taskTitle: { fontSize: "13px", fontWeight: 500 },
  taskNotes: { fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px", lineHeight: 1.4 },
  muted: { fontSize: "13px", color: "var(--color-text-muted)", margin: 0 },
  error: { fontSize: "13px", color: "#c0392b", margin: 0 },
};
