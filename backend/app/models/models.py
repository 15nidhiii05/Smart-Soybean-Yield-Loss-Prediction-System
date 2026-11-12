from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    farms = relationship("Farm", back_populates="owner", cascade="all, delete-orphan")

class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    farm_name = Column(String, nullable=False)
    state = Column(String, default="Maharashtra")
    district = Column(String, nullable=False)
    village = Column(String, nullable=True)
    area = Column(Float, nullable=False)
    unit = Column(String, default="acre") # acre or hectare
    sowing_date = Column(String, nullable=False)
    soil_type = Column(String, nullable=True)
    irrigation_available = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="farms")
    soil_record = relationship("SoilRecord", back_populates="farm", uselist=False, cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="farm", cascade="all, delete-orphan")

class SoilRecord(Base):
    __tablename__ = "soil_records"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    ph = Column(Float, nullable=True)
    nitrogen = Column(Float, nullable=True)
    phosphorus = Column(Float, nullable=True)
    potassium = Column(Float, nullable=True)
    organic_carbon = Column(Float, nullable=True)
    ec = Column(Float, nullable=True)
    tested_at = Column(DateTime, default=datetime.utcnow)

    farm = relationship("Farm", back_populates="soil_record")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    predicted_yield = Column(Float, nullable=False) # tonnes/hectare
    total_production = Column(Float, nullable=False) # tonnes
    reference_yield = Column(Float, nullable=False) # tonnes/hectare benchmark
    yield_reduction_pct = Column(Float, nullable=False) # percentage difference
    gross_revenue_reduction = Column(Float, nullable=False) # INR
    crop_stage = Column(String, nullable=False)
    model_version = Column(String, default="CatBoost-v1.0")
    created_at = Column(DateTime, default=datetime.utcnow)

    farm = relationship("Farm", back_populates="predictions")
    explanations = relationship("PredictionExplanation", back_populates="prediction", cascade="all, delete-orphan")

class PredictionExplanation(Base):
    __tablename__ = "prediction_explanations"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    feature_name = Column(String, nullable=False)
    feature_value = Column(Float, nullable=False)
    shap_contribution = Column(Float, nullable=False)

    prediction = relationship("Prediction", back_populates="explanations")

class MarketPrice(Base):
    __tablename__ = "market_prices"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String, nullable=False)
    price_per_quintal = Column(Float, nullable=False) # INR per quintal (100 kg)
    recorded_date = Column(DateTime, default=datetime.utcnow)
    source = Column(String, default="Agmarknet Benchmark")