from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import json
import os
import numpy as np
from functools import lru_cache

router = APIRouter()

# ── Constants aligned with frontend Dashboard display ──────────────────────
PANEL_EFFICIENCY    = 0.18
PERFORMANCE_RATIO   = 0.80
DUST_LOSS           = 0.05
USABLE_AREA_RATIO   = 0.75   # matches InputForm: "~{area * 0.75} m² usable"
DAYS_PER_MONTH      = 30
TARIFF_PER_KWH      = 6.5    # INR
COST_PER_KW         = 60_000 # INR per kW installed (industry avg India 2024)

FALLBACK_GHI = {
    "01": 5.2, "02": 5.8, "03": 6.1, "04": 6.3,
    "05": 5.9, "06": 4.2, "07": 3.8, "08": 4.0,
    "09": 4.5, "10": 5.1, "11": 5.3, "12": 5.0,
}

# Subsidy tiers per PM Surya Ghar scheme (capacity in kW)
SUBSIDY_TIERS = [
    (2.0, 30_000),
    (3.0, 60_000),
    (float("inf"), 78_000),
]


class PredictRequest(BaseModel):
    latitude: float
    longitude: float
    rooftop_area_sqm: float = Field(..., gt=0)
    monthly_bill_inr: float = Field(..., gt=0)
    city: str = "bhubaneswar"


@lru_cache(maxsize=20)
def _load_irradiance(city: str) -> dict:
    """Load and cache monthly-average GHI for a city (keyed "MM")."""
    data_path = f"data/irradiance/{city}.json"
    if not os.path.exists(data_path):
        data_path = "data/irradiance/bhubaneswar.json"

    with open(data_path) as f:
        raw = json.load(f)

    monthly_ghi_raw = raw["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]
    buckets: dict[str, list] = {}
    for key, val in monthly_ghi_raw.items():
        month = key[4:]          # "YYYYMM" → "MM"
        buckets.setdefault(month, []).append(val)

    return {m: float(np.mean(v)) for m, v in buckets.items()}


def _get_avg_ghi(city: str) -> dict:
    try:
        return _load_irradiance(city.lower())
    except Exception:
        return FALLBACK_GHI


def _subsidy(capacity_kw: float) -> int:
    for threshold, amount in SUBSIDY_TIERS:
        if capacity_kw <= threshold:
            return amount
    return SUBSIDY_TIERS[-1][1]


@router.post("/predict")
def predict_solar(req: PredictRequest):
    """Predict solar yield for a given rooftop using cached NASA POWER data."""
    avg_ghi = _get_avg_ghi(req.city)

    effective_area = req.rooftop_area_sqm * USABLE_AREA_RATIO
    efficiency_factor = PANEL_EFFICIENCY * PERFORMANCE_RATIO * (1 - DUST_LOSS)

    monthly_generation: dict[str, float] = {}
    for month, ghi in avg_ghi.items():
        kwh = ghi * effective_area * efficiency_factor * DAYS_PER_MONTH
        monthly_generation[month] = round(kwh, 1)

    annual_kwh      = sum(monthly_generation.values())
    annual_savings  = round(annual_kwh * TARIFF_PER_KWH, 0)
    capacity_kw     = round(effective_area * PANEL_EFFICIENCY, 2)
    system_cost     = round(capacity_kw * COST_PER_KW, 0)
    subsidy         = _subsidy(capacity_kw)
    net_cost        = system_cost - subsidy
    payback_years   = round(net_cost / annual_savings, 1) if annual_savings > 0 else 0

    # Detailed cost breakdown (industry-standard India ratios)
    panel_cost    = round(system_cost * 0.42)
    inverter_cost = round(system_cost * 0.18)
    installation  = round(system_cost * 0.15)
    bos_cost      = round(system_cost * 0.15)
    misc_cost     = int(system_cost) - panel_cost - inverter_cost - installation - bos_cost

    lifetime_years   = 25
    lifetime_savings = round(annual_savings * lifetime_years, 0)
    net_roi_pct      = round((lifetime_savings - net_cost) / net_cost * 100, 1) if net_cost > 0 else 0

    return {
        "monthly_generation_kwh":  monthly_generation,
        "annual_generation_kwh":   round(annual_kwh, 1),
        "capacity_kw":             capacity_kw,
        "annual_savings_inr":      annual_savings,
        "system_cost_inr":         system_cost,
        "subsidy_inr":             subsidy,
        "net_cost_inr":            net_cost,
        "payback_years":           payback_years,
        "co2_offset_kg_per_year":  round(annual_kwh * 0.82, 1),
        "city":                    req.city,
        "cost_breakdown": {
            "solar_panels_inr": panel_cost,
            "inverter_inr":     inverter_cost,
            "installation_inr": installation,
            "bos_wiring_inr":   bos_cost,
            "misc_inr":         misc_cost,
        },
        "lifetime_savings_inr": lifetime_savings,
        "lifetime_years":       lifetime_years,
        "net_roi_pct":          net_roi_pct,
    }