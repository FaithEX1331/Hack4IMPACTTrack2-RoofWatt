import { useState } from "react";
import MapSketch from "./components/MapSketch";
import InputForm from "./components/InputForm";
import Dashboard from "./components/Dashboard";
import "./App.css";
import logo from "./assets/logo.svg";

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
          <img src={logo} alt="GreenLens" height="28" />
          <span className="tagline">Hyperlocal solar intelligence</span>
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
