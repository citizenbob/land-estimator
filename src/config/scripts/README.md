# Scripts Directory

Production-ready scripts for the Land Estimator data ingestion pipeline.

## Files

### Core Pipeline

- **`ingest_scripts.py`** - Main data ingestion pipeline that processes shapefiles, builds FlexSearch indexes, and uploads to Vercel Blob Storage
- **`flexsearch_builder.ts`** - TypeScript FlexSearch index builder that creates optimized search indexes from processed data

### Infrastructure

- **`upload_blob.py`** - Python interface for Vercel Blob Storage operations (upload, download, delete, list)
- **`upload_blob.js`** - Node.js wrapper for Vercel Blob Storage using the official SDK
- **`requirements.txt`** - Python dependencies for the ingestion pipeline

## Usage

```bash
# Run the main ingestion pipeline
python3 ingest_scripts.py --dataset-size=large

# Available dataset sizes:
# --dataset-size=small   # 1000 parcels per region (testing)
# --dataset-size=medium  # 10000 parcels per region (development)
# --dataset-size=large   # Full dataset (production)
```

## Architecture

The pipeline follows a clean, ephemeral processing model:

1. Downloads encrypted shapefiles from Vercel Blob Storage
2. Processes regional data and creates unified indexes
3. Builds FlexSearch indexes using TypeScript
4. Uploads versioned indexes to CDN (large datasets only)
5. Cleans up all temporary files

All processing is done in temporary directories that are automatically cleaned up after completion.
