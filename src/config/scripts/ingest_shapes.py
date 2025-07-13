#!/usr/bin/env python3
"""
Document Mode Ingest Pipeline - Clean Implementation

Robust Document Mode Pipeline:
1. Processes real shapefiles from regional directories
2. Creates regional intermediate files for landscape calculations ({region}-address_index.json, {region}-parcel_metadata.json, {region}-parcel_geometry.json) in data/tmp/raw/
3. Compresses regional parcel metadata and geometry files for efficient storage ({region}-parcel_metadata.json, {region}-parcel_geometry.json) in data/tmp/cdn/
4. Uploads compressed intermediate files to /cdn/ for cold storage
5. Creates minimal document.json files for FlexSearch Document Mode (hot search) in /public/search/
6. Cleans up temporary files

Directory contract:
- Input: /src/data/saint_louis_city/shapefiles/, /src/data/saint_louis_county/shapefiles/
- Temp: /src/config/scripts/temp/raw/, /src/config/scripts/temp/cdn/
- Output: /public/search/ (FlexSearch document mode), /cdn/ (compressed metadata/geometry)

Usage:
  python3 ingest_shapes_document_mode.py [--dataset-size=small|medium|large] [--version=_suffix]
"""

import os
import sys
import re
import json
import gzip
import shutil
import subprocess
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from dbfread import DBF

