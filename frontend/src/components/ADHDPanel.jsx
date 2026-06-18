import { useState } from "react";

function Section({ title, hint, children }) {
  return (
    <div style={s.section}>
      <h2 style={s.title}>{title}</h2>
      <p style={s.hint}>{hint}</p>
      {children}
    </div>
  );
}

function Result({ text }) {
  if (!text) return null;
  return <pre style={s.result}>{text}</pre>;
}

export default function ADHDPanel() {
  const [context, setContext] = useState("");
  const [focusReply, setFocusReply] = useState("");
  const [focusLoading, setFocusLoading] = useState(false);

  const [task, setTask] = useState("");
  const [breakdownReply, setBreakdownReply] = useState("");
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const [checkinReply, setCheckinReply] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);

  async function post(path, body, setReply, setLoading) {
    setLoading(true);
    setReply("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      setReply(d.reply || d.detail || "No response");
    } catch { setReply("Error reaching server."); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.container}>
      <Section title="Plan my day" hint="Get a focused plan tailored to ADHD — one main goal and two supporting tasks.">
        <div style={s.row}>
          <input style={s.input} placeholder="Any context? (e.g. busy afternoon, low energy)" value={context} onChange={e => setContext(e.target.value)} />
          <button style={s.btn} disabled={focusLoading}
            onClick={() => post("/api/adhd/focus", { context }, setFocusReply, setFocusLoading)}>
            {focusLoading ? "Thinking…" : "Plan my day"}
          </button>
        </div>
        <Result text={focusReply} />
      </Section>

      <Section title="Break down a task" hint="Overwhelmed by a task? Get it split into tiny, doable steps.">
        <div style={s.row}>
          <input style={{ ...s.input, flex: 1 }} placeholder="e.g. Write my monthly report" value={task} onChange={e => setTask(e.target.value)} />
          <button style={s.btn} disabled={breakdownLoading || !task.trim()}
            onClick={() => post("/api/adhd/breakdown", { task }, setBreakdownReply, setBreakdownLoading)}>
            {breakdownLoading ? "Thinking…" : "Break it down"}
          </button>
        </div>
        <Result text={breakdownReply} />
      </Section>

      <Section title="Check in" hint="A quick encouraging message to keep you going.">
        <button style={s.btn} disabled={checkinLoading}
          onClick={() => post("/api/adhd/checkin", {}, setCheckinReply, setCheckinLoading)}>
          {checkinLoading ? "…" : "Check in with me"}
        </button>
        <Result text={checkinReply} />
      </Section>
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  section: { border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "1.25rem" },
  title: { fontSize: "14px", fontWeight: 500, marginBottom: "4px" },
  hint: { fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "12px" },
  row: { display: "flex", gap: "8px", flexWrap: "wrap" },
  input: { flex: 1, minWidth: "180px", padding: "7px 10px", fontSize: "13px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", outline: "none" },
  btn: { padding: "7px 16px", fontSize: "13px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", whiteSpace: "nowrap" },
  result: { marginTop: "12px", padding: "12px", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" },
};
