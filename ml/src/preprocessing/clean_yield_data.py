import pandas as pd
import logging
from pathlib import Path
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Dynamically find the project root so it never fails to find the file
SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent.parent 

RAW_DATA_PATH = ML_DIR / "data" / "raw" / "crop_production.csv"
PROCESSED_DATA_PATH = ML_DIR / "data" / "processed" / "maharashtra_soybean_yield.csv"

def process_crop_data():
    logger.info("Starting historical yield data processing...")
    
    if not RAW_DATA_PATH.exists():
        logger.error(f"Raw data file not found at: {RAW_DATA_PATH}")
        sys.exit(1)

    try:
        # Load dataset
        df = pd.read_csv(RAW_DATA_PATH)
        
        # Standardize column names
        df.columns = df.columns.str.strip().str.lower()
        
        # Exact column name mapping to avoid matching 'crop_year'
        state_col = next((c for c in df.columns if c in ['state_name', 'state']), 'state_name')
        crop_col = next((c for c in df.columns if c in ['crop_name', 'crop']), 'crop')
        area_col = next((c for c in df.columns if c in ['area']), 'area')
        prod_col = next((c for c in df.columns if c in ['production']), 'production')
        
        # Filter for Maharashtra and Soybean (forcing to string first just to be completely safe)
        mh_data = df[df[state_col].astype(str).str.contains("Maharashtra", case=False, na=False)].copy()
        soybean_data = mh_data[mh_data[crop_col].astype(str).str.contains("Soyabean|Soybean", case=False, na=False)].copy()
        
        logger.info(f"Filtered down to {len(soybean_data)} Maharashtra Soybean records.")
        
        # Drop missing values in critical columns
        soybean_data = soybean_data.dropna(subset=[area_col, prod_col])
        
        # Ensure numeric types
        soybean_data[area_col] = pd.to_numeric(soybean_data[area_col], errors='coerce')
        soybean_data[prod_col] = pd.to_numeric(soybean_data[prod_col], errors='coerce')
        soybean_data = soybean_data.dropna(subset=[area_col, prod_col])
        
        # Calculate Yield (Tonnes per Hectare)
        soybean_data['yield_tha'] = soybean_data[prod_col] / soybean_data[area_col]
        
        # Filter out extreme outliers (e.g., > 10 t/ha is physically impossible for soybean)
        valid_yields = soybean_data[(soybean_data['yield_tha'] > 0.1) & (soybean_data['yield_tha'] < 5.0)]
        
        # Save processed data
        PROCESSED_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        valid_yields.to_csv(PROCESSED_DATA_PATH, index=False)
        
        logger.info(f"Successfully saved {len(valid_yields)} cleaned records to {PROCESSED_DATA_PATH}")
        logger.info(f"Average Maharashtra Soybean Yield: {valid_yields['yield_tha'].mean():.2f} t/ha")
        
    except Exception as e:
        logger.error(f"Error processing data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    process_crop_data()