import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Cities that have real irradiance data files in the backend

const STATS = [
  { key: "capacity_kw", label: "Capacity", fmt: v => `${v} kW`, accent: "#1e6b2e" },
  { key: "annual_generation_kwh", label: "Generation/yr", fmt: v => `${v} kWh`, accent: "#3b8c3b" },
  { key: "annual_savings_inr", label: "Savings/yr", fmt: v => `₹${v?.toLocaleString()}`, accent: "#5cb85c" },
  { key: "payback_years", label: "Payback", fmt: v => `${v} yrs`, accent: "#1e6b2e" },
  { key: "co2_offset_kg_per_year", label: "CO₂ offset/yr", fmt: v => `${v} kg`, accent: "#3b8c3b" },
  { key: "subsidy_inr", label: "Govt subsidy", fmt: v => `₹${v?.toLocaleString()}`, accent: "#5cb85c" },
];

export default function Dashboard({ results, formData, rooftopData, onReset }) {
  const monthlyData = MONTHS.map((_, i) => {
    const key = String(i + 1).padStart(2, "0");
    return results.monthly_generation_kwh?.[key] || 0;
  });

  // FIX 1: Highlight exactly the top 3 months by rank, not by threshold comparison.
  // The old `v >= threshold` caused ties to over-highlight (e.g. 4+ dark bars).
  const top3Indices = [...monthlyData]
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map(x => x.i);
  const top3Set = new Set(top3Indices);

  const chartData = {
    labels: MONTHS,
    datasets: [{
      data: monthlyData,
      backgroundColor: monthlyData.map((_, i) => top3Set.has(i) ? "#1e6b2e" : "#b6d9b6"),
      borderRadius: 2,
      borderSkipped: false,
    }],
  };

  // Snap y-axis to clean 1k boundaries so ticks never duplicate.
  // Root cause: when Chart.js picks a non-1000 step (e.g. 400 or 500),
  // values like 7000 and 7400 both round to "7k kWh" via toFixed(0).
  // Fix: force stepSize:1000 and snap min/max to the nearest 1k grid.
  const minVal = Math.min(...monthlyData);
  const maxVal = Math.max(...monthlyData);
  const yMin = Math.max(0, Math.floor(minVal / 1000) * 1000 - 1000);
  const yMax = Math.ceil(maxVal / 1000) * 1000 + 1000;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#fff",
        borderColor: "#d4e8d4",
        borderWidth: 1,
        titleColor: "#1a1a1a",
        bodyColor: "#6b6b6b",
        padding: 10,
        callbacks: { label: ctx => ` ${ctx.raw.toLocaleString()} kWh` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#aaa", font: { size: 11 } } },
      y: {
        grid: { color: "#f0f7f0" },
        min: yMin,
        max: yMax,
        ticks: {
          color: "#aaa",
          font: { size: 11 },
          stepSize: 1000,
          callback: v => (v / 1000) + "k kWh",
        },
      },
    },
  };

  // Use flag returned by the API — reliable regardless of what cities are supported
  const usingFallback = results.using_fallback_ghi === true;

  const handleDownload = async () => {
    const res = await fetch(`${API}/api/report/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData?.name || "User",
        address: formData?.address || "",
        city: formData?.city || results.city,
        capacity_kw: results.capacity_kw,
        annual_kwh: results.annual_generation_kwh,
        annual_savings_inr: results.annual_savings_inr,
        system_cost_inr: results.system_cost_inr,
        net_cost_inr: results.net_cost_inr,
        payback_years: results.payback_years,
        subsidy_inr: results.subsidy_inr,
        co2_offset_kg: results.co2_offset_kg_per_year,
        cost_breakdown: results.cost_breakdown,
        lifetime_savings_inr: results.lifetime_savings_inr,
        lifetime_years: results.lifetime_years,
        net_roi_pct: results.net_roi_pct,
        tariff_per_kwh: results.tariff_per_kwh,
        bill_coverage_pct: results.bill_coverage_pct,
        connection_type: results.connection_type,
      }),
    });
    const data = await res.json();
    if (data.download_url) window.open(`${API}${data.download_url}`, "_blank");
  };

  return (
    <div>
      <div className="dash-hero">
        <h2>Solar report ready</h2>
        <p>{formData?.name} · {rooftopData?.area} m² rooftop · {results.city}</p>
        <div className="dash-badge">
          <div className="dash-badge-dot" />
          Analysis complete
        </div>
      </div>

      <div className="dash-body">
        <div className="stats-grid">
          {STATS.map(({ key, label, fmt, accent }) => (
            <div className="stat-card" key={key} style={{ "--accent": accent }}>
              <div className="stat-val">{fmt(results[key])}</div>
              <div className="stat-lbl">{label}</div>
            </div>
          ))}
        </div>

        <div className="chart-box">
          <div className="box-label">Monthly generation forecast</div>
          {usingFallback && (
            <div style={{
              background: "#fffbe6", border: "1px solid #f5c842",
              borderRadius: 6, padding: "8px 12px", marginBottom: 10,
              fontSize: 12, color: "#7a5c00", display: "flex", alignItems: "center", gap: 6
            }}>
              ⚠️ No solar irradiance data available for <strong>{results.city}</strong>.
              Monthly forecast is estimated using regional averages and may be less accurate.
            </div>
          )}
          <Bar data={chartData} options={chartOptions} />
        </div>

        <div className="cost-box">
          <div className="box-label" style={{ marginBottom: 10 }}>Cost breakdown</div>

          {/* System component costs */}
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em" }}>
            SYSTEM COMPONENTS
          </div>
          {[
            ["Solar Panels (42%)",          results.cost_breakdown?.solar_panels_inr],
            ["Inverter (18%)",              results.cost_breakdown?.inverter_inr],
            ["Installation & Civil (15%)",  results.cost_breakdown?.installation_inr],
            ["BOS / Wiring / Mounting (15%)", results.cost_breakdown?.bos_wiring_inr],
            ["Misc & Contingency (10%)",    results.cost_breakdown?.misc_inr],
          ].map(([label, val]) => (
            <div className="cost-row" key={label} style={{ fontSize: 13 }}>
              <span style={{ color: "#555" }}>{label}</span>
              <span>₹{val?.toLocaleString()}</span>
            </div>
          ))}

          <div style={{ borderTop: "1.5px solid #d4e8d4", margin: "8px 0" }} />

          {/* Subsidy and net cost */}
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em" }}>
            SUBSIDY & NET COST
          </div>
          <div className="cost-row">
            <span>Total system cost</span>
            <span>₹{results.system_cost_inr?.toLocaleString()}</span>
          </div>
          <div className="cost-row green">
            <span>PM Surya Ghar subsidy</span>
            <span>− ₹{results.subsidy_inr?.toLocaleString()}</span>
          </div>
          <div className="cost-row total">
            <span>Net cost after subsidy</span>
            <span>₹{results.net_cost_inr?.toLocaleString()}</span>
          </div>

          <div style={{ borderTop: "1.5px solid #d4e8d4", margin: "8px 0" }} />

          {/* Financial returns */}
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em" }}>
            FINANCIAL RETURNS ({results.lifetime_years}-YEAR PROJECTION)
          </div>
          <div className="cost-row">
            <span>Tariff rate ({results.connection_type || "residential"})</span>
            <span>₹{results.tariff_per_kwh}/kWh</span>
          </div>
          <div className="cost-row">
            <span>Bill coverage by solar</span>
            <span style={{ color: "#1e6b2e", fontWeight: 600 }}>{results.bill_coverage_pct}%</span>
          </div>
          <div className="cost-row">
            <span>Annual electricity savings</span>
            <span>₹{results.annual_savings_inr?.toLocaleString()}</span>
          </div>
          <div className="cost-row">
            <span>Lifetime savings ({results.lifetime_years} yrs)</span>
            <span>₹{results.lifetime_savings_inr?.toLocaleString()}</span>
          </div>
          <div className="cost-row total">
            <span>Net ROI over {results.lifetime_years} years</span>
            <span style={{ color: "#1e6b2e" }}>+{results.net_roi_pct}%</span>
          </div>
        </div>

        <div className="dash-actions">
          <button className="btn-primary flex1" onClick={handleDownload}>
            Download PDF certificate
          </button>
          <button className="btn-secondary flex1" onClick={onReset}>
            New analysis
          </button>
        </div>
      </div>
    </div>
  );
}