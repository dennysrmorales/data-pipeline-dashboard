"""
Data Pipeline: Transforms raw external data into processed, UI-ready datasets.

This pipeline:
- Ingests raw data from external sources (CSV/Parquet)
- Validates data structure and types
- Normalizes and transforms data using Polars
- Outputs processed data in a stable, query-friendly format
"""

import polars as pl
from pathlib import Path
from typing import Optional
import json
import argparse


class DataPipeline:
    """Processes raw data into clean, structured datasets."""
    
    def __init__(self, raw_data_dir: str = "raw_data", output_dir: str = "processed_data"):
        self.raw_data_dir = Path(raw_data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def load_raw_data(self, filename: str) -> pl.DataFrame:
        """Load raw data from file (CSV or Parquet)."""
        file_path = self.raw_data_dir / filename
        
        if not file_path.exists():
            raise FileNotFoundError(f"Raw data file not found: {file_path}")
        
        # Auto-detect format
        if filename.endswith('.csv'):
            df = pl.read_csv(file_path)
        elif filename.endswith('.parquet'):
            df = pl.read_parquet(file_path)
        else:
            raise ValueError(f"Unsupported file format: {filename}")
        
        return df
    
    def validate_schema(self, df: pl.DataFrame, expected_schema: Optional[dict] = None) -> pl.DataFrame:
        """Validate that the dataframe matches expected structure."""
        if expected_schema:
            for col, dtype in expected_schema.items():
                if col not in df.columns:
                    raise ValueError(f"Missing required column: {col}")
                # Coerce types if needed
                if df[col].dtype != dtype:
                    df = df.with_columns(pl.col(col).cast(dtype))
        
        return df
    
    def transform_data(self, df: pl.DataFrame) -> pl.DataFrame:
        """
        Transform raw data into meaningful metrics.
        
        This is where you'd apply:
        - Type normalization
        - Date parsing
        - Aggregations
        - Metric calculations
        - Data quality fixes
        """
        # Example transformation: ensure proper types and add computed fields
        # Customize this based on your actual data schema
        
        # Remove rows where ALL columns are null (truly empty rows only)
        # Note: We keep rows with some nulls - real-world datasets have optional fields
        # Only filter out rows that are completely empty
        df = df.filter(pl.any_horizontal(pl.col("*").is_not_null()))
        
        # If there are date columns, parse them
        # df = df.with_columns(pl.col("date").str.to_date())
        
        # Add any computed metrics here
        # df = df.with_columns(
        #     (pl.col("value") * pl.col("multiplier")).alias("total_value")
        # )
        
        return df
    
    def process_file(self, filename: str, output_name: Optional[str] = None) -> Path:
        """
        Complete pipeline: load → validate → transform → save.
        
        Returns path to processed output file.
        """
        print(f"Processing {filename}...")
        
        # Load raw data
        df = self.load_raw_data(filename)
        print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")
        
        # Validate (optional schema validation)
        # df = self.validate_schema(df, expected_schema={...})
        
        # Transform
        df = self.transform_data(df)
        print(f"  Transformed to {len(df)} rows")
        
        # Save processed data
        output_name = output_name or filename.replace('.csv', '.parquet').replace('.parquet', '.parquet')
        output_path = self.output_dir / output_name
        df.write_parquet(output_path)
        
        # Save metadata/schema
        schema_path = self.output_dir / f"{output_name}.schema.json"
        schema_info = {
            "columns": df.columns,
            "dtypes": {col: str(df[col].dtype) for col in df.columns},
            "row_count": len(df)
        }
        with open(schema_path, 'w') as f:
            json.dump(schema_info, f, indent=2)
        
        print(f"  Saved to {output_path}")
        return output_path


def main():
    """Run the pipeline on available raw data files."""
    parser = argparse.ArgumentParser(
        description='Process raw data files into processed datasets',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python pipeline.py                    # Process all CSV/Parquet files
  python pipeline.py -f sample_data.csv # Process only sample_data.csv
  python pipeline.py --file fifa_eda_stats.csv  # Process only fifa_eda_stats.csv
        '''
    )
    parser.add_argument(
        '-f', '--file',
        type=str,
        help='Specific file to process (e.g., sample_data.csv). If not specified, processes all files.'
    )
    
    args = parser.parse_args()
    pipeline = DataPipeline()
    
    if args.file:
        # Process only the specified file
        filename = args.file
        file_path = pipeline.raw_data_dir / filename
        
        if not file_path.exists():
            print(f"Error: File '{filename}' not found in {pipeline.raw_data_dir}")
            print(f"Available files:")
            for ext in ['*.csv', '*.parquet']:
                for f in pipeline.raw_data_dir.glob(ext):
                    print(f"  - {f.name}")
            return
        
        try:
            pipeline.process_file(filename)
        except Exception as e:
            print(f"Error processing {filename}: {e}")
    else:
        # Process all CSV and Parquet files in raw_data directory
        raw_files = []
        for ext in ['*.csv', '*.parquet']:
            raw_files.extend(pipeline.raw_data_dir.glob(ext))
        
        if not raw_files:
            print("No raw data files found. Place CSV or Parquet files in the raw_data/ directory.")
            return
        
        # Process each file
        for raw_file in raw_files:
            try:
                pipeline.process_file(raw_file.name)
            except Exception as e:
                print(f"Error processing {raw_file.name}: {e}")


if __name__ == "__main__":
    main()
