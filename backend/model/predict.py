"""
GreenLens Prediction Helper
Wraps trained XGBoost model with a clean predict_ghi() interface.
Falls back to lookup table if model not available.
"""

FALLBACK_GHI = {
    1: 5.2, 2: 5.8, 3: 6.1, 4: 6.3,  5: 5.9, 6: 4.2,
    7: 3.8, 8: 4.0, 9: 4.5, 10: 5.1, 11: 5.3, 12: 5.0
}

_model = None

def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        import xgboost as xgb
        m = xgb.Booster()
        m.load_model("model/ghi_model.json")
        _model = m
        return _model
    except Exception:
        return None

def predict_ghi(lat: float, lon: float, month: int) -> float:
    """Predict GHI (kWh/m2/day) for given lat, lon, month (1-12)."""
    model = _load_model()
    if model is not None:
        try:
            import xgboost as xgb
            import numpy as np
            dm = xgb.DMatrix(np.array([[lat, lon, month]]))
            return float(model.predict(dm)[0])
        except Exception:
            pass
    return FALLBACK_GHI.get(month, 5.0)
