import { useState } from "react";

function LessonCard({ title, content, onRefresh, loading }) {
  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <h3 style={s.cardTitle}>{title}</h3>
        <button style={s.refreshBtn} onClick={onRefresh} disabled={loading}>
          {loading ? "…" : "↻ Refresh"}
        </button>
      </div>
      {content
        ? <pre style={s.cardContent}>{content}</pre>
        : <p style={s.placeholder}>Click refresh to load today's {title.toLowerCase()}.</p>}
    </div>
  );
}

export default function EduPanel() {
  const [dutch, setDutch] = useState("");
  const [dutchLoading, setDutchLoading] = useState(false);
  const [french, setFrench] = useState("");
  const [frenchLoading, setFrenchLoading] = useState(false);
  const [tech, setTech] = useState("");
  const [techLoading, setTechLoading] = useState(false);

  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("dutch");
  const [answer, setAnswer] = useState("");
  const [askLoading, setAskLoading] = useState(false);

  async function loadDutch() {
    setDutchLoading(true);
    try {
      const res = await fetch("/api/edu/dutch");
      const d = await res.json();
      setDutch(d.lesson || d.detail || "No lesson");
    } catch { setDutch("Error reaching server."); }
    finally { setDutchLoading(false); }
  }

  async function loadFrench() {
    setFrenchLoading(true);
    try {
      const res = await fetch("/api/edu/french");
      const d = await res.json();
      setFrench(d.lesson || d.detail || "No lesson");
    } catch { setFrench("Error reaching server."); }
    finally { setFrenchLoading(false); }
  }

  async function loadTech() {
    setTechLoading(true);
    try {
      const res = await fetch("/api/edu/tech");
      const d = await res.json();
      setTech(d.tidbit || d.detail || "No tidbit");
    } catch { setTech("Error reaching server."); }
    finally { setTechLoading(false); }
  }

  async function askQuestion(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setAskLoading(true);
    setAnswer("");
    try {
      const res = await fetch("/api/edu/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), subject }),
      });
      const d = await res.json();
      setAnswer(d.answer || d.detail || "No answer");
    } catch { setAnswer("Error reaching server."); }
    finally { setAskLoading(false); }
  }

  return (
    <div style={s.container}>
      <div style={s.grid}>
        <LessonCard title="Dutch Lesson" content={dutch} onRefresh={loadDutch} loading={dutchLoading} />
        <LessonCard title="French Lesson" content={french} onRefresh={loadFrench} loading={frenchLoading} />
        <LessonCard title="Tech Tidbit" content={tech} onRefresh={loadTech} loading={techLoading} />
      </div>

      <div style={s.section}>
        <h3 style={s.sectionTitle}>Ask a question</h3>
        <form onSubmit={askQuestion} style={s.row}>
          <select style={s.select} value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="dutch">Dutch</option>
            <option value="french">French</option>
            <option value="tech">Tech</option>
          </select>
          <input style={s.input} placeholder="Ask anything…" value={question} onChange={e => setQuestion(e.target.value)} />
          <button type="submit" style={s.btn} disabled={askLoading || !question.trim()}>
            {askLoading ? "…" : "Ask"}
          </button>
        </form>
        {answer && <pre style={s.result}>{answer}</pre>}
      </div>
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" },
  card: { border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "1.25rem" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  cardTitle: { fontSize: "14px", fontWeight: 500 },
  refreshBtn: { fontSize: "11px", padding: "4px 10px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" },
  cardContent: { fontSize: "13px", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  placeholder: { fontSize: "12px", color: "var(--color-text-muted)" },
  section: { border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "1.25rem" },
  sectionTitle: { fontSize: "14px", fontWeight: 500, marginBottom: "12px" },
  row: { display: "flex", gap: "8px", flexWrap: "wrap" },
  select: { padding: "7px 10px", fontSize: "13px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "white" },
  input: { flex: 1, minWidth: "180px", padding: "7px 10px", fontSize: "13px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", outline: "none" },
  btn: { padding: "7px 16px", fontSize: "13px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" },
  result: { marginTop: "12px", padding: "12px", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" },
};
