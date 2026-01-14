"""API endpoints for data access."""

from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
from typing import Optional, List
import polars as pl
import json

from app.models import DataResponse, DataSummary, SchemaResponse

router = APIRouter(prefix="/api", tags=["data"])

# Path to processed data (relative to backend directory)
# Go up from: backend/app/api/endpoints.py -> backend -> project root -> pipeline -> processed_data
PROCESSED_DATA_DIR = Path(__file__).parent.parent.parent.parent / "pipeline" / "processed_data"


def get_latest_dataset() -> Optional[Path]:
    """Find the most recent processed dataset."""
    parquet_files = list(PROCESSED_DATA_DIR.glob("*.parquet"))
    if not parquet_files:
        return None
    # Return most recently modified file
    return max(parquet_files, key=lambda p: p.stat().st_mtime)


def load_dataset() -> pl.DataFrame:
    """Load the processed dataset."""
    dataset_path = get_latest_dataset()
    if not dataset_path:
        raise HTTPException(
            status_code=404,
            detail="No processed dataset found. Run the data pipeline first."
        )
    return pl.read_parquet(dataset_path)


@router.get("/data", response_model=DataResponse)
async def get_data(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
    sort_by: Optional[str] = Query(None, description="Column to sort by"),
    sort_desc: bool = Query(False, description="Sort in descending order"),
):
    """
    Get paginated data from the processed dataset.
    
    Supports:
    - Pagination
    - Sorting
    """
    try:
        df = load_dataset()
        
        # Apply sorting if requested
        if sort_by and sort_by in df.columns:
            df = df.sort(sort_by, descending=sort_desc)
        
        # Calculate pagination
        total = len(df)
        total_pages = (total + page_size - 1) // page_size
        
        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        df_page = df.slice(start_idx, page_size)
        
        # Convert to dict records
        data = df_page.to_dicts()
        
        return DataResponse(
            data=data,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading data: {str(e)}")


@router.get("/summary", response_model=DataSummary)
async def get_summary():
    """Get summary statistics and sample data."""
    try:
        df = load_dataset()
        dataset_path = get_latest_dataset()
        
        # Extract source filename from processed file name
        # e.g., "fifa_eda_stats.parquet" -> "fifa_eda_stats.csv"
        source_filename = None
        if dataset_path:
            # Remove .parquet extension and assume .csv source
            source_filename = dataset_path.stem + ".csv"
        
        # Get sample (first 10 rows)
        sample_df = df.head(10)
        
        return DataSummary(
            total_rows=len(df),
            columns=df.columns,
            column_types={col: str(df[col].dtype) for col in df.columns},
            sample_data=sample_df.to_dicts(),
            source_filename=source_filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading summary: {str(e)}")


@router.get("/schema", response_model=SchemaResponse)
async def get_schema():
    """Get schema information for the dataset."""
    try:
        df = load_dataset()
        
        return SchemaResponse(
            columns=df.columns,
            dtypes={col: str(df[col].dtype) for col in df.columns},
            row_count=len(df)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading schema: {str(e)}")
