"""Builds stage-level weather features for every district-year from Open-Meteo daily data.
Run from the project root:  python ml/src/feature_engineering/fetch_stage_weather.py

ASSUMPTION: sowing on 20 June every year (SOWING below). Real sowing dates vary with the monsoon,
so treat the stage windows as approximate and change SOWING if you know better.
District coordinates are approximate district headquarters.
"""
import time
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "processed" / "yield_with_weather.csv"
CACHE = ROOT / "data" / "external" / "open_meteo_daily"
OUT = ROOT / "data" / "processed" / "stage_weather.csv"

SOWING = (6, 20)
WINDOWS = {"sow": (0, 9), "veg": (10, 39), "flower": (40, 54), "pod": (55, 89), "harvest": (90, 109)}  # days after sowing

COORDS = {
    "Mumbai": (19.08, 72.88), "Mumbai City": (18.97, 72.83), "Mumbai Suburban": (19.08, 72.88), "Thane": (19.22, 72.98),
    "Palghar": (19.70, 72.77), "Raigad": (18.52, 73.18), "Ratnagiri": (16.99, 73.30), "Sindhudurg": (16.35, 73.68),
    "Pune": (18.52, 73.86), "Satara": (17.69, 74.00), "Sangli": (16.85, 74.57), "Kolhapur": (16.70, 74.24), "Solapur": (17.66, 75.91),
    "Nashik": (20.00, 73.79), "Dhule": (20.90, 74.78), "Nandurbar": (21.37, 74.24), "Jalgaon": (21.00, 75.57), "Ahmednagar": (19.09, 74.74),
    "Aurangabad": (19.88, 75.34), "Jalna": (19.84, 75.88), "Beed": (18.99, 75.76), "Latur": (18.40, 76.56), "Osmanabad": (18.19, 76.04),
    "Nanded": (19.16, 77.32), "Parbhani": (19.27, 76.77), "Hingoli": (19.72, 77.15),
    "Buldhana": (20.53, 76.18), "Akola": (20.71, 77.00), "Washim": (20.11, 77.13), "Amravati": (20.93, 77.75), "Yavatmal": (20.39, 78.12),
    "Wardha": (20.74, 78.60), "Nagpur": (21.15, 79.09), "Bhandara": (21.17, 79.65), "Gondia": (21.46, 80.19),
    "Chandrapur": (19.96, 79.30), "Gadchiroli": (20.18, 80.00),
}


def fetch(name, lat, lon, y0, y1):
    f = CACHE / f"{name.replace(' ', '_')}_{y0}_{y1}.csv"
    if f.exists():
        return pd.read_csv(f, parse_dates=["date"])
    end = min(date(y1, 11, 30), date.today() - timedelta(days=6))
    params = {"latitude": lat, "longitude": lon, "start_date": f"{y0}-06-01", "end_date": end.isoformat(),
              "daily": "precipitation_sum,temperature_2m_max", "timezone": "Asia/Kolkata"}
    for attempt in range(4):
        r = requests.get("https://archive-api.open-meteo.com/v1/archive", params=params, timeout=90)
        if r.status_code == 200:
            break
        time.sleep(5 * (attempt + 1))
    else:
        raise RuntimeError(f"Open-Meteo failed for {name}: {r.status_code} {r.text[:200]}")
    d = r.json()["daily"]
    df = pd.DataFrame({"date": pd.to_datetime(d["time"]), "rain": d["precipitation_sum"], "tmax": d["temperature_2m_max"]})
    CACHE.mkdir(parents=True, exist_ok=True)
    df.to_csv(f, index=False)
    time.sleep(1)
    return df


def window(df, start, a, b):
    s = df[(df.date >= start + pd.Timedelta(days=a)) & (df.date <= start + pd.Timedelta(days=b))]
    return s if len(s) == b - a + 1 else None  # skip incomplete windows


def main():
    src = pd.read_csv(DATA)
    ycol = next((c for c in ("year", "Year", "crop_year", "Crop_Year") if c in src.columns), None)
    if ycol is None or "district_name" not in src.columns:
        raise SystemExit(f"Need 'district_name' and a year column. Your columns: {list(src.columns)}")
    src[ycol] = pd.to_numeric(src[ycol].astype(str).str.extract(r"(\d{4})")[0], errors="coerce")
    src = src.dropna(subset=[ycol])
    src["district_name"] = src["district_name"].astype(str).str.strip().str.title()
    rows = []
    for dist, g in src.groupby("district_name"):
        if dist not in COORDS:
            print("No coordinates for", dist, "- skipped")
            continue
        years = sorted(g[ycol].astype(int).unique())
        daily = fetch(dist, *COORDS[dist], years[0], years[-1])
        for y in years:
            start = pd.Timestamp(y, *SOWING)
            w = {k: window(daily, start, *ab) for k, ab in WINDOWS.items()}
            if any(v is None for v in w.values()):
                continue
            rows.append({
                "district_name": dist, "year": y,
                "sow_rain_mm": w["sow"].rain.sum(), "veg_rain_mm": w["veg"].rain.sum(),
                "flower_rain_mm": w["flower"].rain.sum(), "flower_hot_days": int((w["flower"].tmax >= 35).sum()),
                "pod_rain_mm": w["pod"].rain.sum(), "pod_dry_days": int((w["pod"].rain < 2).sum()),
                "harvest_rain_mm": w["harvest"].rain.sum(),
            })
        print("done", dist)
    pd.DataFrame(rows).round(2).to_csv(OUT, index=False)
    print("Saved", OUT, len(rows), "district-years")


if __name__ == "__main__":
    main()