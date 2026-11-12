"""Version 2 prediction endpoints. The original /api/v1/predictions/yield endpoint is left untouched."""
from pathlib import Path
from typing import Dict, Optional

import json
import pandas as pd
from catboost import CatBoostRegressor, Pool
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/v2", tags=["Predictions v2"])
MODELS = Path(__file__).resolve().parents[3] / "ml" / "saved_models"
STAGE_IDS = ("sow", "veg", "flower", "pod", "harvest")
_cache: dict = {}


def _load():
    if not _cache:
        meta_file = MODELS / "model_meta_v2.json"
        if not meta_file.exists():
            raise HTTPException(status_code=503, detail="Run ml/src/models/train_v2.py first.")
        _cache["meta"] = json.loads(meta_file.read_text(encoding="utf-8"))
        for name in ("catboost_v2",):
            _cache[name] = CatBoostRegressor().load_model(str(MODELS / f"{name}.cbm"))
    return _cache


class YieldRequest(BaseModel):
    district_name: str
    soil_type: str
    area_hectares: float = Field(..., gt=0, description="Used only for production and money, not by the model")
    total_rainfall_mm: float = Field(..., ge=0)
    avg_max_temp_c: float
    avg_min_temp_c: float
    heat_stress_days: float = Field(..., ge=0)
    price_per_quintal: float = Field(4600, gt=0)
    reference_yield: Optional[float] = Field(None, gt=0, description="Leave empty to use the district 5-year history")
    stage_weather: Optional[Dict[str, float]] = None


@router.get("/meta", summary="Model facts: features, references, diagnostics")
def meta():
    return _load()["meta"]


@router.post("/predict", summary="Yield forecast with 80% range, loss and per-stage explanation")
def predict(req: YieldRequest):
    c = _load()
    m = c["meta"]
    district, soil = req.district_name.strip().title(), req.soil_type.strip().title()
    row = {"district_name": district, "soil_type": soil, "total_rainfall_mm": req.total_rainfall_mm,
           "avg_max_temp_c": req.avg_max_temp_c, "avg_min_temp_c": req.avg_min_temp_c, "heat_stress_days": req.heat_stress_days}
    defaults = m["stage_medians"].get(district, m["stage_global_median"])
    for f in m["stage_features"]:
        row[f] = (req.stage_weather or {}).get(f, defaults.get(f, m["stage_global_median"].get(f, 0)))
    pool = Pool(pd.DataFrame([row])[m["features"]], cat_features=m["cat_features"])

    y = float(c["catboost_v2"].predict(pool)[0])
    iv = m["interval"]  # interval = prediction + offsets learned from cross-validation residuals
    lo, hi = max(0.0, min(y, y + iv["low_offset"])), max(y, y + iv["high_offset"])
    ref = req.reference_yield or m["reference_yields"].get(district, m["global_reference"])

    def loss(v):
        return max(0.0, (ref - v) / ref * 100), max(0.0, ref - v) * req.area_hectares * 10 * req.price_per_quintal

    pct, inr = loss(y)
    pct_hi, inr_hi = loss(lo)  # worst case = low yield
    pct_lo, inr_lo = loss(hi)  # best case = high yield

    shap = c["catboost_v2"].get_feature_importance(pool, type="ShapValues")[0][:-1]
    xai = sorted(({"feature": f, "value": row[f], "impact_tha": round(float(s), 4), "effect": "increases" if s >= 0 else "decreases"}
                  for f, s in zip(m["features"], shap)), key=lambda d: abs(d["impact_tha"]), reverse=True)
    stage_impact = {sid: round(sum(d["impact_tha"] for d in xai if d["feature"].split("_")[0] == sid and d["feature"] in m["stage_features"]), 4)
                    for sid in STAGE_IDS} if m["stage_features"] else None

    warnings = []
    if district not in m["districts"]:
        warnings.append("This district is not in the training data, so the forecast is a rough estimate.")
    if m["soils"] and soil not in m["soils"]:
        warnings.append("This soil class is not in the training data.")
    return {
        "predicted_yield_tha": round(y, 3), "predicted_yield_low": round(lo, 3), "predicted_yield_high": round(hi, 3),
        "interval": {"level": 0.8, "test_coverage": m["interval"]["test_coverage"]},
        "reference_yield_tha": round(ref, 3), "reference_source": "user" if req.reference_yield else f"district average {m['reference_years'][0]}-{m['reference_years'][-1]}",
        "predicted_production": round(y * req.area_hectares, 3),
        "yield_loss_pct": round(pct, 2), "yield_loss_pct_best": round(pct_lo, 2), "yield_loss_pct_worst": round(pct_hi, 2),
        "gross_revenue_loss_inr": round(inr, 0), "revenue_loss_best_inr": round(inr_lo, 0), "revenue_loss_worst_inr": round(inr_hi, 0),
        "xai": xai, "stage_impact": stage_impact, "warnings": warnings,
        "note": "District-level estimate, not a single-plot guarantee.",
    }