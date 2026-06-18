import { useState } from "react";

export default function IdeamanPanel() {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [ideas, setIdeas] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setIdeas("");
    try {
      const res = await fetch("/api/ideaman/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), context: context.trim() }),
      });
      const d = await res.json();
      setIdeas(d.ideas || d.detail || "No response");
    } catch { setIdeas("Error reaching server."); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.container}>
      <p style={s.intro}>Get 5 fresh, non-obvious ideas on any topic — covering practical, social, tech, creative, and wildcard angles.</p>

      <form onSubmit={generate} style={s.form}>
        <input
          style={s.input}
          placeholder="Topic — e.g. ways to stay focused at home"
          value={topic}
          onChange={e => setTopic(e.target.value)}
        />
        <input
          style={s.input}
          placeholder="Context (optional) — e.g. I work remotely, have ADHD"
          value={context}
          onChange={e => setContext(e.target.value)}
        />
        <button type="submit" style={s.btn} disabled={loading || !topic.trim()}>
          {loading ? "Generating…" : "✦ Generate ideas"}
        </button>
      </form>

      {ideas && <pre style={s.result}>{ideas}</pre>}
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", gap: "1rem" },
  intro: { fontSize: "13px", color: "var(--color-text-muted)" },
  form: { display: "flex", flexDirection: "column", gap: "8px" },
  input: { padding: "7px 10px", fontSize: "13px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", outline: "none" },
  btn: { alignSelf: "flex-start", padding: "7px 20px", fontSize: "13px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" },
  result: { padding: "14px", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" },
};
