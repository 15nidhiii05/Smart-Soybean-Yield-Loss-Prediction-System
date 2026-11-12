import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self.nasa_power_url = "https://power.larc.nasa.gov/api/temporal/daily/point"
        self.open_meteo_url = "https://archive-api.open-meteo.com/v1/archive"

    async def get_historical_weather(
        self, 
        latitude: float, 
        longitude: float, 
        start_date: str, 
        end_date: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetches daily meteorological data from NASA POWER API.
        Parameters:
        - start_date / end_date format: 'YYYYMMDD'
        """
        params = {
            "parameters": "T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M",
            "community": "AG",
            "longitude": longitude,
            "latitude": latitude,
            "start": start_date,
            "end": end_date,
            "format": "JSON"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(self.nasa_power_url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("properties", {}).get("parameter", {})
            except httpx.HTTPError as e:
                logger.error(f"NASA POWER API error: {e}")
                return None

    def compute_agro_indices(self, daily_weather: Dict[str, Any]) -> Dict[str, float]:
        """
        Computes agronomic stress indicators from daily weather series:
        - Dry-spell days (consecutive days with rainfall < 2.5 mm)
        - Heat-stress days (maximum temperature > 35°C)
        - Total seasonal rainfall
        - Average relative humidity
        """
        rainfall = daily_weather.get("PRECTOTCORR", {})
        tmax = daily_weather.get("T2M_MAX", {})
        humidity = daily_weather.get("RH2M", {})

        total_rainfall = sum(v for v in rainfall.values() if v >= 0)
        
        dry_spell_days = 0
        current_dry_streak = 0
        heat_stress_days = 0
        rh_values = []

        for date_key in sorted(rainfall.keys()):
            rf = rainfall[date_key]
            tm = tmax.get(date_key, 0)
            rh = humidity.get(date_key, 0)

            if rf != -999:
                if rf < 2.5:
                    current_dry_streak += 1
                else:
                    if current_dry_streak >= 5: # Threshold for dry spell
                        dry_spell_days += current_dry_streak
                    current_dry_streak = 0

            if tm != -999 and tm > 35.0:
                heat_stress_days += 1

            if rh != -999:
                rh_values.append(rh)

        if current_dry_streak >= 5:
            dry_spell_days += current_dry_streak

        avg_humidity = sum(rh_values) / len(rh_values) if rh_values else 0.0

        return {
            "total_rainfall_mm": round(total_rainfall, 2),
            "dry_spell_days": dry_spell_days,
            "heat_stress_days": heat_stress_days,
            "avg_humidity_pct": round(avg_humidity, 2)
        }