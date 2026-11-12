"""Serves the saved algorithm-comparison results (read-only, no change to the prediction endpoint)."""
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/analysis", tags=["Model analysis"])

RESULTS = Path(__file__).resolve().parents[3] / "ml" / "saved_models" / "model_comparison.json"


@router.get("/models", summary="Compare all trained algorithms")
def model_comparison():
    if not RESULTS.exists():
        raise HTTPException(status_code=404, detail="Run ml/src/models/compare_models.py first.")
    return json.loads(RESULTS.read_text(encoding="utf-8"))