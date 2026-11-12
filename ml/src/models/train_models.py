import pandas as pd
from pathlib import Path
from catboost import CatBoostRegressor

# Setup paths
ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "processed" / "yield_with_weather.csv"
MODEL_DIR = ROOT / "saved_models"

def train_and_save():
    print("Loading historical data...")
    df = pd.read_csv(DATA)

    # 1. Feature Engineering: Map Districts to Soil Types
    black_soil_districts = [
        'akola', 'amravati', 'washim', 'yavatmal', 'wardha', 'buldhana', 
        'jalgaon', 'dhule', 'nashik', 'aurangabad', 'jalna', 'beed', 
        'latur', 'osmanabad', 'parbhani', 'hingoli', 'nanded', 'solapur'
    ]
    
    # Clean district names first
    df['district_name'] = df['district_name'].astype(str).str.title().str.strip()
    
    # Create the missing 'soil_type' column based on geography
    df['soil_type'] = df['district_name'].apply(
        lambda x: 'Black Cotton (Regur)' if str(x).lower() in black_soil_districts else 'Red / Laterite'
    )

    # Force categories to be explicitly string types for CatBoost
    df['district_name'] = df['district_name'].astype(str)
    df['soil_type'] = df['soil_type'].astype(str)

    CAT = ["district_name", "soil_type"]
    NUM = ["area", "total_rainfall_mm", "avg_max_temp_c", "avg_min_temp_c", "heat_stress_days"]
    FEATURES = CAT + NUM
    TARGET = "yield_tha"

    # Drop any empty rows
    df = df.dropna(subset=FEATURES + [TARGET])

    print("Training Hyper-Local CatBoost Model...")
    model = CatBoostRegressor(
        iterations=600, 
        learning_rate=0.05, 
        depth=6, 
        loss_function='RMSE',
        cat_features=CAT, 
        verbose=50, 
        random_seed=42
    )

    model.fit(df[FEATURES], df[TARGET])

    # Save the model so FastAPI can use it
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / "catboost_model.cbm"
    model.save_model(str(model_path))
    print(f"Success! Model with string support saved to: {model_path}")

if __name__ == "__main__":
    train_and_save()