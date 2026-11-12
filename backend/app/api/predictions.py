import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
import pandas as pd
from catboost import CatBoostRegressor
import shap
import logging

from app.schemas.prediction import PredictionRequest, PredictionResponse

# 1. Setup Professional Server Logging
logger = logging.getLogger("agripredict_api")
logger.setLevel(logging.INFO)

router = APIRouter()

# 2. Dynamically locate the saved hyper-local model
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MODEL_PATH = BASE_DIR / "ml" / "saved_models" / "catboost_model.cbm"

# Load model globally on startup to keep API responses near-instantaneous
try:
    model = CatBoostRegressor()
    model.load_model(str(MODEL_PATH))
    # SHAP TreeExplainer natively understands CatBoost's categorical features
    explainer = shap.TreeExplainer(model)
    logger.info("Hyper-Local CatBoost model and SHAP explainer loaded successfully.")
except Exception as e:
    model = None
    explainer = None
    logger.error(f"Critical Error: ML model failed to load. {e}")

@router.post("/yield", response_model=PredictionResponse)
async def predict_yield_and_risk(request: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="The Machine Learning model is currently initializing or unavailable.")

    # 3. Define the strict feature order required by the trained model
    features = [
        'district_name', 'soil_type', 'area', 
        'total_rainfall_mm', 'avg_max_temp_c', 'avg_min_temp_c', 'heat_stress_days'
    ]

# 4. Map the API schema to the Model DataFrame & Sanitize Inputs
    input_data = pd.DataFrame([{
        'district_name': request.district.title().strip(),
        'soil_type': request.soil_type.title().strip(),
        'area': request.area_hectares,
        'total_rainfall_mm': request.total_rainfall_mm,
        'avg_max_temp_c': request.avg_max_temp_c,
        'avg_min_temp_c': request.avg_min_temp_c,
        'heat_stress_days': request.heat_stress_days
    }])

    # 🚨 CRITICAL FIX: Force pandas to treat these as strings before feeding to model
    input_data['district_name'] = input_data['district_name'].astype(str)
    input_data['soil_type'] = input_data['soil_type'].astype(str)
    
    # Enforce strict column order matching the training data
    input_data = input_data[features]
    
    try:
        # 5. Execute Machine Learning Prediction
        predicted_yield = float(model.predict(input_data)[0])
        predicted_production = predicted_yield * request.area_hectares

        # 6. Compute Dynamic Financial Risk Metrics
        if predicted_yield < request.reference_yield_tha:
            yield_loss_pct = ((request.reference_yield_tha - predicted_yield) / request.reference_yield_tha) * 100
            yield_deficit = request.reference_yield_tha - predicted_yield
        else:
            yield_loss_pct = 0.0
            yield_deficit = 0.0

        # Formula: Deficit * Area * 10 (convert tonnes to quintals) * Price
        revenue_loss = yield_deficit * request.area_hectares * 10 * request.soybean_price_per_quintal

        # 7. Generate Explainable AI (SHAP) Matrix
        shap_values = explainer.shap_values(input_data)
        feature_contributions = []
        
        for i, feature in enumerate(features):
            impact = float(shap_values[0][i])
            raw_val = input_data.iloc[0][feature]
            
            # Format numbers cleanly, but allow string categories (like 'Latur') to pass through
            if isinstance(raw_val, (int, float)):
                display_value = float(round(raw_val, 2))
            else:
                # Store string category as a number in the backend representation 
                # (You can pass 0.0 for strings to keep the Pydantic type as float if required, 
                # or handle the visualization in the frontend. We default to 1.0 for categorical presence)
                display_value = 1.0 

            feature_contributions.append({
                "feature": feature,
                "value": display_value,
                "impact_tha": round(impact, 3),
                "effect": "Positive" if impact > 0 else "Negative"
            })
            
        # Sort features by absolute impact magnitude to show the farmer the most critical variables first
        feature_contributions.sort(key=lambda x: abs(x["impact_tha"]), reverse=True)

        # 8. Return Validated JSON Payload
        return PredictionResponse(
            predicted_yield_tha=round(predicted_yield, 3),
            predicted_production_tonnes=round(predicted_production, 2),
            yield_loss_pct=round(yield_loss_pct, 2),
            gross_revenue_loss_inr=round(revenue_loss, 2),
            shap_explanation={
                "base_yield_tha": round(float(explainer.expected_value), 2),
                "contributions": feature_contributions
            }
        )
    except Exception as e:
        logger.error(f"Prediction pipeline failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Processing Error: {str(e)}")