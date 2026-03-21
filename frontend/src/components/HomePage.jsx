import { useEffect, useRef } from "react";
import "./HomePage.css";

const STEPS_DATA = [
  {
    num: "01",
    title: "Pin your location",
    desc: "Sketch your rooftop boundary on a live satellite map. GreenLens captures GPS coordinates and calculates usable area automatically.",
    tag: "Map sketch tool",
  },
  {
    num: "02",
    title: "Enter your details",
    desc: "Your city, connection type (residential or commercial), and monthly electricity bill. Takes under 60 seconds.",
    tag: "Smart intake form",
  },
  {
    num: "03",
    title: "Get your solar report",
    desc: "Precise yield forecast, ROI breakdown, PM Surya Ghar subsidy calculation, local installer matches, and a downloadable PDF certificate.",
    tag: "Bankable PDF output",
  },
];

const METRICS = [
  { val: "25yr",   label: "Lifetime financial\nprojection included" },
  { val: "₹78k",  label: "Max PM Surya Ghar\nsubsidy auto-calculated" },
  { val: "11",     label: "Indian cities with\nreal NASA irradiance data" },
  { val: "0.716",  label: "kg CO₂/kWh India CEA\n2023 emission factor used" },
];

const FEATURES = [
  {
    title: "Hyperlocal irradiance modelling",
    desc: "Uses real NASA POWER satellite data for your exact GPS coordinates — not just a state average. Bhubaneswar and Cuttack get different forecasts.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    title: "Accurate savings with real tariffs",
    desc: "Residential (₹6.5/kWh) and commercial (₹9.0/kWh) rates applied separately. Bill coverage percentage calculated against your actual monthly spend.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    title: "Government subsidy calculator",
    desc: "PM Surya Ghar subsidy tiers (₹30k / ₹60k / ₹78k) auto-applied based on your calculated system capacity. No manual lookup required.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    title: "MNRE-verified local installers",
    desc: "Matched by city, rated by experience. Every installer in our database carries MNRE certification — no inflated estimates, no surprises.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

const CITIES = [
  "Bhubaneswar","Cuttack","Delhi","Mumbai","Chennai",
  "Bangalore","Kolkata","Jaipur","Hyderabad","Lucknow","Patna",
];

const TRUST = [
  {
    title: "Bankable PDF certificate",
    desc: "Every report generates a signed PDF that banks and NBFCs can use for loan assessment — eliminating the #1 blocker to solar financing in India.",
    footer: "↳ Accepted for PM Surya Ghar loan applications",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e6b2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    title: "Verified installer network",
    desc: "All installers are MNRE-certified and rated by actual customers. Inflated ROI estimates from unverified vendors are a key trust problem we eliminate.",
    footer: "↳ MNRE certification badge on every listing",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e6b2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: "No region-wide guessing",
    desc: "Generic calculators give the same answer to everyone in a state. GreenLens uses your exact GPS location — dust levels, shading, and local tariffs matter.",
    footer: "↳ NASA POWER data at your GPS coordinates",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e6b2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
];

// Chart bar heights (representative monthly generation)
const BAR_HEIGHTS = [62, 70, 78, 82, 74, 52, 46, 50, 58, 68, 72, 64];
const TOP_3 = new Set(
  [...BAR_HEIGHTS].map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v).slice(0,3).map(x=>x.i)
);

export default function HomePage({ onStart }) {
  const heroRef = useRef(null);

  // Intersection Observer for fade-up animations on scroll
  useEffect(() => {
    const els = document.querySelectorAll(".hp-reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("hp-visible"); }),
      { threshold: 0.12 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="hp-root">

      {/* ── HERO ── */}
      <section className="hp-hero" ref={heroRef}>
        <div className="hp-hero-bg" />
        <div className="hp-hero-sun" />

        <span className="hp-badge hp-fade-up">
          <span className="hp-badge-dot" />
          Built for Hack4IMPACT · PM Surya Ghar ready
        </span>

        <h1 className="hp-h1 hp-fade-up hp-d1">
          Know <em>exactly</em> what your<br />
          rooftop can generate.
        </h1>

        <p className="hp-sub hp-fade-up hp-d2">
          GreenLens gives every Indian homeowner, lender, and installer a
          precise, site-specific solar yield estimate — backed by NASA
          satellite data and real DISCOM tariffs.
        </p>

        <div className="hp-hero-actions hp-fade-up hp-d3">
          <button className="hp-btn-primary" onClick={onStart}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            Analyse my rooftop
          </button>
          <a href="#hp-how" className="hp-btn-ghost">
            See how it works
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7v10"/>
            </svg>
          </a>
        </div>

        <div className="hp-proof hp-fade-up hp-d4">
          {["NASA POWER satellite data","MNRE-verified installers","Bankable PDF certificate","11 cities across India"].map((item, i) => (
            <span key={i} className="hp-proof-item">
              <span className="hp-proof-icon">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1e6b2e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
              {item}
              {i < 3 && <span className="hp-proof-divider" />}
            </span>
          ))}
        </div>
      </section>

      {/* ── PROBLEM STRIP ── */}
      <div className="hp-strip">
        <p>
          India has <strong>massive rooftop solar potential</strong> — but 80% of it goes
          untapped. Not because people don't want solar, but because no one
          can tell them what their <strong>specific</strong> rooftop will actually produce.
        </p>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="hp-how" className="hp-section">
        <span className="hp-label hp-reveal">The process</span>
        <h2 className="hp-h2 hp-reveal">From rooftop sketch to <em>bankable report</em> in 3 steps</h2>
        <div className="hp-steps">
          {STEPS_DATA.map((s) => (
            <div className="hp-step-card hp-reveal" key={s.num}>
              <div className="hp-step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="hp-step-tag">↳ {s.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── METRICS ── */}
      <div className="hp-metrics">
        <div className="hp-metrics-inner">
          {METRICS.map((m) => (
            <div className="hp-metric-cell hp-reveal" key={m.val}>
              <div className="hp-metric-val">{m.val}</div>
              <p className="hp-metric-lbl">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES + PREVIEW ── */}
      <section className="hp-section hp-features-section">
        <span className="hp-label hp-reveal">What's inside</span>
        <h2 className="hp-h2 hp-reveal">Every answer a homeowner <em>actually</em> needs</h2>
        <div className="hp-features-grid">
          <div className="hp-features-list">
            {FEATURES.map((f) => (
              <div className="hp-feature-item hp-reveal" key={f.title}>
                <div className="hp-feature-icon">{f.icon}</div>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mock report preview */}
          <div className="hp-preview-card hp-reveal">
            <div className="hp-preview-header">
              <span className="hp-dot" style={{background:"#FF5F57"}} />
              <span className="hp-dot" style={{background:"#FEBC2E"}} />
              <span className="hp-dot" style={{background:"#28C840"}} />
              <span className="hp-preview-title">Solar report · Bhubaneswar</span>
            </div>
            <div className="hp-preview-body">
              <p className="hp-preview-meta">Analysis complete — 72 m² rooftop</p>
              <div className="hp-preview-stats">
                {[["4.86 kW","Capacity"],["₹38,940","Savings / yr"],["4.7 yrs","Payback"]].map(([v,l]) => (
                  <div className="hp-preview-stat" key={l}>
                    <div className="hp-preview-val">{v}</div>
                    <div className="hp-preview-lbl">{l}</div>
                  </div>
                ))}
              </div>
              <p className="hp-preview-section-label">Monthly generation forecast</p>
              <div className="hp-preview-chart">
                {BAR_HEIGHTS.map((h, i) => (
                  <div key={i} className={`hp-bar${TOP_3.has(i) ? " hp-bar-top" : ""}`} style={{height: h + "px"}} />
                ))}
              </div>
              <p className="hp-preview-months">Jan · Feb · Mar · Apr · May · Jun · Jul · Aug · Sep · Oct · Nov · Dec</p>
              <div className="hp-preview-subsidy">
                <div>
                  <p className="hp-preview-lbl">PM Surya Ghar subsidy</p>
                  <p className="hp-preview-subsidy-val">₹60,000 applied</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p className="hp-preview-lbl">Net system cost</p>
                  <p className="hp-preview-net">₹2,31,600</p>
                </div>
              </div>
              <div className="hp-preview-actions">
                <button className="hp-preview-btn" onClick={onStart}>Download PDF cert</button>
                <button className="hp-preview-btn hp-preview-btn-ghost" onClick={onStart}>New analysis</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CITIES ── */}
      <div id="hp-cities" className="hp-cities">
        <span className="hp-label hp-reveal" style={{textAlign:"center",display:"block"}}>Coverage</span>
        <h2 className="hp-h2 hp-reveal" style={{textAlign:"center"}}>11 cities. Real data. <em>Not regional averages.</em></h2>
        <div className="hp-cities-grid hp-reveal">
          {CITIES.map((c) => (
            <span className="hp-city-chip" key={c}>
              <span className="hp-city-dot" />{c}
            </span>
          ))}
        </div>
        <p className="hp-cities-note hp-reveal">
          Other cities use regional fallback GHI data with a clear accuracy warning in your report.
        </p>
      </div>

      {/* ── TRUST ── */}
      <section id="hp-subsidy" className="hp-section">
        <span className="hp-label hp-reveal">Why trust GreenLens</span>
        <h2 className="hp-h2 hp-reveal">Built for homeowners, <em>lenders</em> and installers alike</h2>
        <div className="hp-trust-grid">
          {TRUST.map((t) => (
            <div className="hp-trust-card hp-reveal" key={t.title}>
              <div className="hp-trust-top">
                <div className="hp-trust-icon">{t.icon}</div>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
              </div>
              <div className="hp-trust-footer">{t.footer}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="hp-cta">
        <div className="hp-cta-glow" />
        <h2 className="hp-cta-h2 hp-reveal">Your rooftop is ready.<br /><em>Is your report?</em></h2>
        <p className="hp-cta-sub hp-reveal">
          Get a precise, site-specific solar analysis in under 3 minutes. No signup required.
        </p>
        <button className="hp-btn-light hp-reveal" onClick={onStart}>
          Start free analysis →
        </button>
      </div>

    </div>
  );
}
