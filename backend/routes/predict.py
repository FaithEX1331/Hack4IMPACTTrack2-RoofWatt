from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import json
import os
import numpy as np
from functools import lru_cache

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────
PANEL_EFFICIENCY    = 0.18
PERFORMANCE_RATIO   = 0.80
DUST_LOSS           = 0.05
USABLE_AREA_RATIO   = 0.75   # matches InputForm: "~{area * 0.75} m² usable"

# FIX: Use actual days per month instead of flat 30 (was underestimating by 1.44%/yr)
DAYS_IN_MONTH = {
    "01": 31, "02": 28, "03": 31, "04": 30, "05": 31, "06": 30,
    "07": 31, "08": 31, "09": 30, "10": 31, "11": 30, "12": 31,
}

# FIX: Differentiate tariff by connection type (residential vs commercial)
TARIFF_BY_CONNECTION = {
    "residential": 6.5,
    "commercial":  9.0,
}
DEFAULT_TARIFF = 6.5

COST_PER_KW = 60_000  # INR per kW installed (industry avg India 2024)

# FIX: Updated CO2 factor to India CEA 2023 grid emission factor (was 0.82, overstated 14.5%)
CO2_FACTOR_KG_PER_KWH = 0.716

FALLBACK_GHI = {
    "01": 5.2, "02": 5.8, "03": 6.1, "04": 6.3,
    "05": 5.9, "06": 4.2, "07": 3.8, "08": 4.0,
    "09": 4.5, "10": 5.1, "11": 5.3, "12": 5.0,
}

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
    connection_type: str = "residential"   # FIX: now accepted and used


@lru_cache(maxsize=20)
def _load_irradiance(city: str) -> dict:
    """Load and cache monthly-average GHI for a city (keyed "MM").
    Raises FileNotFoundError if city data unavailable — caller decides fallback.
    """
    data_path = f"data/irradiance/{city}.json"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"No irradiance data for city: {city}")

    with open(data_path) as f:
        raw = json.load(f)

    monthly_ghi_raw = raw["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]
    buckets: dict[str, list] = {}
    for key, val in monthly_ghi_raw.items():
        month = key[4:]
        buckets.setdefault(month, []).append(val)

    return {m: float(np.mean(v)) for m, v in buckets.items()}


def _get_avg_ghi(city: str) -> tuple[dict, bool]:
    """Returns (ghi_dict, using_fallback).
    FIX: No longer silently substitutes bhubaneswar data for unknown cities.
    """
    try:
        return _load_irradiance(city.lower()), False
    except Exception:
        return FALLBACK_GHI, True


def _subsidy(capacity_kw: float) -> int:
    for threshold, amount in SUBSIDY_TIERS:
        if capacity_kw <= threshold:
            return amount
    return SUBSIDY_TIERS[-1][1]


@router.post("/predict")
def predict_solar(req: PredictRequest):
    """Predict solar yield for a given rooftop using NASA POWER irradiance data."""
    avg_ghi, using_fallback = _get_avg_ghi(req.city)

    effective_area    = req.rooftop_area_sqm * USABLE_AREA_RATIO
    efficiency_factor = PANEL_EFFICIENCY * PERFORMANCE_RATIO * (1 - DUST_LOSS)

    # FIX: Use actual days per month for accurate annual generation
    monthly_generation: dict[str, float] = {}
    for month, ghi in avg_ghi.items():
        days = DAYS_IN_MONTH.get(month, 30)
        kwh  = ghi * effective_area * efficiency_factor * days
        monthly_generation[month] = round(kwh, 1)

    annual_kwh  = sum(monthly_generation.values())
    capacity_kw = round(effective_area * PANEL_EFFICIENCY, 2)
    system_cost = round(capacity_kw * COST_PER_KW, 0)
    subsidy     = _subsidy(capacity_kw)
    net_cost    = system_cost - subsidy

    # FIX: Connection-type-aware tariff
    tariff         = TARIFF_BY_CONNECTION.get(req.connection_type.lower(), DEFAULT_TARIFF)
    annual_savings = round(annual_kwh * tariff, 0)
    payback_years  = round(net_cost / annual_savings, 1) if annual_savings > 0 else 0

    # Cost breakdown
    panel_cost    = round(system_cost * 0.42)
    inverter_cost = round(system_cost * 0.18)
    installation  = round(system_cost * 0.15)
    bos_cost      = round(system_cost * 0.15)
    misc_cost     = int(system_cost) - panel_cost - inverter_cost - installation - bos_cost

    lifetime_years   = 25
    lifetime_savings = round(annual_savings * lifetime_years, 0)
    net_roi_pct      = round((lifetime_savings - net_cost) / net_cost * 100, 1) if net_cost > 0 else 0

    # FIX: Correct CO2 factor (India CEA 2023: 0.716 kg/kWh, not 0.82)
    co2_offset = round(annual_kwh * CO2_FACTOR_KG_PER_KWH, 1)

    # FIX: monthly_bill_inr now used — compute how much of the bill solar covers
    monthly_bill_kwh  = req.monthly_bill_inr / tariff
    annual_bill_kwh   = monthly_bill_kwh * 12
    bill_coverage_pct = round(min(annual_kwh / annual_bill_kwh * 100, 100), 1) if annual_bill_kwh > 0 else 0

    return {
        "monthly_generation_kwh":  monthly_generation,
        "annual_generation_kwh":   round(annual_kwh, 1),
        "capacity_kw":             capacity_kw,
        "annual_savings_inr":      annual_savings,
        "tariff_per_kwh":          tariff,
        "connection_type":         req.connection_type,
        "bill_coverage_pct":       bill_coverage_pct,
        "system_cost_inr":         system_cost,
        "subsidy_inr":             subsidy,
        "net_cost_inr":            net_cost,
        "payback_years":           payback_years,
        "co2_offset_kg_per_year":  co2_offset,
        "city":                    req.city,
        "using_fallback_ghi":      using_fallback,
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