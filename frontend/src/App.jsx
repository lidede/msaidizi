import { useState } from "react";
import Dashboard from "./components/Dashboard";
import ChoresPanel from "./components/ChoresPanel";
import AIPanel from "./components/AIPanel";
import TodoPanel from "./components/TodoPanel";
import ADHDPanel from "./components/ADHDPanel";
import IdeamanPanel from "./components/IdeamanPanel";
import EduPanel from "./components/EduPanel";
import WeatherPanel from "./components/WeatherPanel";
import NewsPanel from "./components/NewsPanel";
import CalendarPanel from "./components/CalendarPanel";
import GmailPanel from "./components/GmailPanel";

const PANEL_META = {
  todo:     { icon: "✓",  title: "Todo manager" },
  chores:   { icon: "🏠", title: "Home chores" },
  adhd:     { icon: "🧠", title: "ADHD coach" },
  ideaman:  { icon: "💡", title: "Ideaman" },
  edu:      { icon: "🎓", title: "Edu (Dutch + tech)" },
  weather:  { icon: "🗺️", title: "Busyman — Haarlem weather" },
  news:     { icon: "📰", title: "Newsman" },
  calendar: { icon: "📅", title: "Family calendar" },
  gmail:    { icon: "📧", title: "Email assistant" },
  ai:       { icon: "✦",  title: "Ask GreenPT" },
};

function PanelContent({ panelKey, pendingPrompt, onPromptConsumed }) {
  switch (panelKey) {
    case "todo":     return <TodoPanel />;
    case "chores":   return <ChoresPanel />;
    case "adhd":     return <ADHDPanel />;
    case "ideaman":  return <IdeamanPanel />;
    case "edu":      return <EduPanel />;
    case "weather":  return <WeatherPanel />;
    case "news":     return <NewsPanel />;
    case "calendar": return <CalendarPanel />;
    case "gmail":    return <GmailPanel />;
    case "ai":       return <AIPanel pendingPrompt={pendingPrompt} onPromptConsumed={onPromptConsumed} />;
    default:         return null;
  }
}

export default function App() {
  const [activePanel, setActivePanel] = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState("");

  function openPanel(key, _agent) {
    setActivePanel(key);
    setPendingPrompt("");
  }

  function firePrompt(prompt) {
    setPendingPrompt(prompt);
    setActivePanel("ai");
  }

  function goBack() {
    setActivePanel(null);
    setPendingPrompt("");
  }

  const meta = activePanel ? PANEL_META[activePanel] : null;

  return (
    <div>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          {activePanel && (
            <button style={styles.backBtn} onClick={goBack}>← Back</button>
          )}
          <div>
            <h1 style={styles.title}>
              {meta ? `${meta.icon}  ${meta.title}` : "Msaidizi"}
            </h1>
            {!activePanel && <p style={styles.subtitle}>Personal agent HQ</p>}
          </div>
        </div>
        {!activePanel && (
          <button style={styles.aiBtn} onClick={() => setActivePanel("ai")}>Ask GreenPT</button>
        )}
      </header>

      {activePanel
        ? <PanelContent panelKey={activePanel} pendingPrompt={pendingPrompt} onPromptConsumed={() => setPendingPrompt("")} />
        : <Dashboard onOpenPanel={openPanel} onPrompt={firePrompt} />
      }
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: "1.25rem",
    borderBottom: "1px solid var(--color-border)",
    marginBottom: "1.5rem",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  backBtn: {
    fontSize: "13px",
    padding: "5px 12px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },
  title: { fontSize: "18px", fontWeight: 600 },
  subtitle: { fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" },
  aiBtn: {
    fontSize: "13px",
    padding: "6px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    background: "transparent",
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },
};
