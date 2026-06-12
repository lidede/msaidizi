import { useState, useEffect } from "react";

const STATUS_META = {
  live:      { label: "Live ✓",   bg: "#EAF3DE", color: "#3B6D11" },
  connected: { label: "Connected", bg: "#E6F1FB", color: "#185FA5" },
  partial:   { label: "Partial",   bg: "#FAEEDA", color: "#854F0B" },
  planned:   { label: "Planned",   bg: "#EEEDFE", color: "#534AB7" },
};

const FILTERS = ["all", "live", "connected", "partial", "planned"];

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/agents/")
      .then(r => r.json())
      .then(setAgents)
      .catch(console.error);
  }, []);

  const counts = agents.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const visible = filter === "all" ? agents : agents.filter(a => a.status === filter);

  async function updateStatus(id, status) {
    const res = await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAgents(prev => prev.map(a => a.id === id ? updated : a));
    }
  }

  return (
    <div>
      {/* Stats */}
      <div style={styles.stats}>
        {Object.entries({ live: "Live", connected: "Connected", partial: "Partial", planned: "Planned" }).map(([k, label]) => (
          <div key={k} style={styles.stat}>
            <div style={styles.statNum}>{counts[k] || 0}</div>
            <div style={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? `All (${agents.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={styles.grid}>
        {visible.map(agent => (
          <AgentCard key={agent.id} agent={agent} onStatusChange={updateStatus} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agent, onStatusChange }) {
  const meta = STATUS_META[agent.status] || STATUS_META.planned;
  const statuses = ["planned", "partial", "connected", "live"];

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <span style={styles.icon}>{agent.icon}</span>
        <select
          style={{ ...styles.badge, background: meta.bg, color: meta.color }}
          value={agent.status}
          onChange={e => onStatusChange(agent.id, e.target.value)}
        >
          {statuses.map(s => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>
      <div style={styles.cardName}>{agent.name}</div>
      <div style={styles.cardDesc}>{agent.description}</div>
    </div>
  );
}

const styles = {
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    marginBottom: "1.5rem",
  },
  stat: {
    background: "var(--color-bg-secondary)",
    borderRadius: "var(--radius-md)",
    padding: "12px 14px",
  },
  statNum: { fontSize: "22px", fontWeight: 500 },
  statLabel: { fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" },
  filters: {
    display: "flex",
    gap: "8px",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
  },
  filterBtn: {
    fontSize: "12px",
    padding: "5px 14px",
    borderRadius: "20px",
    border: "1px solid var(--color-border)",
    background: "transparent",
    color: "var(--color-text-muted)",
    transition: "all 0.15s",
  },
  filterBtnActive: {
    background: "var(--color-bg-secondary)",
    color: "var(--color-text)",
    borderColor: "#999",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: "10px",
  },
  card: {
    background: "var(--color-bg)",
    border: "1px solid var(--color-border-light)",
    borderRadius: "var(--radius-lg)",
    padding: "14px",
    transition: "border-color 0.15s",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px",
  },
  icon: { fontSize: "20px", lineHeight: 1 },
  badge: {
    fontSize: "10px",
    fontWeight: 500,
    padding: "3px 8px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
  },
  cardName: { fontSize: "13px", fontWeight: 500, marginBottom: "4px" },
  cardDesc: { fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 },
};
