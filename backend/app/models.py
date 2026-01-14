"""Data models for API responses."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class DataRow(BaseModel):
    """A single row of data."""
    data: Dict[str, Any]


class DataResponse(BaseModel):
    """Response containing paginated data."""
    data: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int


class DataSummary(BaseModel):
    """Summary statistics for the dataset."""
    total_rows: int
    columns: List[str]
    column_types: Dict[str, str]
    sample_data: List[Dict[str, Any]]
    source_filename: Optional[str] = None


class SchemaResponse(BaseModel):
    """Schema information for the dataset."""
    columns: List[str]
    dtypes: Dict[str, str]
    row_count: int
