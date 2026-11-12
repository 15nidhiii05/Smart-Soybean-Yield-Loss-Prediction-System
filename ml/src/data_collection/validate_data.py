import sys
import logging
import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Sample Coordinates: Latur, Maharashtra (Major Soybean Trading & Cultivation Hub)
LATUR_LAT = 18.4088
LATUR_LON = 76.5604

def test_open_meteo_archive():
    logger.info("Testing Open-Meteo Historical Weather Archive API...")
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": LATUR_LAT,
        "longitude": LATUR_LON,
        "start_date": "2023-06-15",
        "end_date": "2023-10-15",
        "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
        "timezone": "Asia/Kolkata"
    }
    
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                days = len(data.get("daily", {}).get("time", []))
                logger.info(f"Open-Meteo SUCCESS: Retrieved {days} daily records for Kharif 2023.")
                return True
            else:
                logger.error(f"Open-Meteo failed: {response.status_code}")
                return False
    except Exception as e:
        logger.error(f"Open-Meteo error: {e}")
        return False

def test_nasa_power_api():
    logger.info("Testing NASA POWER Agroclimatology Daily API...")
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "ALLSKY_SFC_SW_DWN",
        "community": "AG",
        "longitude": LATUR_LON,
        "latitude": LATUR_LAT,
        "start": "20230701",
        "end": "20230710",
        "format": "JSON"
    }
    
    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(url, params=params)
            if response.status_code == 200:
                logger.info("NASA POWER SUCCESS: Retrieved solar radiation parameters.")
                return True
            else:
                logger.error(f"NASA POWER failed: {response.status_code}")
                return False
    except Exception as e:
        logger.error(f"NASA POWER error: {e}")
        return False

if __name__ == "__main__":
    logger.info("--- STARTING PHASE 1 DATA CONNECTIVITY CHECKS ---")
    om_ok = test_open_meteo_archive()
    nasa_ok = test_nasa_power_api()

    if om_ok and nasa_ok:
        logger.info(">>> PHASE 1 PASSED. READY FOR PHASE 2. <<<")
        sys.exit(0)
    else:
        logger.error(">>> PHASE 1 FAILED. <<<")
        sys.exit(1)