# Scripts Directory

Production-ready scripts for the **Land Estimator** Document Mode data ingestion pipeline.

---

## 📌 Purpose

This pipeline processes raw parcel shapefiles for St. Louis City and County and outputs:

- ✅ Lightweight **document.json** files for **hot search** (FlexSearch Document Mode)
- ✅ Regionally sharded **address indexes**, **parcel metadata**, and **geometry** files for **cold storage**
- ✅ Compressed `.json.gz` files to minimize storage costs for large intermediate data
- ✅ Uploads to **Vercel Blob Storage** (`/search/` and `/cdn/`) and **Firebase** backup

---

## 🗂️ Directory Contract

| Folder                          | Purpose                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `/src/data/`                    | Source shapefiles per region                                     |
| `/src/config/scripts/temp/raw/` | Raw intermediate files: address index, parcel metadata, geometry |
| `/src/config/scripts/temp/cdn/` | Compressed `.json.gz` files for cold storage                     |
| `/public/search/`               | Final `*-document.json` files for client-side search             |
| `/cdn/`                         | Long-term storage for compressed intermediate files              |

---

## ⚙️ Pipeline Steps

1️⃣ **Process Regional Shapefiles**

- Uses `geopandas` to load shapefiles, CSV, and DBF files.
- Calculates parcel areas, property types, owners, and assessments.
- Extracts **WGS84** centroids for accurate map placement.

2️⃣ **Create Intermediate Files**

- `*-address_index.json`: Basic ID/address/lat/lng per parcel.
- `*-parcel_metadata.json`: Full calculations, ownership, assessments.
- `*-parcel_geometry.json`: Simplified parcel shapes in GeoJSON format.

3️⃣ **Compress for Cold Storage**

- Metadata and geometry files are compressed (`.json.gz`) to reduce storage costs.

4️⃣ **Upload**

- Hot search files (`document.json` and `latest.json`) → `/public/search/` (Vercel edge CDN).
- Compressed regionals (`.json.gz`) → `/cdn/` (Vercel Blob) + Firebase for redundancy.

5️⃣ **Cleanup**

- All temp files in `temp/` are removed after upload. Persistent intermediate files are kept under `/src/data/tmp/` for rebuilds.

---

## 📦 Dependencies

**Python**

- `geopandas` — For shapefile processing and CRS transformations.
- `shapely` — Geometry operations.
- `pandas` — Data merging and cleaning.
- `dbfread` — DBF file reading for parcel attributes.
- `gzip` — Compressing large intermediate files.
- `subprocess` — Runs Node upload scripts for Vercel Blob and Firebase.

**Node.js**

- `upload_blob.js` — Handles uploads to Vercel Blob Storage using the official SDK.
- `upload_firebase.js` — Handles Firebase backup uploads.

---

## ✅ Why This Structure?

- Keeps **hot search data minimal** for fast edge delivery.
- Preserves **full parcel detail** in cold storage for advanced GIS or backup.
- Supports **regional sharding** and future scaling (e.g., IP-based lookup).
- Ensures **coordinate accuracy** by transforming all geometries to **WGS84**.
- Uses a **clear ephemeral model**: temp dirs are safe to delete; persistent data is always reproducible.

---

## � Current Scripts

**Core Pipeline:**

- `ingest_shapes.py` — Main data ingestion pipeline (CRS fixes, document generation, manifest creation)
- `validate_geometries.py` — Geometry validation and CRS verification utility

**Upload Scripts:**

- `upload_blob.js` — Vercel Blob Storage upload
- `upload_blob.py` — Alternative Python upload script
- `upload_firebase.js` — Firebase backup upload

**Configuration:**

- `README.md` — This documentation
- `requirements.txt` — Python dependencies

---

## �🚀 Usage

```bash
# Run the full Document Mode pipeline
python3 ingest_shapes.py --dataset-size=small --version=mytag

# Dataset sizes:
# --dataset-size=small   # 5,000 parcels (testing)
# --dataset-size=medium  # 25,000 parcels (development)
# --dataset-size=large   # Full dataset (production)

# Validate geometries (optional)
python3 validate_geometries.py

# Upload scripts must be present:
# - upload_blob.js
# - upload_firebase.js
```

---

**Designed for robust regional search & estimation at scale.**
