from pydantic import BaseModel, Field
from typing import List, Dict, Any

class PredictionRequest(BaseModel):
    district: str = Field(
        default="Latur", 
        description="Target district in Maharashtra to calibrate baseline climate and geographic expectations.",
        json_schema_extra={"example": "Latur"}
    )
    soil_type: str = Field(
        default="Black Cotton (Regur)", 
        description="Geological soil composition for moisture retention and nutrient analysis.",
        json_schema_extra={"example": "Black Cotton (Regur)"}
    )
    area_hectares: float = Field(
        ..., 
        gt=0, 
        description="Total cultivated agricultural area in hectares.",
        json_schema_extra={"example": 2.5}
    )
    total_rainfall_mm: float = Field(
        ..., 
        ge=0, 
        description="Cumulative rainfall recorded during the Kharif growing season (mm).",
        json_schema_extra={"example": 650.0}
    )
    avg_max_temp_c: float = Field(
        ..., 
        description="Average maximum daily temperature (°C) during the crop cycle.",
        json_schema_extra={"example": 31.5}
    )
    avg_min_temp_c: float = Field(
        ..., 
        description="Average minimum daily temperature (°C) during the crop cycle.",
        json_schema_extra={"example": 23.0}
    )
    heat_stress_days: int = Field(
        ..., 
        ge=0, 
        description="Total number of days where the maximum temperature exceeded the 33°C threshold.",
        json_schema_extra={"example": 12}
    )
    soybean_price_per_quintal: float = Field(
        default=4000.0, 
        gt=0, 
        description="Live or estimated local Mandi market price for Soybean (₹/quintal) for financial risk modeling.",
        json_schema_extra={"example": 4250.0}
    )
    reference_yield_tha: float = Field(
        default=1.5, 
        gt=0, 
        description="Historical benchmark yield for the selected district (t/ha) used to calculate crop loss percentage.",
        json_schema_extra={"example": 1.45}
    )

class FeatureContribution(BaseModel):
    feature: str = Field(..., description="The name of the feature analyzed by the SHAP explainer.")
    value: float = Field(..., description="The actual input value provided for this feature.")
    impact_tha: float = Field(..., description="The calculated positive or negative impact on yield (t/ha).")
    effect: str = Field(..., description="String classification of the impact ('Positive' or 'Negative').")

class ShapExplanation(BaseModel):
    base_yield_tha: float = Field(..., description="The model's baseline yield expectation before specific farm features are applied.")
    contributions: List[FeatureContribution] = Field(..., description="Detailed breakdown of how each feature impacted the final prediction.")

class PredictionResponse(BaseModel):
    predicted_yield_tha: float = Field(
        ..., 
        description="Machine learning estimated yield per hectare."
    )
    predicted_production_tonnes: float = Field(
        ..., 
        description="Total projected farm production in metric tonnes."
    )
    yield_loss_pct: float = Field(
        ..., 
        description="Percentage deficit against the district historical benchmark."
    )
    gross_revenue_loss_inr: float = Field(
        ..., 
        description="Estimated financial exposure in INR based on predicted loss and market price."
    )
    shap_explanation: ShapExplanation = Field(
        ...,
        description="Explainable AI diagnostic data payload."
    )