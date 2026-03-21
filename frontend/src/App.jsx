import { useState } from "react";
import MapSketch from "./components/MapSketch";
import InputForm from "./components/InputForm";
import Dashboard from "./components/Dashboard";
import "./App.css";

export default function App() {
  const [step, setStep] = useState(1);
  const [rooftopData, setRooftopData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleMapDone = (data) => { setRooftopData(data); setStep(2); };

  const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const handleFormSubmit = async (data) => {
    setFormData(data);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: rooftopData.lat,
          longitude: rooftopData.lng,
          rooftop_area_sqm: rooftopData.area,
          monthly_bill_inr: data.monthlyBill,
          city: data.city,
          connection_type: data.connectionType,
        }),
      });
      const result = await res.json();
      setResults(result);
      setStep(3);
    } catch (err) {
      alert("API error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1); setRooftopData(null); setFormData(null); setResults(null);
  };

  const STEPS = ["Pin location", "Your details", "Solar report"];

  return (
    <div>
      <header className="app-header">
        <div className="header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="36" height="36" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
              <rect width="80" height="80" rx="16" fill="rgba(255,255,255,0.15)" />
              <polyline points="14,22 26,58 40,34 54,58 66,22"
                fill="none" stroke="#f5a623" strokeWidth="7"
                strokeLinecap="round" strokeLinejoin="round" />
              <path d="M26,22 A20,20 0 0,1 54,22"
                fill="none" stroke="#a5d6a7" strokeWidth="4" strokeLinecap="round" />
              <circle cx="40" cy="14" r="6" fill="#f5a623" />
            </svg>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.3px" }}>
                <span style={{ color: "#fff" }}>Green</span>
                <span style={{ color: "#a5d6a7" }}>Lens</span>
              </div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.6)", letterSpacing: "1px" }}>
                SOLAR INTELLIGENCE
              </div>
            </div>
          </div>
          <div className="step-indicator">
            {STEPS.map((label, i) => (
              <div key={i} className={`step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
                <span className="step-num">{step > i + 1 ? "✓" : i + 1}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="card">
          {step === 1 && <MapSketch onDone={handleMapDone} />}
          {step === 2 && <InputForm rooftopData={rooftopData} onSubmit={handleFormSubmit} loading={loading} />}
          {step === 3 && results && (
            <Dashboard results={results} formData={formData} rooftopData={rooftopData} onReset={handleReset} />
          )}
        </div>
      </main>
    </div>
  );
}