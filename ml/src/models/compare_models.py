"""Compares many algorithms on the same features with an expanding-window (by year) cross-validation
and a final chronological hold-out. Uses the v2 feature set: no 'area', plus stage weather if available.
Run from the project root:  python ml/src/models/compare_models.py
"""
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (AdaBoostRegressor, ExtraTreesRegressor, GradientBoostingRegressor,
                              HistGradientBoostingRegressor, RandomForestRegressor)
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeRegressor

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "processed" / "yield_with_weather.csv"
STAGE = ROOT / "data" / "processed" / "stage_weather.csv"
OUT = ROOT / "saved_models" / "model_comparison.json"

CAT = ["district_name"]  # soil_type is added below only if the CSV has it
SEASON = ["total_rainfall_mm", "avg_max_temp_c", "avg_min_temp_c", "heat_stress_days"]
STAGE_F = ["sow_rain_mm", "veg_rain_mm", "flower_rain_mm", "flower_hot_days", "pod_rain_mm", "pod_dry_days", "harvest_rain_mm"]
TARGET = "yield_tha"

df = pd.read_csv(DATA)
if "soil_type" in df.columns:
    CAT.append("soil_type")
ycol = next((c for c in ("year", "Year", "crop_year", "Crop_Year") if c in df.columns), None)
missing = [c for c in CAT + SEASON + [TARGET] if c not in df.columns]
if ycol is None or missing:
    raise SystemExit(f"Need a year column and {missing}. Your CSV has: {list(df.columns)}")
df = df.rename(columns={ycol: "year"})
df["year"] = pd.to_numeric(df["year"].astype(str).str.extract(r"(\d{4})")[0], errors="coerce")
df = df.dropna(subset=["year"])
df["year"] = df["year"].astype(int)
for c in CAT:
    df[c] = df[c].astype(str).str.strip().str.title()
use_stage = False
if STAGE.exists():
    st = pd.read_csv(STAGE)
    st["district_name"] = st["district_name"].astype(str).str.strip().str.title()
    merged = df.merge(st, on=["district_name", "year"], how="inner")
    if len(merged) >= 0.5 * len(df):
        df, use_stage = merged, True
FEATURES = CAT + SEASON + (STAGE_F if use_stage else [])
NUM = [f for f in FEATURES if f not in CAT]
df = df.dropna(subset=FEATURES + [TARGET]).sort_values("year").reset_index(drop=True)

years = sorted(df.year.unique())
k = max(1, round(len(years) * 0.8))
train, test = df[df.year.isin(years[:k])], df[df.year.isin(years[k:])]
blocks = [b for b in np.array_split(sorted(train.year.unique()), 5) if len(b)]
fold_idx = [(train[train.year.isin(np.concatenate(blocks[:j]))], train[train.year.isin(blocks[j])]) for j in range(1, len(blocks))]


def wrap(model, scale=False):
    pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CAT), ("num", StandardScaler() if scale else "passthrough", NUM)])
    return Pipeline([("pre", pre), ("model", model)])


candidates = {
    "CatBoost": lambda: CatBoostRegressor(verbose=0, random_seed=42, cat_features=CAT),
    "Random Forest": lambda: wrap(RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)),
    "Extra Trees": lambda: wrap(ExtraTreesRegressor(n_estimators=300, random_state=42, n_jobs=-1)),
    "Gradient Boosting": lambda: wrap(GradientBoostingRegressor(random_state=42)),
    "Hist Gradient Boosting": lambda: wrap(HistGradientBoostingRegressor(random_state=42)),
    "AdaBoost": lambda: wrap(AdaBoostRegressor(random_state=42)),
    "Decision Tree": lambda: wrap(DecisionTreeRegressor(max_depth=8, random_state=42)),
    "KNN": lambda: wrap(KNeighborsRegressor(n_neighbors=7), scale=True),
    "Ridge": lambda: wrap(Ridge(alpha=1.0), scale=True),
    "Linear Regression": lambda: wrap(LinearRegression(), scale=True),
}
try:
    from xgboost import XGBRegressor
    candidates["XGBoost"] = lambda: wrap(XGBRegressor(n_estimators=300, learning_rate=0.05, random_state=42))
except ImportError:
    print("xgboost not installed, skipping")
try:
    from lightgbm import LGBMRegressor
    candidates["LightGBM"] = lambda: wrap(LGBMRegressor(n_estimators=300, learning_rate=0.05, random_state=42, verbose=-1))
except ImportError:
    print("lightgbm not installed, skipping")

results, step = [], max(1, len(test) // 80)
for name, make in candidates.items():  # make() builds a fresh model each time (sklearn clone cannot copy CatBoost with cat_features)
    cv_r2, cv_rmse = [], []
    for tr, te in fold_idx:
        m = make().fit(tr[FEATURES], tr[TARGET])
        p = m.predict(te[FEATURES])
        cv_r2.append(r2_score(te[TARGET], p)); cv_rmse.append(float(np.sqrt(mean_squared_error(te[TARGET], p))))
    t0 = time.time()
    model = make()
    model.fit(train[FEATURES], train[TARGET])
    secs = time.time() - t0
    pred = np.asarray(model.predict(test[FEATURES]))
    y = test[TARGET]
    results.append({
        "name": name, "r2": float(r2_score(y, pred)), "rmse": float(np.sqrt(mean_squared_error(y, pred))), "mae": float(mean_absolute_error(y, pred)),
        "cv_r2": float(np.mean(cv_r2)) if cv_r2 else None, "cv_rmse": float(np.mean(cv_rmse)) if cv_rmse else None,
        "train_seconds": secs,
        "actual": [round(float(v), 3) for v in y.values[::step]], "predicted": [round(float(v), 3) for v in pred[::step]],
    })
    print(f"{name:24s} test R2={results[-1]['r2']:.3f}  CV R2={results[-1]['cv_r2']}")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"train_rows": len(train), "test_rows": len(test), "features": FEATURES, "cv_folds": len(fold_idx),
                           "train_years": [int(years[0]), int(years[k - 1])], "models": results}, indent=2))
print("Saved", OUT, "| features:", FEATURES)