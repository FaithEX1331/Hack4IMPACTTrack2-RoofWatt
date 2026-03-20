"""
GreenLens ML Model — Training Script
Trains XGBoost on NASA POWER irradiance data.
Run BEFORE the hackathon: python model/train.py

Output: model/ghi_model.json
"""
import json, os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

DATA_DIR = "../data/irradiance"

CITY_COORDS = {
    "bhubaneswar": (20.29, 85.82), "delhi": (28.61, 77.20),
    "mumbai": (19.07, 72.87),      "chennai": (13.08, 80.27),
    "bangalore": (12.97, 77.59),   "kolkata": (22.57, 88.36),
    "jaipur": (26.91, 75.78),      "hyderabad": (17.38, 78.48),
    "lucknow": (26.84, 80.94),     "patna": (25.59, 85.13),
}

def load_data():
    records = []
    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"):
            continue
        city = fname.replace(".json", "")
        lat, lon = CITY_COORDS.get(city, (20.0, 85.0))
        with open(os.path.join(DATA_DIR, fname)) as f:
            data = json.load(f)
        try:
            ghi_data = data["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]
            for key, ghi in ghi_data.items():
                records.append({
                    "lat": lat, "lon": lon,
                    "month": int(key[4:]),
                    "ghi": ghi
                })
        except KeyError:
            continue
    return pd.DataFrame(records)

def train():
    print("Loading data...")
    df = load_data()
    if df.empty:
        print("ERROR: No data found. Run download_data.py first.")
        return

    print(f"  {len(df)} records loaded.")
    X = df[["lat", "lon", "month"]]
    y = df["ghi"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    try:
        import xgboost as xgb
        model = xgb.XGBRegressor(n_estimators=200, max_depth=5, learning_rate=0.1, random_state=42)
        model.fit(X_train, y_train)
        mae = mean_absolute_error(y_test, model.predict(X_test))
        print(f"  Model MAE: {mae:.3f} kWh/m2/day")
        os.makedirs("model", exist_ok=True)
        model.save_model("model/ghi_model.json")
        print("  Model saved to model/ghi_model.json")
    except ImportError:
        print("  xgboost not installed. Run: pip install xgboost")

if __name__ == "__main__":
    train()
