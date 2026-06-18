import { useState, useEffect } from "react";

export default function NewsPanel() {
  const [sources, setSources] = useState([]);
  const [articles, setArticles] = useState([]);
  const [summary, setSummary] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("general");
  const [feedLoading, setFeedLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetch("/api/news/sources").then(r => r.json()).then(setSources).catch(console.error);
  }, []);

  async function addSource(e) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    const res = await fetch("/api/news/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), url: url.trim(), category }),
    });
    if (res.ok) {
      const src = await res.json();
      setSources(prev => [...prev, src]);
      setName(""); setUrl("");
    }
  }

  async function deleteSource(id) {
    await fetch(`/api/news/sources/${id}`, { method: "DELETE" });
    setSources(prev => prev.filter(s => s.id !== id));
  }

  async function fetchFeed() {
    setFeedLoading(true);
    try {
      const res = await fetch("/api/news/feed");
      const d = await res.json();
      setArticles(d.articles || []);
    } catch { setArticles([]); }
    finally { setFeedLoading(false); }
  }

  async function aiSummarise() {
    const headlines = articles.map(a => a.title).filter(Boolean);
    if (!headlines.length) return;
    setSummaryLoading(true);
    setSummary("");
    try {
      const res = await fetch("/api/news/ai/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headlines }),
      });
      const d = await res.json();
      setSummary(d.summary || d.detail || "No summary");
    } catch { setSummary("Error reaching server."); }
    finally { setSummaryLoading(false); }
  }

  return (
    <div style={s.container}>
      <section style={s.section}>
        <h2 style={s.title}>RSS sources</h2>
        {sources.length > 0 && (
          <div style={s.chips}>
            {sources.map(src => (
              <div key={src.id} style={s.chip}>
                <span>{src.name}</span>
                <button style={s.chipDel} onClick={() => deleteSource(src.id)}>×</button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={addSource} style={s.form}>
          <input style={s.input} placeholder="Source name" value={name} onChange={e => setName(e.target.value)} />
          <input style={{ ...s.input, flex: 2 }} placeholder="RSS feed URL" value={url} onChange={e => setUrl(e.target.value)} />
          <select style={s.select} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="general">General</option>
            <option value="tech">Tech</option>
            <option value="nl">Netherlands</option>
            <option value="world">World</option>
          </select>
          <button type="submit" style={s.btn}>Add</button>
        </form>
      </section>

      {sources.length > 0 && (
        <div style={s.row}>
          <button style={s.btn} onClick={fetchFeed} disabled={feedLoading}>
            {feedLoading ? "Fetching…" : "Refresh feed"}
          </button>
          {articles.length > 0 && (
            <button style={s.btnSecondary} onClick={aiSummarise} disabled={summaryLoading}>
              {summaryLoading ? "Summarising…" : "✦ AI Summary"}
            </button>
          )}
        </div>
      )}

      {summary && <pre style={s.result}>{summary}</pre>}

      {articles.length > 0 && (
        <div style={s.articleList}>
          {articles.map((a, i) => (
            <a key={i} href={a.link} target="_blank" rel="noopener noreferrer" style={s.article}>
              <div style={s.articleSource}>{a.source} · {a.category}</div>
              <div style={s.articleTitle}>{a.title}</div>
              {a.summary && <div style={s.articleSummary}>{a.summary}</div>}
            </a>
          ))}
        </div>
      )}

      {sources.length === 0 && (
        <p style={s.empty}>No sources yet. Add an RSS feed above to get started. Try: <code>https://feeds.nos.nl/nosnieuwsalgemeen</code></p>
      )}
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  section: { border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "1.25rem" },
  title: { fontSize: "14px", fontWeight: 500, marginBottom: "10px" },
  chips: { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" },
  chip: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "4px 10px", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: "20px" },
  chipDel: { background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "var(--color-text-muted)", padding: 0, lineHeight: 1 },
  form: { display: "flex", gap: "8px", flexWrap: "wrap" },
  input: { flex: 1, minWidth: "120px", padding: "7px 10px", fontSize: "13px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", outline: "none" },
  select: { padding: "7px 10px", fontSize: "13px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "white" },
  btn: { padding: "7px 16px", fontSize: "13px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", whiteSpace: "nowrap" },
  btnSecondary: { padding: "7px 16px", fontSize: "13px", background: "transparent", color: "var(--color-text)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", whiteSpace: "nowrap" },
  row: { display: "flex", gap: "8px" },
  result: { padding: "12px", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  articleList: { display: "flex", flexDirection: "column", gap: "6px" },
  article: { display: "block", padding: "10px 14px", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", textDecoration: "none", color: "inherit", transition: "border-color 0.15s" },
  articleSource: { fontSize: "10px", color: "var(--color-text-muted)", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.04em" },
  articleTitle: { fontSize: "13px", fontWeight: 500 },
  articleSummary: { fontSize: "12px", color: "var(--color-text-muted)", marginTop: "3px", lineHeight: 1.4 },
  empty: { fontSize: "13px", color: "var(--color-text-muted)" },
};
