import { useState, useEffect } from "react";

const ICON_URL = code => `https://openweathermap.org/img/wn/${code}@2x.png`;

export default function WeatherPanel() {
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/weather/current").then(r => r.json()),
      fetch("/api/weather/forecast").then(r => r.json()),
    ]).then(([cur, fore]) => {
      if (cur.detail) { setError(cur.detail); return; }
      setCurrent(cur);
      setForecast(fore.forecast || []);
    }).catch(() => setError("Failed to load weather."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={s.muted}>Loading weather…</p>;
  if (error) return (
    <div style={s.errorBox}>
      <p style={s.errorTitle}>Weather not configured</p>
      <p style={s.errorBody}>{error}</p>
      <p style={s.errorHint}>Get a free API key at openweathermap.org and add <code>OPENWEATHER_API_KEY</code> to your <code>.env</code>.</p>
    </div>
  );

  return (
    <div style={s.container}>
      {current && (
        <div style={s.currentCard}>
          <div style={s.currentLeft}>
            <img src={ICON_URL(current.icon)} alt={current.description} style={s.icon} />
            <div>
              <div style={s.temp}>{current.temp}°C</div>
              <div style={s.desc}>{current.description}</div>
            </div>
          </div>
          <div style={s.currentRight}>
            <div style={s.meta}>Feels like {current.feels_like}°C</div>
            <div style={s.meta}>Humidity {current.humidity}%</div>
            <div style={s.meta}>Wind {current.wind_kph} km/h</div>
          </div>
        </div>
      )}

      {forecast.length > 0 && (
        <div>
          <h3 style={s.forecastTitle}>5-day forecast</h3>
          <div style={s.forecastRow}>
            {forecast.map(d => (
              <div key={d.date} style={s.forecastDay}>
                <div style={s.forecastDate}>{new Date(d.date).toLocaleDateString("en-NL", { weekday: "short" })}</div>
                <img src={ICON_URL(d.icon)} alt={d.description} style={s.smallIcon} />
                <div style={s.forecastTemps}>
                  <span style={s.tempHigh}>{Math.round(d.temp_max)}°</span>
                  <span style={s.tempLow}>{Math.round(d.temp_min)}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={s.hint}>Weather is automatically used in your chore suggestions on the Home Chores panel.</p>
    </div>
  );
}

const s = {
  container: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  muted: { fontSize: "13px", color: "var(--color-text-muted)" },
  errorBox: { border: "1px solid #FDECEA", borderRadius: "var(--radius-lg)", padding: "1.25rem", background: "#FFF8F8" },
  errorTitle: { fontSize: "14px", fontWeight: 500, color: "#C0392B", marginBottom: "6px" },
  errorBody: { fontSize: "13px", marginBottom: "8px" },
  errorHint: { fontSize: "12px", color: "var(--color-text-muted)" },
  currentCard: { display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "1.25rem", flexWrap: "wrap", gap: "1rem" },
  currentLeft: { display: "flex", alignItems: "center", gap: "12px" },
  icon: { width: "64px", height: "64px" },
  temp: { fontSize: "36px", fontWeight: 300 },
  desc: { fontSize: "13px", color: "var(--color-text-muted)", textTransform: "capitalize" },
  currentRight: { display: "flex", flexDirection: "column", gap: "4px" },
  meta: { fontSize: "13px", color: "var(--color-text-muted)" },
  forecastTitle: { fontSize: "13px", fontWeight: 500, marginBottom: "10px" },
  forecastRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
  forecastDay: { flex: "1 1 80px", display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", padding: "10px 8px" },
  forecastDate: { fontSize: "11px", fontWeight: 500, marginBottom: "4px" },
  smallIcon: { width: "36px", height: "36px" },
  forecastTemps: { display: "flex", gap: "6px", fontSize: "12px" },
  tempHigh: { fontWeight: 500 },
  tempLow: { color: "var(--color-text-muted)" },
  hint: { fontSize: "12px", color: "var(--color-text-muted)", fontStyle: "italic" },
};
