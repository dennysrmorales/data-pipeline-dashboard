# Data Viewer

An end-to-end data visualization application that ingests external data, transforms it using Polars, and serves it through a FastAPI backend to a React + Vite frontend.

## Architecture

This application follows a clean separation of concerns:

1. **Data Pipeline** (Python + Polars): Ingests raw data → validates → transforms → outputs processed data
2. **Backend API** (FastAPI): Loads processed data → exposes REST endpoints → handles pagination/filtering
3. **Frontend** (React + Vite): Fetches data → visualizes with charts and tables → handles user interactions

### Key Principles

- **Raw data is never exposed directly** - All data goes through the pipeline
- **Pipeline output is the source of truth** - Backend only reads processed data
- **Frontend is data-agnostic** - UI doesn't know how data was produced, only how to display it

## Project Structure

```
data-viewer/
├── pipeline/              # Data processing pipeline
│   ├── raw_data/         # Place raw CSV/Parquet files here
│   ├── processed_data/   # Pipeline output (Parquet files)
│   ├── pipeline.py       # Main pipeline script
│   └── requirements.txt  # Python dependencies
│
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py  # API routes
│   │   ├── main.py          # FastAPI app
│   │   └── models.py        # Pydantic models
│   └── requirements.txt     # Python dependencies
│
└── frontend/             # React + Vite frontend
    ├── src/
    │   ├── components/   # React components
    │   ├── App.jsx       # Main app component
    │   └── main.jsx      # Entry point
    └── package.json      # Node dependencies
```

## Setup

### Prerequisites

- Python 3.9+ (with pip)
- Node.js 18+ (with npm)

### 1. Setup Data Pipeline

```bash
cd pipeline
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Setup Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Setup Frontend

```bash
cd frontend
npm install
```

## Usage

### Step 1: Prepare Raw Data

Place your raw data files (CSV or Parquet) in the `pipeline/raw_data/` directory.

Example CSV structure:
```csv
date,category,value,count
2024-01-01,Category A,1250.50,45
2024-01-02,Category A,1320.75,52
...
```

### Step 2: Run Data Pipeline

Process raw data into clean, structured datasets:

**Process all files** (default):
```bash
cd pipeline
source venv/bin/activate  # On Windows: venv\Scripts\activate
python pipeline.py
```

**Process a specific file**:
```bash
cd pipeline
source venv/bin/activate  # On Windows: venv\Scripts\activate
python pipeline.py -f sample_data.csv
# or
python pipeline.py --file fifa_eda_stats.csv
```

The pipeline will:
- Load CSV/Parquet files from `raw_data/` (all files, or the specified file)
- Validate and transform the data
- Save processed Parquet files to `processed_data/`
- Generate schema metadata files

**See help**:
```bash
python pipeline.py --help
```

### Step 3: Start Backend Server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API Endpoints:
- `GET /` - API information
- `GET /api/data?page=1&page_size=50` - Paginated data
- `GET /api/summary` - Dataset summary
- `GET /api/schema` - Schema information

### Step 4: Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Customization

### Customizing the Data Pipeline

Edit `pipeline/pipeline.py` to customize transformations:

```python
def transform_data(self, df: pl.DataFrame) -> pl.DataFrame:
    # Add your custom transformations here
    df = df.filter(pl.all_horizontal(pl.col("*").is_not_null()))
    # Example: Parse dates
    df = df.with_columns(pl.col("date").str.to_date())
    # Example: Add computed metrics
    df = df.with_columns(
        (pl.col("value") * 1.1).alias("value_with_tax")
    )
    return df
```

### Customizing API Endpoints

Edit `backend/app/api/endpoints.py` to add new endpoints or modify existing ones.

### Customizing Frontend

Edit `frontend/src/App.jsx` and components in `frontend/src/components/` to customize the UI.

## Technology Stack

- **Data Processing**: Polars (fast, columnar dataframes)
- **Backend**: FastAPI (async Python web framework)
- **Frontend**: React 18 (UI library) + Vite (build tool)
- **Visualization**: Recharts (React charting library)
- **Data Format**: Parquet (columnar storage for processed data)

## Development Workflow

1. **Add new raw data** → Place in `pipeline/raw_data/`
2. **Run pipeline** → Activate venv and process data: `source venv/bin/activate && python pipeline.py`
3. **Backend auto-reloads** → FastAPI reloads on file changes (with venv activated)
4. **Frontend auto-reloads** → Vite HMR updates browser
5. **View results** → See visualizations at `http://localhost:5173`

## Production Build

### Frontend

```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/` - serve with any static file server.

### Backend

Use a production ASGI server:

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or use Gunicorn with Uvicorn workers:

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Notes

- The pipeline output (`processed_data/`) is the **source of truth** for the application
- Raw data should never be served directly - always go through the pipeline
- The backend treats processed data as read-only
- Frontend components are decoupled from data processing logic

## License

MIT