class ShapefileProcessor:
    """Process shapefiles and extract parcel data"""
    
    def __init__(self, temp_raw_dir: Path, dataset_size: str = "small"):
        self.temp_raw_dir = temp_raw_dir
        self.dataset_size = dataset_size
        self.limit_records = self._get_record_limit()
        
        # Field mappings from original
        self.field_mappings = {
            "city": {
                "assessment": {
                    "total": "ASMTTOTAL",
                    "land": "ASMTLAND",
                    "improvement": "ASMTIMPROV"
                },
                "building": {
                    "area": "BDG1AREA",
                    "year": "BDG1YEAR"
                },
                "owner": {
                    "name": "OWNERNAME",
                    "name2": "OWNERNAME2",
                    "address": "OWNERADDR",
                    "city": "OWNERCITY",
                    "state": "OWNERSTATE",
                    "zip": "OWNERZIP"
                },
                "address": {
                    "number": "LowAddrNum",
                    "street_primary": "SITEADDR",
                    "zip": "ZIP"
                },
                "parcel_id": "HANDLE"
            },
            "county": {
                "assessment": {
                    "total": "TOTAPVAL",
                    "land": "LAND_VAL",
                    "improvement": "IMPROV_VAL"
                },
                "building": {
                    "area": "RESQFT",
                    "year": "YEAR_BUILT"
                },
                "owner": {
                    "name": "OWNER_NAME",
                    "tenure": "TENURE",
                    "state": "OWN_STATE"
                },
                "address": {
                    "full": "PROP_ADD",
                    "number": "PROP_ADRNU",
                    "zip": "PROP_ZIP",
                    "municipality": "MUNICIPALI"
                },
                "property_class": "PROPCLASS",
                "parcel_id": "LOCATOR"
            }
        }
        
    def _get_record_limit(self) -> Optional[int]:
        """Get the record limit based on dataset size"""
        limits = {
            "small": 5000,     # 5K records for testing
            "medium": 25000,   # 25K records for development
            "large": None      # Full dataset (no limit)
        }
        return limits.get(self.dataset_size, None)  # Default: no limit
    
    def safe_to_numeric(self, value, default=0):
        """Safely convert value to numeric"""
        if value is None:
            return default
        try:
            return pd.to_numeric(value)
        except (ValueError, TypeError):
            return default
    
    def get_field_value(self, row, region, category, field, default=None):
        """Get field value using the field mapping"""
        try:
            field_name = self.field_mappings[region][category][field]
            value = row.get(field_name, default)
            return value
        except (KeyError, TypeError):
            return default
    
    def standardize_address(self, full_address_str, default_city="Unknown City", default_state="MO", default_zip="63102"):
        """Standardize address format for consistent search indexing"""
        if not full_address_str or not isinstance(full_address_str, str):
            return ""
            
        address_str = full_address_str.strip()
        if not address_str:
            return ""
            
        # Basic standardization
        address_str = re.sub(r'\s+', ' ', address_str)
        address_str = re.sub(r'[.,]+(?=[.,])', ',', address_str)
        address_str = address_str.replace(' ;', ',').replace(';', ',')
        address_str = re.sub(r'\s*\,\s*', ', ', address_str)
        
        parts = [p.strip() for p in address_str.split(',') if p.strip()]
        if not parts:
            return ""
            
        street_part = parts[0]
        city_part = parts[1] if len(parts) > 1 else default_city
        state_zip_part = parts[2] if len(parts) > 2 else f"{default_state} {default_zip}"
        
        # Street type standardization
        street_types = {
            "STREET": "St.", "ST": "St.", "AVENUE": "Ave.", "AVE": "Ave.",
            "ROAD": "Rd.", "RD": "Rd.", "DRIVE": "Dr.", "DR": "Dr.",
            "LANE": "Ln.", "LN": "Ln.", "COURT": "Ct.", "CT": "Ct.",
            "BOULEVARD": "Blvd.", "BLVD": "Blvd."
        }
        
        words = street_part.split()
        standardized_words = []
        for word in words:
            upper_word = word.upper().rstrip('.,')
            if upper_word in street_types:
                standardized_words.append(street_types[upper_word])
            else:
                standardized_words.append(word.title())
        
        street_standardized = " ".join(standardized_words)
        
        # City standardization
        if city_part.upper() in ["ST LOUIS", "SAINT LOUIS"]:
            city_standardized = "St. Louis"
        else:
            city_standardized = city_part.title()
            
        # State/ZIP extraction
        state_zip_match = re.search(r"\b([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\b\s*$", state_zip_part)
        if state_zip_match:
            state_standardized = state_zip_match.group(1).upper()
            zip_standardized = state_zip_match.group(2)
        else:
            state_standardized = default_state
            zip_standardized = default_zip
            
        final_address = f"{street_standardized}, {city_standardized}, {state_standardized} {zip_standardized}"
        return re.sub(r'\s+', ' ', final_address).strip()
    
    def calculate_landscapable_area(self, land_area, building_sqft, property_type):
        """Calculate estimated landscapable area"""
        land_area = self.safe_to_numeric(land_area, 0)
        building_sqft = self.safe_to_numeric(building_sqft, 0)
        
        if land_area <= 0:
            return 0
            
        # Estimate hardscape area
        estimated_hardscape = 0
        if building_sqft > 0:
            hardscape_ratio = min(0.15 + (building_sqft / 20000), 0.25)
            estimated_hardscape = (building_sqft * hardscape_ratio) + 300
        else:
            estimated_hardscape = land_area * 0.05
            
        estimated_hardscape = min(estimated_hardscape, land_area * 0.6)
        landscapable = land_area - building_sqft - estimated_hardscape
        landscapable = max(0, landscapable)
        
        # Adjustments by property type
        if property_type == "commercial":
            landscapable *= 0.6
        elif property_type == "industrial":
            landscapable *= 0.3
        elif property_type == "residential" and building_sqft > 0:
            min_landscapable = building_sqft * 0.2
            landscapable = max(landscapable, min_landscapable)
            landscapable = min(landscapable, land_area * 0.9)
            
        return round(landscapable, 2)
    
    def classify_property(self, property_class_code, region="city"):
        """Classify property type based on property class code"""
        if property_class_code is None:
            return "unknown"
        code = str(property_class_code).strip().upper()
        
        if region == "city":
            if code.startswith("A"): return "residential"
            if code.startswith("B"): return "residential"
            if code.startswith("C"): return "commercial"
            if code.startswith("D"): return "industrial"
            if code.startswith("E"): return "exempt"
            if code.startswith("F"): return "agricultural"
            return "other"
        elif region == "county":
            if code == "R" or code.startswith("RES"): return "residential"
            if code == "C" or code.startswith("COM"): return "commercial"
            if code == "I" or code.startswith("IND"): return "industrial"
            if code == "A" or code.startswith("AGR"): return "agricultural"
            if code == "E" or code.startswith("EX"): return "exempt"
            return "other"
        
        return "unknown"
    
    def extract_parcel_geometry(self, geometry, already_transformed=False):
        """Extract parcel geometry as simplified GeoJSON
        
        Args:
            geometry: Shapely geometry object (should already be in WGS84)
            already_transformed: True if geometry is already in WGS84
        """
        if geometry is None or geometry.is_empty:
            return None
            
        try:
            # Assume geometry is already transformed to WGS84 by batch processing
            geom = geometry
                
            def round_coords(coords):
                if isinstance(coords[0], (list, tuple)):
                    return [round_coords(coord) for coord in coords]
                else:
                    return [round(coord, 5) for coord in coords]
            
            if geom.geom_type == 'Polygon':
                coords = [list(geom.exterior.coords)]
                for interior in geom.interiors:
                    coords.append(list(interior.coords))
                    
                rounded_coords = round_coords(coords)
                bounds = geom.bounds
                bbox = [round(bounds[0], 5), round(bounds[1], 5), 
                       round(bounds[2], 5), round(bounds[3], 5)]
                
                return {
                    "type": "Polygon",
                    "coordinates": rounded_coords,
                    "bbox": bbox
                }
                
            elif geom.geom_type == 'MultiPolygon':
                coords = []
                for polygon in geom.geoms:
                    poly_coords = [list(polygon.exterior.coords)]
                    for interior in polygon.interiors:
                        poly_coords.append(list(interior.coords))
                    coords.append(poly_coords)
                    
                rounded_coords = round_coords(coords)
                bounds = geom.bounds
                bbox = [round(bounds[0], 5), round(bounds[1], 5), 
                       round(bounds[2], 5), round(bounds[3], 5)]
                
                return {
                    "type": "MultiPolygon",
                    "coordinates": rounded_coords,
                    "bbox": bbox
                }
                
        except Exception as e:
            print(f"⚠️ Error processing geometry: {e}")
            
        return None
    
    def process_city_data(self) -> tuple:
        """Process St. Louis City shapefile data"""
        print("🌆 Processing St. Louis City shapefiles...")
        
        # Use actual shapefile directory, not temp directory
        base_dir = Path("/Users/duebelbytes/Sites/land-estimator/src/data/saint_louis_city/shapefiles")
        required_files = {
            "shp": base_dir / "prcl.shp",
            "dbf": base_dir / "prcl.dbf",
            "csv": base_dir / "parcels-basic-info.csv"
        }
        
        missing_files = [name for name, path in required_files.items() if not path.exists()]
        if missing_files:
            print(f"❌ Missing city files: {missing_files}")
            print(f"📂 Looking in: {base_dir}")
            return [], {}
            
        try:
            # Load shapefile
            gdf = gpd.read_file(required_files["shp"])
            print(f"📊 Loaded {len(gdf)} parcels from city shapefile")
            
            # Set CRS if missing
            if gdf.crs is None:
                gdf = gdf.set_crs(epsg=2815)  # Missouri State Plane East
                
            # Store original geometry for centroid calculation
            gdf_original = gdf.copy()
            
            # Transform for area calculation
            gdf = gdf.to_crs(epsg=26915)  # UTM Zone 15N
            gdf["landarea"] = gdf.geometry.area * 10.7639  # Convert to sq ft
            
            # Load DBF data
            df_dbf = pd.DataFrame(iter(DBF(required_files["dbf"], load=True, encoding='latin1')))
            
            # Load CSV data (contains address and other parcel info)
            df_csv = pd.read_csv(required_files["csv"], low_memory=False)
            print(f"📊 Loaded CSV with {len(df_csv)} records")
            
            # Merge data using HANDLE as key
            parcel_id_field = self.field_mappings["city"]["parcel_id"]
            gdf[parcel_id_field] = gdf[parcel_id_field].astype(str)
            df_dbf[parcel_id_field] = df_dbf[parcel_id_field].astype(str)
            df_csv[parcel_id_field] = df_csv[parcel_id_field].astype(str)
            
            # First merge with DBF, then with CSV
            gdf = gdf.merge(df_dbf, on=parcel_id_field, how="left", suffixes=('', '_dbf'))
            gdf = gdf.merge(df_csv, on=parcel_id_field, how="left", suffixes=('', '_csv'))
            
            # Remove duplicates caused by multiple CSV records per parcel (e.g., apartment units)
            # Keep the first occurrence for each unique HANDLE (parcel geometry)
            initial_count = len(gdf)
            gdf = gdf.drop_duplicates(subset=[parcel_id_field], keep='first')
            dedup_count = len(gdf)
            
            print(f"📊 Merged data: {initial_count} records -> {dedup_count} unique parcels ({initial_count - dedup_count} duplicates removed)")
            
        except Exception as e:
            print(f"❌ Error loading city data: {e}")
            return [], {}
        
        # Apply record limit
        if self.limit_records:
            gdf = gdf.head(self.limit_records)
            gdf_original = gdf_original.head(self.limit_records)
            print(f"📊 Limited to {len(gdf)} records for {self.dataset_size} dataset")
        
        # PERFORMANCE OPTIMIZATION: Batch transform all geometries to WGS84 at once
        print("🔄 Batch transforming city geometries to WGS84...")
        if gdf_original.crs and gdf_original.crs.to_epsg() != 4326:
            gdf_wgs84 = gdf_original.to_crs(epsg=4326)
        else:
            gdf_wgs84 = gdf_original.copy()
        
        # Batch calculate centroids in projected CRS for accuracy, then transform to WGS84
        print("🎯 Calculating centroids...")
        if gdf.crs and gdf.crs.to_epsg() != 4326:
            # Use UTM projection for accurate centroid calculation
            centroids_utm = gdf.geometry.centroid
            centroids_gdf = gpd.GeoDataFrame({'geometry': centroids_utm}, crs=gdf.crs)
            centroids_wgs84 = centroids_gdf.to_crs(epsg=4326)
            centroids = centroids_wgs84.geometry
        else:
            # Already in WGS84, but warn about accuracy
            centroids = gdf_wgs84.geometry.centroid
        
        print(f"⚙️ Processing {len(gdf)} city parcels...")
        results = []
        geometry_data = {}
        
        for idx, (_, row) in enumerate(gdf.iterrows()):
            if idx % 5000 == 0 and idx > 0:
                print(f"   ⚙️ Processed {idx:,}/{len(gdf):,} city parcels...")
                
            parcel_id = str(row.get(parcel_id_field, "")).strip()
            if not parcel_id:
                continue
                
            # Use pre-transformed geometry (much faster)
            wgs84_geom = gdf_wgs84.iloc[idx].geometry
            geometry_data[parcel_id] = self.extract_parcel_geometry(wgs84_geom, already_transformed=True)
            
            # Use pre-calculated centroid (much faster)
            centroid = centroids.iloc[idx]
            lat, lng = centroid.y, centroid.x
            
            # Get address data
            raw_street_address = self.get_field_value(row, "city", "address", "street_primary", "")
            full_street_address = str(raw_street_address).strip()
            zip_code_raw = str(self.get_field_value(row, "city", "address", "zip", "")).strip()
            zip_code_raw = re.sub(r"\.0$", "", zip_code_raw)  # Remove .0 from float zips
            
            if not full_street_address or full_street_address.lower() in ['nan', 'none', 'null']:
                continue
                
            # Standardize address
            raw_full_address = f"{full_street_address}, St. Louis, MO {zip_code_raw}"
            standardized_address = self.standardize_address(raw_full_address, default_city="St. Louis")
            
            if not standardized_address:
                continue
            
            # Calculate property metrics
            land_area = self.safe_to_numeric(row.get("landarea"), 0)
            building_sqft = self.safe_to_numeric(self.get_field_value(row, "city", "building", "area"), 0)
            
            prop_class_code = self.get_field_value(row, "city", "property_class", None)
            property_type = self.classify_property(prop_class_code, "city")
            
            est_landscapable_area = self.calculate_landscapable_area(land_area, building_sqft, property_type)
            
            # For Document Mode, we only need lightweight search data
            results.append({
                "id": parcel_id,
                "full_address": standardized_address,
                "latitude": round(lat, 6),
                "longitude": round(lng, 6),
                "region": "St. Louis City",
                # Additional data for intermediate files
                "original_parcel_id": parcel_id,
                "calc": {
                    "landarea_sqft": land_area,
                    "building_sqft": building_sqft,
                    "estimated_landscapable_area_sqft": est_landscapable_area,
                    "property_type": property_type
                },
                "owner": {
                    "name": self.get_field_value(row, "city", "owner", "name", "")
                },
                "assessment": {
                    "total": self.safe_to_numeric(self.get_field_value(row, "city", "assessment", "total"), 0),
                    "land": self.safe_to_numeric(self.get_field_value(row, "city", "assessment", "land"), 0),
                    "improvement": self.safe_to_numeric(self.get_field_value(row, "city", "assessment", "improvement"), 0)
                }
            })
            
        print(f"✅ Processed {len(results)} city records")
        return results, geometry_data
    
    def process_county_data(self) -> tuple:
        """Process St. Louis County shapefile data"""
        print("🏘️ Processing St. Louis County shapefiles...")
        
        # Use actual shapefile directory, not temp directory
        base_dir = Path("/Users/duebelbytes/Sites/land-estimator/src/data/saint_louis_county/shapefiles")
        required_files = {
            "shp": base_dir / "Parcels_Current.shp",
            "dbf": base_dir / "Parcels_Current.dbf"
        }
        
        missing_files = [name for name, path in required_files.items() if not path.exists()]
        if missing_files:
            print(f"❌ Missing county files: {missing_files}")
            print(f"📂 Looking in: {base_dir}")
            return [], {}
            
        try:
            # Load shapefile
            gdf = gpd.read_file(required_files["shp"])
            print(f"📊 Loaded {len(gdf)} parcels from county shapefile")
            
            # Set CRS if missing
            if gdf.crs is None:
                gdf = gdf.set_crs(epsg=26916)  # Missouri State Plane
                
            # Store original geometry for centroid calculation
            gdf_original = gdf.copy()
                
            # Transform and calculate area
            gdf = gdf.to_crs(epsg=26915)
            gdf["landarea"] = gdf.geometry.area * 10.7639
            
        except Exception as e:
            print(f"❌ Error loading county data: {e}")
            return [], {}
        
        if self.limit_records:
            gdf = gdf.head(self.limit_records)
            gdf_original = gdf_original.head(self.limit_records)
            print(f"📊 Limited to {len(gdf)} records for {self.dataset_size} dataset")
        
        # PERFORMANCE OPTIMIZATION: Batch transform all geometries to WGS84 at once
        print("🔄 Batch transforming county geometries to WGS84...")
        if gdf_original.crs and gdf_original.crs.to_epsg() != 4326:
            gdf_wgs84 = gdf_original.to_crs(epsg=4326)
        else:
            gdf_wgs84 = gdf_original.copy()
        
        # Batch calculate centroids in projected CRS for accuracy, then transform to WGS84
        print("🎯 Calculating centroids...")
        if gdf.crs and gdf.crs.to_epsg() != 4326:
            # Use UTM projection for accurate centroid calculation
            centroids_utm = gdf.geometry.centroid
            centroids_gdf = gpd.GeoDataFrame({'geometry': centroids_utm}, crs=gdf.crs)
            centroids_wgs84 = centroids_gdf.to_crs(epsg=4326)
            centroids = centroids_wgs84.geometry
        else:
            # Already in WGS84, but warn about accuracy
            centroids = gdf_wgs84.geometry.centroid
        
        print(f"⚙️ Processing {len(gdf)} county parcels...")
        results = []
        geometry_data = {}
        parcel_id_field = self.field_mappings["county"]["parcel_id"]
        
        for idx, (_, row) in enumerate(gdf.iterrows()):
            if idx % 5000 == 0 and idx > 0:
                print(f"   ⚙️ Processed {idx:,}/{len(gdf):,} county parcels...")
                
            parcel_id = str(row.get(parcel_id_field, "")).strip()
            if not parcel_id:
                continue
                
            # Use pre-transformed geometry (much faster)
            wgs84_geom = gdf_wgs84.iloc[idx].geometry
            geometry_data[parcel_id] = self.extract_parcel_geometry(wgs84_geom, already_transformed=True)
            
            # Get address data
            raw_address = str(self.get_field_value(row, "county", "address", "full", "")).strip()
            raw_zip = str(self.get_field_value(row, "county", "address", "zip", "")).strip()
            raw_municipality = str(self.get_field_value(row, "county", "address", "municipality", "")).strip().title()
            
            if not raw_address or raw_address.lower() in ['nan', 'none', 'null']:
                continue
                
            city_to_use = raw_municipality or "St. Louis County"
            if city_to_use.upper() == "UNINCORPORATED":
                city_to_use = "St. Louis County (Unincorporated)"
                
            zip_to_use = raw_zip if raw_zip and len(raw_zip) == 5 else "63105"
                
            full_address_for_std = f"{raw_address}, {city_to_use}, MO {zip_to_use}"
            standardized_address = self.standardize_address(
                full_address_for_std,
                default_city=city_to_use,
                default_state="MO",
                default_zip=zip_to_use
            )
            
            if not standardized_address:
                continue
                
            # Use pre-calculated centroid (much faster)
            centroid = centroids.iloc[idx]
            lat, lng = centroid.y, centroid.x
            
            # Calculate property metrics
            land_area = self.safe_to_numeric(row.get("landarea"), 0)
            building_sqft = self.safe_to_numeric(self.get_field_value(row, "county", "building", "area"), 0)
            
            prop_class_code = self.get_field_value(row, "county", "property_class", None)
            property_type = self.classify_property(prop_class_code, "county")
            
            est_landscapable_area = self.calculate_landscapable_area(land_area, building_sqft, property_type)
            
            results.append({
                "id": parcel_id,
                "full_address": standardized_address,
                "latitude": round(lat, 6),
                "longitude": round(lng, 6),
                "region": raw_municipality.title() if raw_municipality else "St. Louis County",
                # Additional data for intermediate files
                "original_parcel_id": parcel_id,
                "calc": {
                    "landarea_sqft": land_area,
                    "building_sqft": building_sqft,
                    "estimated_landscapable_area_sqft": est_landscapable_area,
                    "property_type": property_type
                },
                "owner": {
                    "name": self.get_field_value(row, "county", "owner", "name", "")
                },
                "assessment": {
                    "total": self.safe_to_numeric(self.get_field_value(row, "county", "assessment", "total"), 0),
                    "land": self.safe_to_numeric(self.get_field_value(row, "county", "assessment", "land"), 0),
                    "improvement": self.safe_to_numeric(self.get_field_value(row, "county", "assessment", "improvement"), 0)
                }
            })
            
        print(f"✅ Processed {len(results)} county records")
        return results, geometry_data


