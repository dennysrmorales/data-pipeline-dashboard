"""
FastAPI Backend: Serves processed data to the frontend.

This backend:
- Loads processed data from the pipeline output
- Exposes REST API endpoints
- Handles filtering and pagination
- Returns structured JSON responses
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import router

app = FastAPI(
    title="Data Viewer API",
    description="API for serving processed data to the frontend",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Data Viewer API",
        "version": "1.0.0",
        "endpoints": {
            "data": "/api/data",
            "summary": "/api/summary",
            "schema": "/api/schema"
        }
    }
