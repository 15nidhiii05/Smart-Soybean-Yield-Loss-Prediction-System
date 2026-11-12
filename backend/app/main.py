from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import predictions
from app.api import analysis
from app.api import predictions_v2

app = FastAPI(
    title="Smart Soybean Yield & Loss Prediction System",
    description="API for agricultural decision-support and financial risk prediction.",
    version="1.0.0"
)

# Allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the prediction routes
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["Predictions"])
app.include_router(analysis.router)
app.include_router(predictions_v2.router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Soybean Prediction API is running!"}