class DocumentModePipeline:
    """Document Mode Pipeline - Clean Implementation"""
    
    def __init__(self, dataset_size: str = "small", version: str = ""):
        self.dataset_size = dataset_size
        self.version_suffix = f"_{version}" if version else ""
        
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.scripts_dir = Path(__file__).parent
        
        # Persistent data directories (not cleaned up) - under /src/data
        self.data_dir = self.project_root / "src" / "data" / "tmp"
        self.temp_raw_dir = self.data_dir / "raw"
        self.temp_cdn_dir = self.data_dir / "cdn"
        
        # Temporary directory for document files (cleaned up)
        self.temp_dir = self.scripts_dir / "temp"
        
        # Clean up any existing temp directories
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
        
        # Create directories
        self.temp_raw_dir.mkdir(parents=True, exist_ok=True)
        self.temp_cdn_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize shapefile processor
        self.shapefile_processor = ShapefileProcessor(self.temp_raw_dir, dataset_size)
        
        # Stats tracking
        self.stats = {
            "start_time": datetime.now(),
            "dataset_size": dataset_size,
            "files_created": [],
            "files_uploaded": [],
            "errors": []
        }
        
        print(f"🚀 Document Mode Pipeline initialized")
        print(f"📊 Dataset size: {dataset_size}")
        print(f"📂 Data directory: {self.data_dir}")
        print(f"📂 Temp directory: {self.temp_dir}")
    
    def step_1_process_regional_data(self):
        """Step 1: Process regional shapefile data"""
        print("\n" + "="*60)
        print("1️⃣ PROCESSING REGIONAL SHAPEFILE DATA")
        print("="*60)
        
        # Copy local shapefiles to temp
        self._copy_local_shapefiles()
        
        # Process data
        city_data, city_geometry = self.shapefile_processor.process_city_data()
        county_data, county_geometry = self.shapefile_processor.process_county_data()
        
        return city_data, county_data, city_geometry, county_geometry
    
    def step_2_create_intermediate_files(self, city_data, county_data, city_geometry, county_geometry):
        """Step 2: Create regional intermediate files for landscape calculations"""
        print("\n" + "="*60)
        print("2️⃣ CREATING INTERMEDIATE FILES FOR LANDSCAPE CALCULATIONS")
        print("="*60)
        
        intermediate_files = []
        
        # Create regional address index files
        if city_data:
            city_address_index = [
                {
                    "display_name": record["full_address"],
                    "parcel_id": record["id"],
                    "region": record["region"],
                    "latitude": record["latitude"],
                    "longitude": record["longitude"]
                }
                for record in city_data
            ]
            
            city_address_file = self.temp_raw_dir / "stl_city-address_index.json"
            with open(city_address_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "addresses": city_address_index,
                    "metadata": {
                        "region": "St. Louis City",
                        "total_addresses": len(city_address_index),
                        "build_time": datetime.now().isoformat()
                    }
                }, f, separators=(',', ':'))
            
            intermediate_files.append(city_address_file)
            print(f"✅ Created stl_city-address_index.json: {len(city_address_index)} addresses")
        
        if county_data:
            county_address_index = [
                {
                    "display_name": record["full_address"],
                    "parcel_id": record["id"],
                    "region": record["region"],
                    "latitude": record["latitude"],
                    "longitude": record["longitude"]
                }
                for record in county_data
            ]
            
            county_address_file = self.temp_raw_dir / "stl_county-address_index.json"
            with open(county_address_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "addresses": county_address_index,
                    "metadata": {
                        "region": "St. Louis County",
                        "total_addresses": len(county_address_index),
                        "build_time": datetime.now().isoformat()
                    }
                }, f, separators=(',', ':'))
            
            intermediate_files.append(county_address_file)
            print(f"✅ Created stl_county-address_index.json: {len(county_address_index)} addresses")
        
        # Create regional parcel metadata files
        if city_data:
            city_metadata = {
                record["original_parcel_id"]: {
                    "id": record["original_parcel_id"],
                    "primary_full_address": record["full_address"],
                    "latitude": record["latitude"],
                    "longitude": record["longitude"],
                    "region": record["region"],
                    "calc": record["calc"],
                    "owner": record["owner"],
                    "assessment": record["assessment"]
                }
                for record in city_data
            }
            
            city_metadata_file = self.temp_raw_dir / "stl_city-parcel_metadata.json"
            with open(city_metadata_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "parcels": city_metadata,
                    "metadata": {
                        "region": "St. Louis City",
                        "total_parcels": len(city_metadata),
                        "build_time": datetime.now().isoformat()
                    }
                }, f, separators=(',', ':'))
            
            intermediate_files.append(city_metadata_file)
            print(f"✅ Created stl_city-parcel_metadata.json: {len(city_metadata)} parcels")
        
        if county_data:
            county_metadata = {
                record["original_parcel_id"]: {
                    "id": record["original_parcel_id"],
                    "primary_full_address": record["full_address"],
                    "latitude": record["latitude"],
                    "longitude": record["longitude"],
                    "region": record["region"],
                    "calc": record["calc"],
                    "owner": record["owner"],
                    "assessment": record["assessment"]
                }
                for record in county_data
            }
            
            county_metadata_file = self.temp_raw_dir / "stl_county-parcel_metadata.json"
            with open(county_metadata_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "parcels": county_metadata,
                    "metadata": {
                        "region": "St. Louis County",
                        "total_parcels": len(county_metadata),
                        "build_time": datetime.now().isoformat()
                    }
                }, f, separators=(',', ':'))
            
            intermediate_files.append(county_metadata_file)
            print(f"✅ Created stl_county-parcel_metadata.json: {len(county_metadata)} parcels")
        
        # Create regional parcel geometry files
        if city_geometry:
            city_geometry_file = self.temp_raw_dir / "stl_city-parcel_geometry.json"
            with open(city_geometry_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "geometries": city_geometry,
                    "metadata": {
                        "region": "St. Louis City",
                        "total_geometries": len(city_geometry),
                        "build_time": datetime.now().isoformat()
                    }
                }, f, separators=(',', ':'))
            
            intermediate_files.append(city_geometry_file)
            print(f"✅ Created stl_city-parcel_geometry.json: {len(city_geometry)} geometries")
        
        if county_geometry:
            county_geometry_file = self.temp_raw_dir / "stl_county-parcel_geometry.json"
            with open(county_geometry_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "geometries": county_geometry,
                    "metadata": {
                        "region": "St. Louis County",
                        "total_geometries": len(county_geometry),
                        "build_time": datetime.now().isoformat()
                    }
                }, f, separators=(',', ':'))
            
            intermediate_files.append(county_geometry_file)
            print(f"✅ Created stl_county-parcel_geometry.json: {len(county_geometry)} geometries")
        
        return intermediate_files
    
    def step_3_compress_intermediate_files(self, intermediate_files):
        """Step 3: Compress parcel metadata and geometry files for cold storage"""
        print("\n" + "="*60)
        print("3️⃣ COMPRESSING INTERMEDIATE FILES FOR COLD STORAGE")
        print("="*60)
        
        compressed_files = []
        
        for file_path in intermediate_files:
            # Only compress metadata and geometry files, not address index
            if "parcel_metadata" in file_path.name or "parcel_geometry" in file_path.name:
                compressed_path = self.temp_cdn_dir / f"{file_path.name}.gz"
                
                print(f"🗜️ Compressing {file_path.name} -> {compressed_path.name}")
                
                with open(file_path, 'rb') as f_in:
                    with gzip.open(compressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                compressed_files.append(compressed_path)
                
                # Get compression stats
                original_size = file_path.stat().st_size
                compressed_size = compressed_path.stat().st_size
                ratio = (1 - compressed_size / original_size) * 100
                
                print(f"✅ Compressed {file_path.name}: {original_size:,} -> {compressed_size:,} bytes ({ratio:.1f}% reduction)")
        
        return compressed_files
    
    def step_4_upload_compressed_files(self, compressed_files):
        """Step 4: Upload compressed intermediate files to /cdn/ for cold storage"""
        print("\n" + "="*60)
        print("4️⃣ UPLOADING COMPRESSED FILES TO CDN")
        print("="*60)
        
        if not compressed_files:
            print("⚠️ No compressed files to upload")
            return True
        
        upload_success = True
        
        for file_path in compressed_files:
            blob_path = f"cdn/{file_path.name}"
            print(f"📤 Uploading {file_path.name} to {blob_path}")
            
            try:
                # Use upload_blob.js script, run from project root
                result = subprocess.run([
                    "node", 
                    str(Path("src/config/scripts/upload_blob.js")), 
                    str(file_path), 
                    blob_path
                ], capture_output=True, text=True, check=True, cwd=str(self.project_root))
                
                self.stats["files_uploaded"].append(blob_path)
                print(f"✅ Uploaded {blob_path}")
                
            except subprocess.CalledProcessError as e:
                print(f"❌ Failed to upload {file_path.name}: {e.stderr}")
                self.stats["errors"].append(f"Upload failed: {file_path.name}")
                upload_success = False
        
        return upload_success
    
    def step_5_create_document_files(self, city_data, county_data):
        """Step 5: Create minimal document.json files for FlexSearch Document Mode"""
        print("\n" + "="*60)
        print("5️⃣ CREATING DOCUMENT FILES FOR HOT SEARCH")
        print("="*60)
        
        document_files = []
        
        # Create city document file
        if city_data:
            city_doc_data = [
                {
                    "id": record["id"],
                    "full_address": record["full_address"],
                    "latitude": record["latitude"],
                    "longitude": record["longitude"],
                    "region": record["region"]
                }
                for record in city_data
            ]
            
            city_doc_file = self.temp_dir / "stl_city-document.json"
            with open(city_doc_file, 'w', encoding='utf-8') as f:
                json.dump(city_doc_data, f, separators=(',', ':'))
            
            document_files.append(city_doc_file)
            print(f"✅ Created stl_city-document.json: {len(city_doc_data)} addresses")
        
        # Create county document file
        if county_data:
            county_doc_data = [
                {
                    "id": record["id"],
                    "full_address": record["full_address"],
                    "latitude": record["latitude"],
                    "longitude": record["longitude"],
                    "region": record["region"]
                }
                for record in county_data
            ]
            
            county_doc_file = self.temp_dir / "stl_county-document.json"
            with open(county_doc_file, 'w', encoding='utf-8') as f:
                json.dump(county_doc_data, f, separators=(',', ':'))
            
            document_files.append(county_doc_file)
            print(f"✅ Created stl_county-document.json: {len(county_doc_data)} addresses")
        
        # Create latest.json manifest
        if document_files:
            regions_array = []
            if city_data:
                regions_array.append({
                    "region": "stl_city",
                    "version": "1.0.0",
                    "document_file": "stl_city-document.json",
                    "lookup_file": "stl_city-document.json"  # Same file for Document Mode
                })
            if county_data:
                regions_array.append({
                    "region": "stl_county", 
                    "version": "1.0.0",
                    "document_file": "stl_county-document.json",
                    "lookup_file": "stl_county-document.json"  # Same file for Document Mode
                })
            
            latest_data = {
                "regions": regions_array,
                "metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "version": "1.0.0",
                    "total_regions": len(regions_array),
                    "source": "Document Mode Pipeline"
                }
            }
            
            latest_file = self.temp_dir / "latest.json"
            with open(latest_file, 'w', encoding='utf-8') as f:
                json.dump(latest_data, f, indent=2)
            
            document_files.append(latest_file)
            print(f"✅ Created latest.json manifest")
        
        return document_files
    
    def step_6_upload_document_files(self, document_files):
        """Step 6: Upload document files to public/search/ for hot search"""
        print("\n" + "="*60)
        print("6️⃣ UPLOADING DOCUMENT FILES TO PUBLIC/SEARCH")
        print("="*60)
        
        if not document_files:
            print("⚠️ No document files to upload")
            return True
        
        # Create public/search directory
        public_search_dir = self.project_root / "public" / "search"
        public_search_dir.mkdir(parents=True, exist_ok=True)
        
        upload_success = True
        
        for file_path in document_files:
            # Copy to public/search/
            dest_path = public_search_dir / file_path.name
            print(f"📁 Copying {file_path.name} to public/search/")
            
            try:
                shutil.copy2(file_path, dest_path)
                print(f"✅ Copied {file_path.name} to public/search/")
                
                # Also upload to Firebase for backup
                try:
                    result = subprocess.run([
                        "node", 
                        str(Path("src/config/scripts/upload_firebase.js")), 
                        "upload",
                        str(file_path), 
                        f"search/{file_path.name}"
                    ], capture_output=True, text=True, check=True, cwd=str(self.project_root))
                    
                    print(f"✅ Uploaded {file_path.name} to Firebase backup")
                    
                except subprocess.CalledProcessError as e:
                    print(f"⚠️ Firebase upload failed for {file_path.name}: {e.stderr}")
                    # Don't fail the pipeline for Firebase issues
                    
            except Exception as e:
                print(f"❌ Failed to copy {file_path.name}: {e}")
                self.stats["errors"].append(f"Copy failed: {file_path.name}")
                upload_success = False
        
        return upload_success
    
    def step_7_cleanup(self):
        """Step 7: Clean up temporary files (keep persistent data files)"""
        print("\n" + "="*60)
        print("7️⃣ CLEANING UP TEMPORARY FILES")
        print("="*60)
        
        try:
            if self.temp_dir.exists():
                print(f"🗑️ Removing temp directory: {self.temp_dir}")
                shutil.rmtree(self.temp_dir)
                print("✅ Successfully cleaned up temp directory")
            
            print(f"📁 Persistent data files kept in: {self.data_dir}")
            return True
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
            self.stats["errors"].append(f"Cleanup error: {e}")
            return False
    
    def _copy_local_shapefiles(self):
        """Copy local shapefiles to temp directory for processing"""
        print("📁 Copying local shapefiles to temp directory...")
        
        local_shapefiles_dir = self.project_root / "src" / "data"
        
        # Copy city shapefiles
        city_local = local_shapefiles_dir / "saint_louis_city" / "shapefiles"
        city_temp = self.temp_raw_dir / "shapefiles" / "saint-louis-city"
        
        if city_local.exists():
            city_temp.mkdir(parents=True, exist_ok=True)
            for file_path in city_local.glob("*"):
                if file_path.is_file():
                    shutil.copy2(file_path, city_temp / file_path.name)
            print(f"✅ Copied city shapefiles to {city_temp}")
        
        # Copy county shapefiles
        county_local = local_shapefiles_dir / "saint_louis_county" / "shapefiles"
        county_temp = self.temp_raw_dir / "shapefiles" / "saint-louis-county"
        
        if county_local.exists():
            county_temp.mkdir(parents=True, exist_ok=True)
            for file_path in county_local.glob("*"):
                if file_path.is_file():
                    shutil.copy2(file_path, county_temp / file_path.name)
            print(f"✅ Copied county shapefiles to {county_temp}")
    
    def run_pipeline(self):
        """Run the complete Document Mode pipeline"""
        print("🚀 Starting Document Mode Pipeline")
        print("="*60)
        
        try:
            # Step 1: Process regional data
            city_data, county_data, city_geometry, county_geometry = self.step_1_process_regional_data()
            
            # Step 2: Create intermediate files
            intermediate_files = self.step_2_create_intermediate_files(
                city_data, county_data, city_geometry, county_geometry
            )
            
            # Step 3: Compress intermediate files
            compressed_files = self.step_3_compress_intermediate_files(intermediate_files)
            
            # Step 4: Upload compressed files to CDN
            upload_success = self.step_4_upload_compressed_files(compressed_files)
            
            # Step 5: Create document files
            document_files = self.step_5_create_document_files(city_data, county_data)
            
            # Step 6: Upload document files to public/search
            doc_upload_success = self.step_6_upload_document_files(document_files)
            
            # Step 7: Cleanup
            cleanup_success = self.step_7_cleanup()
            
            # Final report
            self.generate_report()
            
            success = upload_success and doc_upload_success and cleanup_success
            return success
            
        except Exception as e:
            print(f"\n❌ Pipeline failed: {e}")
            self.stats["errors"].append(f"Pipeline failure: {e}")
            return False
    
    def generate_report(self):
        """Generate final pipeline report"""
        print("\n" + "="*60)
        print("📊 PIPELINE EXECUTION REPORT")
        print("="*60)
        
        duration = datetime.now() - self.stats["start_time"]
        
        print(f"⏱️ Total runtime: {duration}")
        print(f"📊 Dataset size: {self.stats['dataset_size']}")
        print(f"📁 Files created: {len(self.stats['files_created'])}")
        print(f"📤 Files uploaded: {len(self.stats['files_uploaded'])}")
        
        if self.stats["errors"]:
            print(f"\n❌ Errors encountered: {len(self.stats['errors'])}")
            for error in self.stats["errors"]:
                print(f"   • {error}")
        
        if not self.stats["errors"]:
            print("\n✅ Pipeline completed successfully!")
        else:
            print("\n⚠️ Pipeline completed with errors")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Document Mode Ingest Pipeline")
    parser.add_argument(
        "--dataset-size",
        choices=["small", "medium", "large"],
        default="large",
        help="Dataset size: small (5000), medium (25000), large (all records)"
    )
    parser.add_argument(
        "--version",
        default="",
        help="Version suffix for uploaded files"
    )
    
    args = parser.parse_args()
    
    print("🌟 Document Mode Ingest Pipeline")
    print("="*50)
    print(f"📊 Dataset size: {args.dataset_size}")
    print(f"📦 Version: {args.version or 'default'}")
    print("="*50)
    
    pipeline = DocumentModePipeline(dataset_size=args.dataset_size, version=args.version)
    success = pipeline.run_pipeline()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
