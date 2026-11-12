import pandas as pd
import httpx
import logging
import time
from pathlib import Path
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent.parent
INPUT_CSV = ML_DIR / "data" / "processed" / "maharashtra_soybean_yield.csv"
OUTPUT_CSV = ML_DIR / "data" / "processed" / "yield_with_weather.csv"

DISTRICT_COORDS = {
    'ahmednagar': (19.0948, 74.7480), 'akola': (20.7002, 76.9999), 
    'amravati': (20.9320, 77.7523), 'aurangabad': (19.8762, 75.3433),
    'beed': (18.9891, 75.7601), 'buldhana': (20.5312, 76.1834),
    'chandrapur': (19.9615, 79.2961), 'dhule': (20.9042, 74.7749),
    'hingoli': (19.7181, 77.1477), 'jalgaon': (21.0077, 75.5626),
    'jalna': (19.8297, 75.8800), 'kolhapur': (16.7050, 74.2433),
    'latur': (18.4088, 76.5604), 'nagpur': (21.1458, 79.0882),
    'nanded': (19.1383, 77.3210), 'nashik': (19.9975, 73.7898),
    'osmanabad': (18.1856, 76.0417), 'parbhani': (19.2644, 76.7728),
    'pune': (18.5204, 73.8567), 'sangli': (16.8524, 74.5815),
    'satara': (17.6805, 73.9966), 'solapur': (17.6599, 75.9064),
    'wardha': (20.7453, 78.6022), 'washim': (20.1114, 77.1293),
    'yavatmal': (20.3888, 78.1204), 'palghar': (19.6967, 72.7699)
}

def fetch_weather_for_season(lat, lon, year):
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat, "longitude": lon,
        "start_date": f"{year}-06-15", "end_date": f"{year}-10-15",
        "daily": ["temperature_2m_max", "precipitation_sum", "temperature_2m_min"],
        "timezone": "Asia/Kolkata"
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()['daily']
                rainfall = sum(data['precipitation_sum'])
                max_temps = data['temperature_2m_max']
                min_temps = data['temperature_2m_min']
                avg_max_temp = sum(max_temps) / len(max_temps)
                avg_min_temp = sum(min_temps) / len(min_temps)
                heat_stress = sum(1 for t in max_temps if t > 33.0)
                return {
                    "total_rainfall_mm": round(rainfall, 2),
                    "avg_max_temp_c": round(avg_max_temp, 2),
                    "avg_min_temp_c": round(avg_min_temp, 2),
                    "heat_stress_days": heat_stress
                }
    except Exception as e:
        logger.warning(f"Fetch failed: {e}")
    return None

def process_weather_data():
    if not INPUT_CSV.exists():
        logger.error(f"Input file missing: {INPUT_CSV}")
        sys.exit(1)
        
    df = pd.read_csv(INPUT_CSV)
    logger.info(f"Loaded {len(df)} records. Starting robust weather fetch...")
    
    for col in ['total_rainfall_mm', 'avg_max_temp_c', 'avg_min_temp_c', 'heat_stress_days']:
        if col not in df.columns:
            df[col] = None
            
    api_cache = {}
    
    try:
        for idx, row in df.iterrows():
            district = str(row.get('district_name', '')).strip().lower()
            year = int(row.get('crop_year', 0))
            
            if year < 2000 or district not in DISTRICT_COORDS:
                continue
                
            cache_key = f"{district}_{year}"
            if cache_key not in api_cache:
                lat, lon = DISTRICT_COORDS[district]
                weather_data = fetch_weather_for_season(lat, lon, year)
                api_cache[cache_key] = weather_data
                time.sleep(0.5) # Be polite to API
                
            data = api_cache[cache_key]
            if data:
                df.at[idx, 'total_rainfall_mm'] = data['total_rainfall_mm']
                df.at[idx, 'avg_max_temp_c'] = data['avg_max_temp_c']
                df.at[idx, 'avg_min_temp_c'] = data['avg_min_temp_c']
                df.at[idx, 'heat_stress_days'] = data['heat_stress_days']
                
            # Save progress every 10 records so nothing is lost!
            if idx % 10 == 0:
                OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
                df.dropna(subset=['total_rainfall_mm']).to_csv(OUTPUT_CSV, index=False)
                logger.info(f"Progress saved at record {idx}/{len(df)}...")

    except KeyboardInterrupt:
        logger.warning("Script interrupted manually! Saving current progress...")
    except Exception as e:
        logger.error(f"Error occurred: {e}. Saving current progress...")
    finally:
        OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
        final_df = df.dropna(subset=['total_rainfall_mm'])
        if len(final_df) > 0:
            final_df.to_csv(OUTPUT_CSV, index=False)
            logger.info(f"Final save complete! Dataset size: {len(final_df)} records.")
        else:
            logger.error("No weather data was fetched successfully.")

if __name__ == "__main__":
    process_weather_data()