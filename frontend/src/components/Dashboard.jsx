import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

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

  const chartData = {
    labels: MONTHS,
    datasets: [{
      data: monthlyData,
      backgroundColor: monthlyData.map((_, i) =>
        i >= 2 && i <= 5 ? "#1e6b2e" : "#b6d9b6"
      ),
      borderRadius: 2,
      borderSkipped: false,
    }],
  };

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
        callbacks: { label: ctx => ` ${ctx.raw} kWh` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#aaa", font: { size: 11 } } },
      y: { grid: { color: "#f0f7f0" }, ticks: { color: "#aaa", font: { size: 11 }, callback: v => v + " kWh" }, beginAtZero: true },
    },
  };

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
        net_cost_inr: results.net_cost_inr,
        payback_years: results.payback_years,
        subsidy_inr: results.subsidy_inr,
        co2_offset_kg: results.co2_offset_kg_per_year,
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
          <Bar data={chartData} options={chartOptions} />
        </div>

        <div className="cost-box">
          <div className="box-label" style={{ marginBottom: 6 }}>Cost breakdown</div>
          <div className="cost-row">
            <span>Total system cost</span>
            <span>₹{(results.net_cost_inr + results.subsidy_inr)?.toLocaleString()}</span>
          </div>
          <div className="cost-row green">
            <span>PM Surya Ghar subsidy</span>
            <span>− ₹{results.subsidy_inr?.toLocaleString()}</span>
          </div>
          <div className="cost-row total">
            <span>Net cost after subsidy</span>
            <span>₹{results.net_cost_inr?.toLocaleString()}</span>
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
