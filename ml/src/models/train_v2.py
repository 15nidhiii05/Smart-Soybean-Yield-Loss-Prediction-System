"""Version 2 training: no 'area' feature, optional stage-weather features, time-series CV with tuning,
80% prediction intervals from cross-validation residuals, history-based reference yields and honest diagnostics.
Run from the project root:  python ml/src/models/train_v2.py
Saves to ml/saved_models: catboost_v2.cbm, model_meta_v2.json
"""
import itertools
import json
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "processed" / "yield_with_weather.csv"
STAGE = ROOT / "data" / "processed" / "stage_weather.csv"
OUT = ROOT / "saved_models"

CAT = ["district_name"]  # soil_type is added below only if the CSV has it
SEASON = ["total_rainfall_mm", "avg_max_temp_c", "avg_min_temp_c", "heat_stress_days"]
STAGE_F = ["sow_rain_mm", "veg_rain_mm", "flower_rain_mm", "flower_hot_days", "pod_rain_mm", "pod_dry_days", "harvest_rain_mm"]
TARGET = "yield_tha"
GRID = {"depth": [4, 6, 8], "learning_rate": [0.03, 0.08], "l2_leaf_reg": [3, 9]}


def load():
    df = pd.read_csv(DATA)
    if "soil_type" in df.columns and "soil_type" not in CAT:
        CAT.append("soil_type")
    ycol = next((c for c in ("year", "Year", "crop_year", "Crop_Year") if c in df.columns), None)
    need = CAT + SEASON + [TARGET]
    missing = [c for c in need if c not in df.columns]
    if ycol is None or missing:
        raise SystemExit(f"Need a year column and {missing or 'all required columns'}. Your columns: {list(df.columns)}")
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
        else:
            print(f"Stage weather matched only {len(merged)}/{len(df)} rows, so it is NOT used.")
    return df.dropna(subset=need), use_stage


def fit(X, y, params, loss="RMSE"):
    m = CatBoostRegressor(loss_function=loss, iterations=600, verbose=0, random_seed=42, cat_features=CAT, **params)
    m.fit(X, y)
    return m


def metrics(y, p):
    return {"r2": float(r2_score(y, p)), "rmse": float(np.sqrt(mean_squared_error(y, p))), "mae": float(mean_absolute_error(y, p))}


def folds(tr):
    """Expanding window by year: train on earlier year blocks, test on the next block."""
    blocks = [b for b in np.array_split(sorted(tr.year.unique()), 5) if len(b)]
    for j in range(1, len(blocks)):
        yield tr[tr.year.isin(np.concatenate(blocks[:j]))], tr[tr.year.isin(blocks[j])]


def main():
    df, use_stage = load()
    feats = CAT + SEASON + (STAGE_F if use_stage else [])
    years = sorted(df.year.unique())
    k = max(1, round(len(years) * 0.8))
    train, test = df[df.year.isin(years[:k])], df[df.year.isin(years[k:])]
    print(f"{len(df)} rows, {len(years)} years. Train years {years[0]}-{years[k-1]}, test years {years[k]}-{years[-1]}")

    # 1) Is soil_type separate information, or just a label for the district?
    has_soil = "soil_type" in CAT
    single_share = float((df.groupby("district_name")["soil_type"].nunique() == 1).mean()) if has_soil else None

    # 6) Tuning with time-series CV
    best, best_rmse = None, 1e9
    for combo in itertools.product(*GRID.values()):
        params = dict(zip(GRID.keys(), combo))
        scores = [metrics(te[TARGET], fit(tr[feats], tr[TARGET], params).predict(te[feats]))["rmse"] for tr, te in folds(train)]
        if scores and np.mean(scores) < best_rmse:
            best, best_rmse = params, float(np.mean(scores))
        print(params, "CV RMSE", round(float(np.mean(scores)), 4) if scores else "n/a")
    best = best or {"depth": 6, "learning_rate": 0.05, "l2_leaf_reg": 3}

    # Honest test metrics from a train-only fit
    point = fit(train[feats], train[TARGET], best)
    test_metrics = metrics(test[TARGET], point.predict(test[feats]))

    # 2) Ablation: does 'area' help or just leak?
    ablation = None
    if "area" in df.columns:
        with_area = fit(train[feats + ["area"]], train[TARGET], best)
        ablation = {"with_area": metrics(test[TARGET], with_area.predict(test[feats + ["area"]])), "without_area": test_metrics}

    # 5) 80% interval from out-of-fold CV residuals (honest width with a small dataset), checked on the test years
    resid = []
    for tr, te in folds(train):
        resid += (te[TARGET].values - fit(tr[feats], tr[TARGET], best).predict(te[feats])).tolist()
    lo_off, hi_off = (float(v) for v in np.quantile(resid, [0.1, 0.9]))
    pt = point.predict(test[feats])
    coverage = float(((test[TARGET] >= pt + lo_off) & (test[TARGET] <= pt + hi_off)).mean())

    # Deployed models are refit on ALL years so recent seasons count
    final = {"catboost_v2": fit(df[feats], df[TARGET], best)}
    OUT.mkdir(parents=True, exist_ok=True)
    for n, m in final.items():
        m.save_model(str(OUT / f"{n}.cbm"))

    # 3) Reference yield from the last 5 years of history, per district
    recent = df[df.year.isin(years[-5:])]
    meta = {
        "features": feats, "cat_features": CAT, "stage_features": STAGE_F if use_stage else [],
        "best_params": best, "cv_rmse": best_rmse, "test_metrics": test_metrics, "ablation": ablation,
        "interval": {"low_q": 0.1, "high_q": 0.9, "low_offset": lo_off, "high_offset": hi_off, "test_coverage": coverage},
        "soil_check": {"soil_in_data": has_soil, "districts_with_single_soil_share": single_share,
                       "soil_informative": bool(has_soil and single_share < 0.8),
                       "soil_values": sorted(df.soil_type.unique().tolist()) if has_soil else []},
        "reference_years": [int(y) for y in years[-5:]],
        "reference_yields": recent.groupby("district_name")[TARGET].mean().round(3).to_dict(),
        "global_reference": float(recent[TARGET].mean()),
        "stage_medians": df.groupby("district_name")[STAGE_F].median().round(1).to_dict("index") if use_stage else {},
        "stage_global_median": df[STAGE_F].median().round(1).to_dict() if use_stage else {},
        "districts": sorted(df.district_name.unique().tolist()), "soils": sorted(df.soil_type.unique().tolist()) if has_soil else [],
        "n_rows": int(len(df)), "train_years": [int(years[0]), int(years[k - 1])], "test_years": [int(years[k]), int(years[-1])] if k < len(years) else [],
    }
    (OUT / "model_meta_v2.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("Test:", test_metrics, "| 80% interval coverage:", round(coverage, 2), "| soil informative:", meta["soil_check"]["soil_informative"])
    if ablation:
        print("Ablation (area):", ablation)


if __name__ == "__main__":
    main()