import requests, json, os, time

CITIES = {
    "bhubaneswar": (20.2961, 85.8245),
    "cuttack":     (20.4625, 85.8830),
    "delhi":       (28.6139, 77.2090),
    "mumbai":      (19.0760, 72.8777),
    "chennai":     (13.0827, 80.2707),
    "bangalore":   (12.9716, 77.5946),
    "kolkata":     (22.5726, 88.3639),
    "jaipur":      (26.9124, 75.7873),
    "hyderabad":   (17.3850, 78.4867),
    "lucknow":     (26.8467, 80.9462),
    "patna":       (25.5941, 85.1376),
}

os.makedirs("data/irradiance", exist_ok=True)

print("Downloading NASA POWER irradiance data...\n")
for city, (lat, lon) in CITIES.items():
    out = f"data/irradiance/{city}.json"
    if os.path.exists(out):
        print(f"  [skip] {city} — already exists")
        continue
    url = (
        f"https://power.larc.nasa.gov/api/temporal/monthly/point"
        f"?parameters=ALLSKY_SFC_SW_DWN&community=RE"
        f"&longitude={lon}&latitude={lat}&start=2000&end=2023&format=JSON"
    )
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        with open(out, "w") as f:
            json.dump(r.json(), f)
        print(f"  [ok]   {city}")
    except Exception as e:
        print(f"  [ERR]  {city}: {e}")
    time.sleep(1)

print("\nDone! All data saved in backend/data/irradiance/")
print("Next step: python model/train.py")