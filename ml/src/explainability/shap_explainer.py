
import pandas as pd
import shap
from catboost import CatBoostRegressor
from pathlib import Path
import logging
import json

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent.parent
MODEL_PATH = ML_DIR / "saved_models" / "catboost_model.cbm"
DATA_PATH = ML_DIR / "data" / "processed" / "yield_with_weather.csv"

def generate_shap_explanation(sample_data_dict):
    """
    Takes a dictionary of farm features and returns a human-readable 
    SHAP explanation using the trained CatBoost model.
    """
    logger.info("Initializing SHAP Explainer...")
    
    if not MODEL_PATH.exists():
        logger.error(f"Trained CatBoost model not found at {MODEL_PATH}")
        return None

    # Load Model
    model = CatBoostRegressor()
    model.load_model(str(MODEL_PATH))

    # Convert input to DataFrame for the model
    features = ['area', 'total_rainfall_mm', 'avg_max_temp_c', 'avg_min_temp_c', 'heat_stress_days']
    input_df = pd.DataFrame([sample_data_dict])[features]

    # Generate Prediction
    prediction = model.predict(input_df)[0]
    logger.info(f"Model Predicted Yield: {prediction:.2f} t/ha")

    # Initialize SHAP TreeExplainer
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(input_df)

    # Base value (the average prediction across the training set)
    base_value = explainer.expected_value
    
    # Format the explanations
    explanation = {
        "predicted_yield_tha": round(float(prediction), 2),
        "base_yield_tha": round(float(base_value), 2),
        "feature_contributions": []
    }

    # Map the SHAP values to the feature names
    for i, feature in enumerate(features):
        impact = shap_values[0][i]
        value = input_df.iloc[0][feature]
        
        explanation["feature_contributions"].append({
            "feature": feature,
            "value": float(value),
            "impact_tha": round(float(impact), 3),
            "effect": "Positive" if impact > 0 else "Negative"
        })
        
    # Sort by absolute impact to find the most important factors for this specific farm
    explanation["feature_contributions"].sort(key=lambda x: abs(x["impact_tha"]), reverse=True)

    return explanation

if __name__ == "__main__":
    # Simulate a farmer requesting a prediction for a specific farm
    sample_farm = {
        'area': 2.5, 
        'total_rainfall_mm': 650.0, 
        'avg_max_temp_c': 31.5, 
        'avg_min_temp_c': 23.0, 
        'heat_stress_days': 12
    }
    
    logger.info(f"Running SHAP explanation for sample farm: {sample_farm}")
    result = generate_shap_explanation(sample_farm)
    
    print("\n--- FARMER EXPLANATION DASHBOARD (JSON DATA) ---")
    print(json.dumps(result, indent=4))