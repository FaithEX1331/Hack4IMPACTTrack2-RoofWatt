import { useState } from "react";

const CITIES = [
  "Bhubaneswar", "Cuttack", "Delhi", "Mumbai",
  "Chennai", "Bangalore", "Kolkata", "Jaipur",
  "Hyderabad", "Lucknow", "Patna"
];

export default function InputForm({ rooftopData, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: "", address: "", city: "Bhubaneswar",
    monthlyBill: "", connectionType: "residential",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.monthlyBill) return alert("Please fill all required fields.");
    onSubmit(form);
  };

  return (
    <div className="form-body">
      <p className="section-tag">Step 2 of 3</p>
      <h2 className="section-title">Your details</h2>

      <div className="info-chip">
        <div className="info-chip-dot" />
        Rooftop captured — <strong>{rooftopData?.area} m²</strong>
        &nbsp;(~{Math.round((rooftopData?.area || 0) * 0.75)} m² usable)
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="form-group">
          <label>Full name *</label>
          <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Ramesh Kumar" required />
        </div>

        <div className="form-group">
          <label>Property address</label>
          <input type="text" value={form.address} onChange={e => set("address", e.target.value)}
            placeholder="e.g. Plot 42, Unit 5, Bhubaneswar" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>City *</label>
            <select value={form.city} onChange={e => set("city", e.target.value)}>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Connection type</label>
            <select value={form.connectionType} onChange={e => set("connectionType", e.target.value)}>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Monthly electricity bill (₹) *</label>
          <input type="number" value={form.monthlyBill} onChange={e => set("monthlyBill", e.target.value)}
            placeholder="e.g. 3000" min="100" required />
        </div>

        <button type="submit" className="btn-primary full" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? "Analysing your rooftop…" : "Generate solar report"}
        </button>
      </form>
    </div>
  );
}
