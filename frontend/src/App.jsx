import { useState } from "react";
import Dashboard from "./components/Dashboard";
import ChoresPanel from "./components/ChoresPanel";
import AIPanel from "./components/AIPanel";

const TABS = ["Agents", "Chores", "AI"];

export default function App() {
  const [tab, setTab] = useState("Agents");

  return (
    <div>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Msaidizi</h1>
          <p style={styles.subtitle}>Personal agent HQ</p>
        </div>
        <nav style={styles.nav}>
          {TABS.map(t => (
            <button
              key={t}
              style={{ ...styles.tabBtn, ...(tab === t ? styles.tabBtnActive : {}) }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      {tab === "Agents" && <Dashboard />}
      {tab === "Chores" && <ChoresPanel />}
      {tab === "AI"     && <AIPanel />}
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
  title: { fontSize: "18px", fontWeight: 600 },
  subtitle: { fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" },
  nav: { display: "flex", gap: "4px" },
  tabBtn: {
    fontSize: "13px",
    padding: "6px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--color-text-muted)",
    transition: "all 0.1s",
  },
  tabBtnActive: {
    background: "var(--color-bg-secondary)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
  },
};
