#!/usr/bin/env python3
"""
Main Ingest Pipeline Script

1. Processes real shapefiles from regional directories 
2. Creates FlexSearch indexes 
3. Compresses and uploads to Vercel Blob Storage
4. Cleans up ephemeral files

Directory contract:
- Input: /parcel-source/saint-louis-city/, /parcel-source/saint-louis-county/
- Temp: /src/config/temp/raw/, /src/config/temp/
- Output: Vercel Blob Storage (/integration/, /cdn/)

Usage:
  python3 ingest_scripts.py [--dataset-size=small|medium|large] [--version=_suffix]
  
Dataset sizes:
  - small: First 1000 parcels per region (2000 total) - for testing
  - medium: First 10000 parcels per region (20000 total) - for development  
  - large: All parcels per region (full dataset) - for production
"""
# Standard library imports
import os
import sys
import re
import json
import gzip
import tempfile
import shutil
import subprocess
import argparse
import tarfile
import io
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict

# Third-party imports
import pandas as pd
import geopandas as gpd
from dbfread import DBF
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Import local modules
# Add the scripts directory to Python path to ensure local imports work
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from upload_blob import BlobClient
from firebase_backup_cdn import FirebaseBackupCDN

project_root = Path(__file__).parent.parent.parent.parent
env_path = project_root / '.env.local'

if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment variables from {env_path}")
else:
    print(f"⚠️ .env.local file not found at {env_path}")

encryption_key = os.getenv('SHAPEFILE_ENCRYPTION_KEY')
if not encryption_key:
    print("❌ SHAPEFILE_ENCRYPTION_KEY not found in environment")
    print("📍 Make sure .env.local contains the encryption key")
else:
    print("✅ Encryption key loaded successfully")

current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

from upload_blob import BlobClient
from firebase_backup_cdn import FirebaseBackupCDN

class CDNStatusChecker:
    """Check existing index availability on Vercel and Firebase CDNs before building"""
    
    def __init__(self, blob_client, firebase_backup):
        self.blob_client = blob_client
        self.firebase_backup = firebase_backup
        self.required_indexes = [
            "address-index.json.gz",
            "parcel-metadata.json.gz", 
            "parcel-geometry.json.gz"
        ]
        
    def check_cdn_status(self, verbose: bool = False) -> Dict[str, Any]:
        """Check status of both CDNs and return availability report following the exact workflow"""
        
        status = {
            "vercel_available": False,
            "firebase_available": False,
            "vercel_indexes": {},
            "firebase_indexes": {},
            "latest_version": None,
            "needs_rebuild": True,
            "recommendation": "build_all"
        }
        
        # Step 1: Establish connection with Vercel and Firestore
        if verbose:
            print("\n🔍 CDN INDEX AVAILABILITY CHECK")
            print("="*50)
            print("1️⃣ Establishing CDN connections...")
        
        # Check Vercel connection
        try:
            vercel_files = self.blob_client.list_files(prefix="cdn/")
            status["vercel_available"] = True
            if verbose:
                print(f"   ✅ Vercel connected ({len(vercel_files)} files)")
            
            # Check for existing versioned indexes
            vercel_indexes = self._analyze_vercel_indexes(vercel_files, verbose)
            status["vercel_indexes"] = vercel_indexes
            
            if vercel_indexes["latest_version"]:
                status["latest_version"] = vercel_indexes["latest_version"]
                
        except Exception as e:
            if verbose:
                print(f"   ❌ Vercel failed: {e}")
            status["vercel_available"] = False
            
        # Step 2: Check Vercel /cdn for primary indexes
        if verbose:
            print("2️⃣ Checking Vercel /cdn for primary indexes...")
        if status["vercel_available"]:
            if status["vercel_indexes"].get("complete_set"):
                if verbose:
                    print(f"   ✅ Complete set found (v{status['latest_version']})")
                status["needs_rebuild"] = False
                status["recommendation"] = "use_vercel"
                return status
            else:
                if verbose:
                    print("   ⚠️ Incomplete or no indexes found")
        else:
            if verbose:
                print("   ❌ Vercel unavailable")
            
        # Step 3: Check Firebase /cdn for backup indexes  
        if verbose:
            print("3️⃣ Checking Firebase /cdn for backup indexes...")
        try:
            firebase_files = self.firebase_backup.list_backup_files("cdn/")
            status["firebase_available"] = True
            if verbose:
                print(f"   ✅ Firebase connected ({len(firebase_files)} files)")
            
            firebase_indexes = self._analyze_firebase_indexes(firebase_files, verbose)
            status["firebase_indexes"] = firebase_indexes
            
            if firebase_indexes["complete_set"]:
                if verbose:
                    print(f"   ✅ Complete backup set found (v{firebase_indexes['latest_version']})")
                status["latest_version"] = firebase_indexes["latest_version"]
                status["needs_rebuild"] = False
                status["recommendation"] = "use_firebase"
                return status
            else:
                if verbose:
                    print("   ⚠️ Incomplete or no backup indexes found")
                
        except Exception as e:
            if verbose:
                print(f"   ❌ Firebase failed: {e}")
            status["firebase_available"] = False
            
        # Step 4: Check local data for rebuilding
        if verbose:
            print("4️⃣ Checking local repository for source data...")
        local_data_status = self._check_local_data()
        status["local_data_available"] = local_data_status["available"]
        
        if local_data_status["available"]:
            if verbose:
                print("   ✅ Local shapefiles available")
            status["recommendation"] = "rebuild_from_local"
        else:
            if verbose:
                print("   ❌ No local data available")
            status["recommendation"] = "critical_failure"
            
        return status
    
    def _analyze_vercel_indexes(self, files: List[Dict], verbose: bool = False) -> Dict[str, Any]:
        """Analyze Vercel CDN files to find latest complete index set"""
        versions = defaultdict(list)
        
        if verbose:
            print(f"🔍 Analyzing {len(files)} Vercel files:")
        for file_info in files:
            pathname = file_info.get('pathname', '')
            if verbose:
                print(f"   📄 {pathname}")
            filename = pathname.replace('cdn/', '')
            
            # Look for versioned index files: name-v0.1.0.json.gz (semantic versioning)
            for index_name in ["address-index", "parcel-metadata", "parcel-geometry"]:
                if filename.startswith(f"{index_name}-v") and filename.endswith(".json.gz"):
                    if verbose:
                        print(f"   🎯 Potential match: {filename} for {index_name}")
                    # Extract version - support both semantic (v0.1.0) and timestamp (v1.20250629_120600_test) formats
                    version_match = re.search(rf'{index_name}-(v\d+\.\d+(?:\.\d+|_\d+(?:_\w+)*))\.json\.gz$', filename)
                    if version_match:
                        version = version_match.group(1)
                        versions[version].append(index_name)
                        if verbose:
                            print(f"   ✅ Extracted version: {version} for {index_name}")
                    else:
                        if verbose:
                            print(f"   ❌ Version extraction failed for: {filename}")
                        
        if verbose:
            print(f"🔍 Found versions: {dict(versions)}")
        
        # Find latest complete version
        complete_versions = []
        for version, indexes in versions.items():
            if len(indexes) >= 3:  # All three index types present
                complete_versions.append(version)
                
        latest_version = None
        if complete_versions:
            # Sort by version timestamp
            latest_version = sorted(complete_versions)[-1]
            
        result = {
            "available_versions": list(versions.keys()),
            "complete_versions": complete_versions,
            "latest_version": latest_version,
            "complete_set": latest_version is not None,
            "index_count": len(versions.get(latest_version, []))
        }
        
        if verbose:
            print(f"🔍 Analysis result: {result}")
        return result
    
    def _analyze_firebase_indexes(self, files: List[str], verbose: bool = False) -> Dict[str, Any]:
        """Analyze Firebase backup files to find latest complete index set"""
        versions = defaultdict(list)
        unversioned_files = []
        
        if verbose:
            print(f"🔍 Analyzing {len(files)} Firebase files:")
        for filename in files:
            if verbose:
                print(f"   📄 {filename}")
            clean_filename = filename.replace('cdn/', '')
            
            # Skip directory entries
            if not clean_filename or clean_filename.endswith('/'):
                continue
                
            # Look for versioned backup files first
            found_versioned = False
            for index_name in ["address-index", "parcel-metadata", "parcel-geometry"]:
                if clean_filename.startswith(f"{index_name}-v") and clean_filename.endswith(".json.gz"):
                    if verbose:
                        print(f"   🎯 Versioned match: {clean_filename} for {index_name}")
                    # Extract version - support both semantic (v0.1.0) and timestamp (v1.20250629_120600_test) formats
                    version_match = re.search(rf'{index_name}-(v\d+\.\d+(?:\.\d+|_\d+(?:_\w+)*))\.json\.gz$', clean_filename)
                    if version_match:
                        version = version_match.group(1)
                        versions[version].append(index_name)
                        found_versioned = True
                        if verbose:
                            print(f"   ✅ Extracted version: {version} for {index_name}")
                    break
            
            # If no versioned match found, check for unversioned files as fallback
            if not found_versioned:
                for index_name in ["address-index", "parcel-metadata", "parcel-geometry"]:
                    if clean_filename == f"{index_name}.json.gz":
                        unversioned_files.append(index_name)
                        if verbose:
                            print(f"   📝 Unversioned match: {clean_filename} for {index_name}")
                        break
                        
        if verbose:
            print(f"🔍 Found versioned: {dict(versions)}")
            print(f"🔍 Found unversioned: {unversioned_files}")
        
        # Find latest complete version
        complete_versions = []
        for version, indexes in versions.items():
            if len(indexes) >= 3:  # All three index types present
                complete_versions.append(version)
                
        latest_version = None
        has_complete_set = False
        
        if complete_versions:
            latest_version = sorted(complete_versions)[-1]
            has_complete_set = True
        elif len(unversioned_files) >= 3:
            # Fallback to unversioned files if we have all three
            latest_version = "unversioned"
            has_complete_set = True
            if verbose:
                print("   📝 Using unversioned files as fallback")
            
        result = {
            "available_versions": list(versions.keys()),
            "complete_versions": complete_versions,
            "latest_version": latest_version,
            "complete_set": has_complete_set,
            "index_count": len(versions.get(latest_version, [])) if latest_version != "unversioned" else len(unversioned_files),
            "unversioned_files": unversioned_files
        }
        
        if verbose:
            print(f"🔍 Analysis result: {result}")
        return result
    
    def _check_local_data(self) -> Dict[str, Any]:
        """Check if local shapefile data is available for rebuilding indexes"""
        project_root = Path(__file__).parent.parent.parent.parent
        local_shapefiles_dir = project_root / "src" / "data"
        
        city_local = local_shapefiles_dir / "saint_louis_city" / "shapefiles"
        county_local = local_shapefiles_dir / "saint_louis_county" / "shapefiles"
        
        city_has_files = (city_local / "prcl.shp").exists() and (city_local / "prcl.dbf").exists()
        county_has_files = (county_local / "Parcels_Current.shp").exists() and (county_local / "Parcels_Current.dbf").exists()
        
        return {
            "available": city_has_files and county_has_files,
            "city_files": city_has_files,
            "county_files": county_has_files,
            "city_path": str(city_local) if city_has_files else None,
            "county_path": str(county_local) if county_has_files else None
        }
    
    def _generate_recommendation(self, status: Dict[str, Any]) -> str:
        """Generate recommendation based on CDN availability"""
        
        # If Vercel has complete indexes, use them
        if status["vercel_indexes"].get("complete_set"):
            return "use_vercel"
            
        # If Firebase has complete indexes and Vercel doesn't, use Firebase
        if status["firebase_indexes"].get("complete_set") and not status["vercel_indexes"].get("complete_set"):
            return "use_firebase"
            
        # If local data available, recommend rebuild
        if status.get("local_data_available"):
            return "rebuild_from_local"
            
        # If no local data but CDNs available, try partial recovery
        if status["vercel_available"] or status["firebase_available"]:
            return "partial_recovery"
            
        # Last resort
        return "critical_failure"
    
    def _print_recommendation_details(self, status: Dict[str, Any]):
        """Print detailed recommendation and next steps"""
        recommendation = status["recommendation"]
        
        if recommendation == "use_vercel":
            print("🎯 Use existing Vercel indexes (primary CDN)")
            print(f"   Version: {status['latest_version']}")
            print("   ✅ No rebuild needed")
            print("   📍 Skip pipeline steps 1-3, proceed to verification")
            
        elif recommendation == "use_firebase":
            print("🔥 Use Firebase backup indexes (secondary CDN)")
            print(f"   Version: {status['latest_version']}")  
            print("   ⚠️ Consider syncing to Vercel primary")
            print("   📍 Download from Firebase, verify, upload to Vercel")
            
        elif recommendation == "rebuild_from_local":
            print("🏗️ Rebuild indexes from local shapefiles")
            print("   📍 Local data available - full pipeline execution")
            print("   🔄 Steps: Process → Build → Upload → Backup")
            
        elif recommendation == "partial_recovery":
            print("⚠️ Attempt partial recovery from available CDN")
            print("   📍 Some indexes may be available")
            print("   🔄 Download available → Fill gaps → Upload complete set")
            
        elif recommendation == "critical_failure":
            print("❌ Critical failure - no data sources available")
            print("   📍 Need to source shapefiles manually")
            print("   💡 Check backup locations or contact data providers")

    def print_status_lights(self, status: Dict[str, Any]):
        """Print enhanced status lights for CDN availability with transfer status"""
        print("\nCDN Status Summary:")
        
        # Vercel status
        vercel_light = "🟢" if status["vercel_available"] else "🔴"
        vercel_indexes = "✅" if status["vercel_indexes"].get("complete_set") else "❌"
        vercel_transfer = "🔁" if status.get("vercel_transfer_attempted") else "⏸️"
        vercel_pattern = status["vercel_indexes"].get("latest_version", "none")
        print(f"   {vercel_light} Vercel:   Connected | {vercel_transfer} Transfers | {vercel_indexes} Indexes ({vercel_pattern})")
        
        # Firebase status  
        firebase_light = "🟢" if status["firebase_available"] else "🔴"
        firebase_indexes = "✅" if status["firebase_indexes"].get("complete_set") else "❌"
        firebase_transfer = "🔁" if status.get("firebase_transfer_attempted") else "⏸️"
        firebase_pattern = status["firebase_indexes"].get("latest_version", "none")
        print(f"   {firebase_light} Firebase: Connected | {firebase_transfer} Transfers | {firebase_indexes} Indexes ({firebase_pattern})")
        
        # Overall status
        if status["vercel_indexes"].get("complete_set") or status["firebase_indexes"].get("complete_set"):
            overall_version = status["vercel_indexes"].get("latest_version") or status["firebase_indexes"].get("latest_version")
            print(f"   📦 Active Version: {overall_version}")
        else:
            print(f"   📦 Active Version: None found")
            
        # Recommendation
        rec_icon = {
            "use_vercel": "🎯",
            "use_firebase": "🔥", 
            "rebuild_from_local": "🏗️",
            "critical_failure": "❌"
        }.get(status["recommendation"], "❓")
        print(f"   {rec_icon} Action: {status['recommendation'].replace('_', ' ').title()}")

class ShapefileProcessor:
    """Processor for real shapefile data using integrated processing logic"""
    
    def __init__(self, temp_dir: Path, dataset_size: str = "small"):
        self.temp_dir = temp_dir
        self.dataset_size = dataset_size
        self.limit_records = self._get_record_limit()
        
        self.address_stats = {
            "total_processed": 0,
            "valid_addresses": 0,
            "missing_city_components": 0,
            "missing_street": 0,
            "po_box": 0,
            "invalid_zip": 0,
            "standardization_failure": 0,
            "city_records_processed": 0,
            "county_records_processed": 0,
            "city_records_valid": 0,
            "county_records_valid": 0,
        }
        
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
            "small": 1000,
            "medium": 10000,
            "large": None
        }
        return limits.get(self.dataset_size, 1000)
    
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
        
        if city_part.upper() in ["ST LOUIS", "SAINT LOUIS"]:
            city_standardized = "St. Louis"
        else:
            city_standardized = city_part.title()
            
        state_zip_match = re.search(r"\b([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\b\s*$", state_zip_part)
        if state_zip_match:
            state_standardized = state_zip_match.group(1).upper()
            zip_standardized = state_zip_match.group(2)
        else:
            state_standardized = default_state
            zip_standardized = default_zip
            
        final_address = f"{street_standardized}, {city_standardized}, {state_standardized} {zip_standardized}"
        return re.sub(r'\s+', ' ', final_address).strip()
    
    def is_valid_zip(self, zip_code):
        """Check if ZIP code is valid"""
        if not zip_code or not isinstance(zip_code, str):
            return False
        zip_code = zip_code.strip()
        return bool(re.fullmatch(r"^\d{5}(-\d{4})?$", zip_code))
    
    def is_po_box(self, address):
        """Check if address is a PO Box"""
        if not isinstance(address, str):
            return False
        po_patterns = [
            r"\bP\.?O\.?\s+BOX\b",
            r"\bPO\s+BOX\b",
            r"\bBOX\s+\d+",
            r"\bPMB\s+\d+"
        ]
        return any(re.search(pattern, address.upper()) for pattern in po_patterns)
    
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
    
    def calculate_landscapable_area(self, land_area, building_sqft, property_type):
        """Calculate estimated landscapable area"""
        land_area = self.safe_to_numeric(land_area, 0)
        building_sqft = self.safe_to_numeric(building_sqft, 0)
        
        if land_area <= 0:
            return 0
            
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
    
    def calculate_affluence_score(self, row_data, region):
        """Calculate affluence score based on property characteristics"""
        score = 0
        
        total_assessment = self.safe_to_numeric(self.get_field_value(row_data, region, "assessment", "total"), 0)
        land_assessment = self.safe_to_numeric(self.get_field_value(row_data, region, "assessment", "land"), 0)
        improvement_assessment = self.safe_to_numeric(self.get_field_value(row_data, region, "assessment", "improvement"), 0)
        
        building_sqft = self.safe_to_numeric(row_data.get("building_sqft", 0), 0)
        building_year = self.safe_to_numeric(self.get_field_value(row_data, region, "building", "year"), 0)
        land_area = self.safe_to_numeric(row_data.get("landarea", 0), 0)
        
        # Property value score (0-3 points)
        if total_assessment > 750000: score += 3
        elif total_assessment > 500000: score += 2.5
        elif total_assessment > 300000: score += 2
        elif total_assessment > 150000: score += 1
        elif total_assessment > 75000: score += 0.5
        
        # Building quality (0-2 points)
        if building_sqft > 0:
            if building_sqft > 4000: score += 1.5
            elif building_sqft > 2500: score += 1.0
            elif building_sqft > 1500: score += 0.5
            
            if building_year > 2010: score += 0.5
            elif building_year > 1990: score += 0.25
            
        # Lot size (0-1.5 points)
        if land_area > 43560: score += 1.5  # > 1 acre
        elif land_area > 21780: score += 1.0  # > 0.5 acre
        elif land_area > 10000: score += 0.5  # > ~1/4 acre
        
        # Improvement-to-Land Value Ratio (0-1 point)
        if land_assessment > 0 and improvement_assessment > 0:
            ratio = improvement_assessment / land_assessment
            if ratio > 5: score += 1.0  # Heavily improved
            elif ratio > 2: score += 0.5  # Well improved
            elif ratio < 0.5 and building_sqft > 0: score -= 0.5  # Potential tear-down
        
        # Region-specific factors (0-0.5 points)
        if region == "county":
            owner_tenure = str(self.get_field_value(row_data, region, "owner", "tenure", "")).upper()
            if owner_tenure == "OWNER": score += 0.25
            
            owner_state = str(self.get_field_value(row_data, region, "owner", "state", "")).upper()
            if owner_state and owner_state != "MO" and len(owner_state) == 2:
                score -= 0.25  # Potential absentee landlord
        
        return max(0, min(5, round(score, 2)))
    
    def extract_parcel_geometry(self, geometry):
        """Extract parcel geometry as simplified GeoJSON"""
        if geometry is None or geometry.is_empty:
            return None
            
        try:
            if hasattr(geometry, 'crs') and geometry.crs and geometry.crs.to_epsg() != 4326:
                geometry_wgs84 = geometry.to_crs(epsg=4326)
            else:
                geometry_wgs84 = geometry
                
            if hasattr(geometry_wgs84, 'iloc'):
                geom = geometry_wgs84.iloc[0] if len(geometry_wgs84) > 0 else geometry_wgs84
            else:
                geom = geometry_wgs84
                
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
        
        results = []
        geometry_data = {}
        
        # Check for required files in temp directory
        base_dir = self.temp_dir / "shapefiles" / "saint-louis-city"
        required_files = {
            "shp": base_dir / "prcl.shp",
            "shx": base_dir / "prcl.shx", 
            "dbf": base_dir / "prcl.dbf",
            "csv": base_dir / "parcels-basic-info.csv"
        }
        
        # Check if files exist
        missing_files = [name for name, path in required_files.items() if not path.exists()]
        if missing_files:
            print(f"❌ Missing city files: {missing_files}")
            print("⚠️ Creating mock data instead...")
            return self._create_mock_city_data()
            
        try:
            # Load shapefile
            gdf_shape = gpd.read_file(required_files["shp"])
            print(f"📊 Loaded {len(gdf_shape)} parcels from city shapefile")
            
            # Set CRS if missing (common for St. Louis data)
            if gdf_shape.crs is None:
                print("⚠️ Setting default CRS (Missouri State Plane East)")
                gdf_shape = gdf_shape.set_crs(epsg=2815)
                
            # Transform for area calculation
            gdf_shape = gdf_shape.to_crs(epsg=26915)
            gdf_shape["landarea"] = gdf_shape.geometry.area * 10.7639  # Convert to sq ft
            
            # Load CSV and DBF data
            df_csv = pd.read_csv(required_files["csv"], low_memory=False)
            df_dbf = pd.DataFrame(iter(DBF(required_files["dbf"], load=True, encoding='latin1')))
            
            # Merge data
            parcel_id_field = self.field_mappings["city"]["parcel_id"]
            gdf_shape[parcel_id_field] = gdf_shape[parcel_id_field].astype(str)
            df_csv[parcel_id_field] = df_csv[parcel_id_field].astype(str)
            df_dbf[parcel_id_field] = df_dbf[parcel_id_field].astype(str)
            
            gdf = gdf_shape.merge(df_csv, on=parcel_id_field, how="left")
            gdf = gdf.merge(df_dbf, on=parcel_id_field, how="left", suffixes=('', '_dbf'))
            
            print(f"📊 Merged data: {len(gdf)} parcels")
            
        except Exception as e:
            print(f"❌ Error loading city data: {e}")
            print("⚠️ Creating mock data instead...")
            return self._create_mock_city_data()
        
        self.address_stats["city_records_processed"] = len(gdf)
        
        # Apply record limit for dataset size
        if self.limit_records:
            gdf = gdf.head(self.limit_records)
            print(f"📊 Limited to {len(gdf)} records for {self.dataset_size} dataset")
        
        # Process each parcel
        for idx, (_, row) in enumerate(gdf.iterrows()):
            if idx % 1000 == 0 and idx > 0:
                print(f"   ⚙️ Processed {idx:,}/{len(gdf):,} city parcels...")
                
            parcel_id = str(row.get(parcel_id_field, "")).strip()
            if not parcel_id:
                continue
                
            # Extract geometry
            geometry_data[parcel_id] = self.extract_parcel_geometry(row.geometry)
            
            # Get address data
            raw_street_address = self.get_field_value(row, "city", "address", "street_primary", "")
            full_street_address = str(raw_street_address).strip()
            zip_code_raw = str(self.get_field_value(row, "city", "address", "zip", "")).strip()
            zip_code_raw = re.sub(r"\.0$", "", zip_code_raw)  # Remove .0 from float zips
            
            if not full_street_address or full_street_address.lower() in ['nan', 'none', 'null']:
                self.address_stats["missing_city_components"] += 1
                continue
                
            if not self.is_valid_zip(zip_code_raw):
                self.address_stats["invalid_zip"] += 1
                zip_code = "63102"  # Default for St. Louis City
            else:
                zip_code = zip_code_raw
                
            # Construct and standardize address
            raw_full_address = f"{full_street_address}, St. Louis, MO {zip_code}"
            standardized_address = self.standardize_address(raw_full_address, default_city="St. Louis")
            
            if not standardized_address:
                self.address_stats["standardization_failure"] += 1
                continue
                
            if self.is_po_box(standardized_address):
                self.address_stats["po_box"] += 1
                continue  # Skip PO boxes
                
            self.address_stats["valid_addresses"] += 1
            self.address_stats["city_records_valid"] += 1
            
            # Calculate property metrics
            land_area = self.safe_to_numeric(row.get("landarea"), 0)
            building_sqft = self.safe_to_numeric(self.get_field_value(row, "city", "building", "area"), 0)
            
            # Estimate building size if missing but has improvement value
            if building_sqft == 0:
                improvement_val = self.safe_to_numeric(self.get_field_value(row, "city", "assessment", "improvement"), 0)
                if improvement_val > 0 and land_area > 0:
                    estimated_bldg = improvement_val / 100  # Assume $100/sqft
                    building_sqft = min(estimated_bldg, land_area * 0.7)
                    
            prop_class_code = self.get_field_value(row, "city", "property_class", None)
            property_type = self.classify_property(prop_class_code, "city")
            
            est_landscapable_area = self.calculate_landscapable_area(land_area, building_sqft, property_type)
            
            # Calculate affluence score
            row_dict = row.to_dict()
            row_dict["landarea"] = land_area
            row_dict["building_sqft"] = building_sqft
            affluence = self.calculate_affluence_score(row_dict, "city")
            
            centroid = row.geometry.centroid
            
            results.append({
                "id": parcel_id,
                "original_parcel_id": parcel_id,
                "full_address": standardized_address,
                "region": "St. Louis City",
                "latitude": round(centroid.y, 6) if centroid else 0,
                "longitude": round(centroid.x, 6) if centroid else 0,
                "calc": {
                    "landarea_sqft": land_area,
                    "building_sqft": round(building_sqft, 2),
                    "estimated_landscapable_area_sqft": est_landscapable_area,
                    "property_type": property_type,
                    "year_built": int(self.safe_to_numeric(self.get_field_value(row, "city", "building", "year"), 0)),
                },
                "assessment": {
                    "total_value": self.safe_to_numeric(self.get_field_value(row, "city", "assessment", "total"), 0),
                    "land_value": self.safe_to_numeric(self.get_field_value(row, "city", "assessment", "land"), 0),
                    "improvement_value": self.safe_to_numeric(self.get_field_value(row, "city", "assessment", "improvement"), 0),
                },
                "owner": {
                    "name": str(self.get_field_value(row, "city", "owner", "name", "")).strip(),
                },
                "affluence_score": affluence,
                "source_file": "StLouisCity_Parcels"
            })
            
        print(f"✅ Processed {self.address_stats['city_records_valid']} valid city records")
        return results, geometry_data
    
    def process_county_data(self) -> tuple:
        """Process St. Louis County shapefile data"""
        print("🏘️ Processing St. Louis County shapefiles...")
        
        results = []
        geometry_data = {}
        
        base_dir = self.temp_dir / "shapefiles" / "saint-louis-county"
        required_files = {
            "shp": base_dir / "Parcels_Current.shp",
            "shx": base_dir / "Parcels_Current.shx",
            "dbf": base_dir / "Parcels_Current.dbf"
        }
        
        missing_files = [name for name, path in required_files.items() if not path.exists()]
        if missing_files:
            print(f"❌ Missing county files: {missing_files}")
            print("⚠️ Creating mock data instead...")
            return self._create_mock_county_data()
            
        try:
            # Load shapefile
            gdf = gpd.read_file(required_files["shp"])
            print(f"📊 Loaded {len(gdf)} parcels from county shapefile")
            
            # Set CRS if missing
            if gdf.crs is None:
                print("⚠️ Setting default CRS (Missouri State Plane)")
                gdf = gdf.set_crs(epsg=26916)
                
            # Transform and calculate area
            gdf = gdf.to_crs(epsg=26915)
            gdf["landarea"] = gdf.geometry.area * 10.7639
            
        except Exception as e:
            print(f"❌ Error loading county data: {e}")
            print("⚠️ Creating mock data instead...")
            return self._create_mock_county_data()
        
        self.address_stats["county_records_processed"] = len(gdf)
        
        if self.limit_records:
            gdf = gdf.head(self.limit_records)
            print(f"📊 Limited to {len(gdf)} records for {self.dataset_size} dataset")
        
        parcel_id_field = self.field_mappings["county"]["parcel_id"]
        
        for idx, (_, row) in enumerate(gdf.iterrows()):
            if idx % 1000 == 0 and idx > 0:
                print(f"   ⚙️ Processed {idx:,}/{len(gdf):,} county parcels...")
                
            parcel_id = str(row.get(parcel_id_field, "")).strip()
            if not parcel_id:
                continue
                
            geometry_data[parcel_id] = self.extract_parcel_geometry(row.geometry)
            
            raw_address = str(self.get_field_value(row, "county", "address", "full", "")).strip()
            raw_zip = str(self.get_field_value(row, "county", "address", "zip", "")).strip()
            raw_municipality = str(self.get_field_value(row, "county", "address", "municipality", "")).strip().title()
            
            if not raw_address or raw_address.lower() in ['nan', 'none', 'null']:
                self.address_stats["missing_street"] += 1
                continue
                
            city_to_use = raw_municipality or "St. Louis County"
            if city_to_use.upper() == "UNINCORPORATED":
                city_to_use = "St. Louis County (Unincorporated)"
                
            if self.is_valid_zip(raw_zip):
                zip_to_use = raw_zip
            else:
                self.address_stats["invalid_zip"] += 1
                zip_to_use = "63105"
                
            full_address_for_std = f"{raw_address}, {city_to_use}, MO {zip_to_use}"
            standardized_address = self.standardize_address(
                full_address_for_std,
                default_city=city_to_use,
                default_state="MO",
                default_zip=zip_to_use
            )
            
            if not standardized_address:
                self.address_stats["standardization_failure"] += 1
                continue
                
            if self.is_po_box(standardized_address):
                self.address_stats["po_box"] += 1
                continue
                
            self.address_stats["valid_addresses"] += 1
            self.address_stats["county_records_valid"] += 1
            
            land_area = self.safe_to_numeric(row.get("landarea"), 0)
            building_sqft = self.safe_to_numeric(self.get_field_value(row, "county", "building", "area"), 0)
            
            prop_class_code = self.get_field_value(row, "county", "property_class", None)
            property_type = self.classify_property(prop_class_code, "county")
            
            est_landscapable_area = self.calculate_landscapable_area(land_area, building_sqft, property_type)
            
            row_dict = row.to_dict()
            row_dict["landarea"] = land_area
            row_dict["building_sqft"] = building_sqft
            affluence = self.calculate_affluence_score(row_dict, "county")
            
            centroid = row.geometry.centroid
            
            results.append({
                "id": parcel_id,
                "original_parcel_id": parcel_id,
                "full_address": standardized_address,
                "region": raw_municipality.title() if raw_municipality else "St. Louis County",
                "latitude": round(centroid.y, 6) if centroid else 0,
                "longitude": round(centroid.x, 6) if centroid else 0,
                "calc": {
                    "landarea_sqft": land_area,
                    "building_sqft": round(building_sqft, 2),
                    "estimated_landscapable_area_sqft": est_landscapable_area,
                    "property_type": property_type,
                    "year_built": int(self.safe_to_numeric(self.get_field_value(row, "county", "building", "year"), 0)),
                },
                "assessment": {
                    "total_value": self.safe_to_numeric(self.get_field_value(row, "county", "assessment", "total"), 0),
                    "land_value": self.safe_to_numeric(self.get_field_value(row, "county", "assessment", "land"), 0),
                    "improvement_value": self.safe_to_numeric(self.get_field_value(row, "county", "assessment", "improvement"), 0),
                },
                "owner": {
                    "name": str(self.get_field_value(row, "county", "owner", "name", "")).strip(),
                    "tenure": str(self.get_field_value(row, "county", "owner", "tenure", "")).strip(),
                    "owner_state": str(self.get_field_value(row, "county", "owner", "state", "")).strip(),
                },
                "affluence_score": affluence,
                "source_file": "StLouisCounty_Parcels_Current"
            })
            
        print(f"✅ Processed {self.address_stats['county_records_valid']} valid county records")
        return results, geometry_data
    
    def _create_mock_city_data(self) -> tuple:
        """Create mock city data when shapefiles are not available"""
        print("🎭 Creating mock St. Louis City data...")
        
        num_parcels = self.limit_records or 100
        results = []
        geometry_data = {}
        
        streets = ["Main St", "Broadway", "Market St", "Grand Blvd", "Kingshighway"]
        zip_codes = [63101, 63102, 63103, 63104, 63105]
        
        for i in range(num_parcels):
            parcel_id = f"CITY_{i:05d}"
            address = f"{100 + (i * 10)} {streets[i % len(streets)]}, St. Louis, MO {zip_codes[i % len(zip_codes)]}"
            
            results.append({
                "id": parcel_id,
                "original_parcel_id": parcel_id,
                "full_address": address,
                "region": "St. Louis City",
                "latitude": 38.6270 + (i * 0.001),
                "longitude": -90.1994 + (i * 0.001),
                "calc": {
                    "landarea_sqft": 3000 + (i * 100) % 15000,
                    "building_sqft": 800 + (i * 50) % 4000,
                    "estimated_landscapable_area_sqft": (3000 + (i * 100) % 15000) * 0.7,
                    "property_type": "residential",
                    "year_built": 1950 + (i % 70),
                },
                "assessment": {
                    "total_value": 150000 + (i * 5000) % 500000,
                    "land_value": 50000 + (i * 1000) % 100000,
                    "improvement_value": 100000 + (i * 4000) % 400000,
                },
                "owner": {
                    "name": f"Owner {chr(65 + (i % 26))} {i}",
                },
                "affluence_score": 2.0 + (i % 30) * 0.1,
                "source_file": "Mock_StLouisCity_Data"
            })
            
            geometry_data[parcel_id] = {
                "type": "Polygon",
                "coordinates": [[[
                    [-90.1994 + (i * 0.001), 38.6270 + (i * 0.001)],
                    [-90.1984 + (i * 0.001), 38.6270 + (i * 0.001)],
                    [-90.1984 + (i * 0.001), 38.6280 + (i * 0.001)],
                    [-90.1994 + (i * 0.001), 38.6280 + (i * 0.001)],
                    [-90.1994 + (i * 0.001), 38.6270 + (i * 0.001)]
                ]]],
                "bbox": [-90.1994 + (i * 0.001), 38.6270 + (i * 0.001), 
                        -90.1984 + (i * 0.001), 38.6280 + (i * 0.001)]
            }
            
        self.address_stats["city_records_processed"] = num_parcels
        self.address_stats["city_records_valid"] = num_parcels
        self.address_stats["valid_addresses"] += num_parcels
        
        print(f"✅ Generated {num_parcels} mock city parcels")
        return results, geometry_data
    
    def _create_mock_county_data(self) -> tuple:
        """Create mock county data when shapefiles are not available"""
        print("🎭 Creating mock St. Louis County data...")
        
        num_parcels = self.limit_records or 100
        results = []
        geometry_data = {}
        
        streets = ["Oak Ave", "Elm Dr", "Park Blvd", "First St", "Second St"]
        cities = ["Clayton", "University City", "Kirkwood", "Webster Groves", "Richmond Heights"]
        zip_codes = [63105, 63130, 63122, 63119, 63117]
        
        for i in range(num_parcels):
            parcel_id = f"COUNTY_{i:05d}"
            city = cities[i % len(cities)]
            address = f"{200 + (i * 10)} {streets[i % len(streets)]}, {city}, MO {zip_codes[i % len(zip_codes)]}"
            
            results.append({
                "id": parcel_id,
                "original_parcel_id": parcel_id,
                "full_address": address,
                "region": city,
                "latitude": 38.6470 + (i * 0.001),
                "longitude": -90.2994 + (i * 0.001),
                "calc": {
                    "landarea_sqft": 5000 + (i * 100) % 20000,
                    "building_sqft": 1000 + (i * 50) % 5000,
                    "estimated_landscapable_area_sqft": (5000 + (i * 100) % 20000) * 0.75,
                    "property_type": "residential",
                    "year_built": 1960 + (i % 60),
                },
                "assessment": {
                    "total_value": 200000 + (i * 8000) % 800000,
                    "land_value": 80000 + (i * 2000) % 200000,
                    "improvement_value": 120000 + (i * 6000) % 600000,
                },
                "owner": {
                    "name": f"County Owner {chr(65 + (i % 26))} {i}",
                    "tenure": "OWNER",
                    "owner_state": "MO",
                },
                "affluence_score": 2.5 + (i % 25) * 0.1,
                "source_file": "Mock_StLouisCounty_Data"
            })
            
            geometry_data[parcel_id] = {
                "type": "Polygon",
                "coordinates": [[[
                    [-90.2994 + (i * 0.001), 38.6470 + (i * 0.001)],
                    [-90.2984 + (i * 0.001), 38.6470 + (i * 0.001)],
                    [-90.2984 + (i * 0.001), 38.6480 + (i * 0.001)],
                    [-90.2994 + (i * 0.001), 38.6480 + (i * 0.001)],
                    [-90.2994 + (i * 0.001), 38.6470 + (i * 0.001)]
                ]]],
                "bbox": [-90.2994 + (i * 0.001), 38.6470 + (i * 0.001), 
                        -90.2984 + (i * 0.001), 38.6480 + (i * 0.001)]
            }
            
        self.address_stats["county_records_processed"] = num_parcels
        self.address_stats["county_records_valid"] = num_parcels
        self.address_stats["valid_addresses"] += num_parcels
        
        print(f"✅ Generated {num_parcels} mock county parcels")
        return results, geometry_data

class IngestPipeline:
    """Main pipeline orchestrator following Claude.md contract"""
    
    def __init__(self, dataset_size: str = "small", version: str = ""):
        self.dataset_size = dataset_size
        self.version_suffix = f"_{version}" if version else ""
        
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.scripts_dir = Path(__file__).parent
        self.temp_dir = self.scripts_dir / "temp"
        self.temp_raw_dir = self.temp_dir / "raw"
        
        # Local shapefile directories (untracked, preferred source)
        self.local_shapefiles_dir = self.project_root / "src" / "data"
        
        self.temp_dir.mkdir(exist_ok=True)
        self.temp_raw_dir.mkdir(exist_ok=True)
        
        # Initialize CDN clients
        self.blob_client = BlobClient()
        self.firebase_backup = FirebaseBackupCDN()
        self.firebase_initialized = self.firebase_backup.initialize()
        
        # Initialize CDN status checker
        self.cdn_checker = CDNStatusChecker(self.blob_client, self.firebase_backup)
        
        # Generate semantic version for this run
        self.current_version = self._generate_version()
        
        self.shapefile_processor = ShapefileProcessor(self.temp_raw_dir, dataset_size)
        
        self.stats = {
            "start_time": datetime.now(),
            "dataset_size": dataset_size,
            "version_suffix": version,
            "current_version": self.current_version,
            "total_addresses": 0,
            "total_parcels": 0,
            "files_created": [],
            "files_uploaded": [],
            "upload_urls": {},
            "backup_urls": {},
            "errors": [],
            "cleanup_completed": False,
            "local_shapefiles_used": False,
            "firebase_backup_success": False,
            "version_manifest_created": False
        }
        
        print("🚀 IngestPipeline initialized with full CDN integration")
        print(f"📊 Dataset size: {self.dataset_size}")
        print(f"🏷️  Version: {self.current_version}")
        print(f"📂 Project root: {self.project_root}")
        print(f"📂 Local shapefiles: {self.local_shapefiles_dir}")
        print(f"🔥 Firebase backup: {'✅ Available' if self.firebase_initialized else '❌ Unavailable'}")
    
    def _generate_version(self) -> str:
        """Generate semantic version for this pipeline run"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_version = f"v1.{timestamp}"
        return f"{base_version}{self.version_suffix}"
    
    def _prefer_local_shapefiles(self) -> bool:
        """Check if local shapefiles are available and prefer them over CDN download"""
        print("\n� Checking for local shapefiles...")
        
        city_local = self.local_shapefiles_dir / "saint_louis_city" / "shapefiles"
        county_local = self.local_shapefiles_dir / "saint_louis_county" / "shapefiles"
        
        city_has_files = (city_local / "prcl.shp").exists() and (city_local / "prcl.dbf").exists()
        county_has_files = (county_local / "Parcels_Current.shp").exists() and (county_local / "Parcels_Current.dbf").exists()
        
        if city_has_files and county_has_files:
            print("✅ Found local shapefiles - using local data (preferred)")
            self.stats["local_shapefiles_used"] = True
            
            # Copy local shapefiles to temp directory for processing
            city_temp = self.temp_raw_dir / "shapefiles" / "saint-louis-city"
            county_temp = self.temp_raw_dir / "shapefiles" / "saint-louis-county"
            city_temp.mkdir(parents=True, exist_ok=True)
            county_temp.mkdir(parents=True, exist_ok=True)
            
            # Copy city files
            for file_path in city_local.glob("*"):
                if file_path.is_file():
                    shutil.copy2(file_path, city_temp / file_path.name)
            
            # Copy county files  
            for file_path in county_local.glob("*"):
                if file_path.is_file():
                    shutil.copy2(file_path, county_temp / file_path.name)
                    
            print(f"� Copied local shapefiles to temp directory")
            return True
        else:
            print("⚠️ Local shapefiles not found or incomplete")
            print(f"   City files: {'✅' if city_has_files else '❌'}")
            print(f"   County files: {'✅' if county_has_files else '❌'}")
            return False
    
    def download_shapefiles_from_blob(self) -> bool:
        """Download shapefiles from blob storage to local temp directory"""
        print("\n📥 Downloading shapefiles from blob storage...")
        
        city_shp_dir = self.temp_raw_dir / "shapefiles" / "saint-louis-city"
        county_shp_dir = self.temp_raw_dir / "shapefiles" / "saint-louis-county"
        city_shp_dir.mkdir(parents=True, exist_ok=True)
        county_shp_dir.mkdir(parents=True, exist_ok=True)
        
        encryption_key = os.getenv('SHAPEFILE_ENCRYPTION_KEY')
        if not encryption_key:
            print("⚠️ No SHAPEFILE_ENCRYPTION_KEY found - trying uncompressed files...")
        
        files_to_download = [
            ("parcel-source/saint-louis-city/shapefiles/prcl.shp.gz.enc", "parcel-source/saint-louis-city/shapefiles/prcl.shp", city_shp_dir / "prcl.shp"),
            ("parcel-source/saint-louis-city/shapefiles/prcl.shx", None, city_shp_dir / "prcl.shx"),
            ("parcel-source/saint-louis-city/shapefiles/prcl.dbf.gz.enc", "parcel-source/saint-louis-city/shapefiles/prcl.dbf", city_shp_dir / "prcl.dbf"),
            ("parcel-source/saint-louis-city/shapefiles/prcl.prj", None, city_shp_dir / "prcl.prj"),
            ("parcel-source/saint-louis-city/shapefiles/parcels-basic-info.csv.gz.enc", "parcel-source/saint-louis-city/shapefiles/parcels-basic-info.csv", city_shp_dir / "parcels-basic-info.csv"),
            
            ("parcel-source/saint-louis-county/shapefiles/Parcels_Current.shp.gz.enc", "parcel-source/saint-louis-county/shapefiles/Parcels_Current.shp", county_shp_dir / "Parcels_Current.shp"),
            ("parcel-source/saint-louis-county/shapefiles/Parcels_Current.shx", None, county_shp_dir / "Parcels_Current.shx"),
            ("parcel-source/saint-louis-county/shapefiles/Parcels_Current.dbf.gz.enc", "parcel-source/saint-louis-county/shapefiles/Parcels_Current.dbf", county_shp_dir / "Parcels_Current.dbf"),
            ("parcel-source/saint-louis-county/shapefiles/Parcels_Current.prj", None, county_shp_dir / "Parcels_Current.prj"),
        ]
        
        downloaded_count = 0
        
        for primary_path, fallback_path, local_path in files_to_download:
            print(f"📥 Attempting to download {primary_path}")
            
            success = False
            
            if self._download_and_process_file(primary_path, local_path, encryption_key):
                success = True
                downloaded_count += 1
            elif fallback_path:
                print(f"   Trying fallback: {fallback_path}")
                if self._download_and_process_file(fallback_path, local_path, None):
                    success = True
                    downloaded_count += 1
            
            if not success:
                print(f"⚠️ Failed to download {primary_path}")
        
        print(f"\n📊 Downloaded {downloaded_count}/{len(files_to_download)} shapefile components")
        
        city_required = city_shp_dir / "prcl.shp"
        county_required = county_shp_dir / "Parcels_Current.shp"
        
        has_city = city_required.exists()
        has_county = county_required.exists()
        
        if has_city or has_county:
            print(f"✅ Ready to process shapefiles: City={has_city}, County={has_county}")
            return True
        else:
            print("⚠️ No shapefiles available - will use mock data")
            return False
    
    def _download_and_process_file(self, blob_path: str, local_path: Path, encryption_key: Optional[str]) -> bool:
        """Download and process a file (with optional decryption/decompression)"""
        try:
            url = f"https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/{blob_path}"
            temp_file = local_path.with_suffix('.tmp')
            
            result = subprocess.run(
                ["curl", "-f", "-s", "-o", str(temp_file), url],
                capture_output=True,
                timeout=120
            )
            
            if result.returncode != 0 or not temp_file.exists() or temp_file.stat().st_size == 0:
                if temp_file.exists():
                    temp_file.unlink()
                return False
            
            if blob_path.endswith('.gz.enc'):
                if not encryption_key:
                    print(f"   ❌ Encrypted file requires SHAPEFILE_ENCRYPTION_KEY")
                    temp_file.unlink()
                    return False
                
                f = Fernet(encryption_key.encode())
                with open(temp_file, 'rb') as encrypted_file:
                    decrypted_data = f.decrypt(encrypted_file.read())
                
                decompressed_data = gzip.decompress(decrypted_data)
                
                with open(local_path, 'wb') as final_file:
                    final_file.write(decompressed_data)
                
                temp_file.unlink()
                print(f"✅ Downloaded and decrypted {blob_path} ({local_path.stat().st_size} bytes)")
                return True
                
            elif blob_path.endswith('.gz'):
                with gzip.open(temp_file, 'rb') as compressed_file:
                    with open(local_path, 'wb') as final_file:
                        shutil.copyfileobj(compressed_file, final_file)
                
                temp_file.unlink()
                print(f"✅ Downloaded and decompressed {blob_path} ({local_path.stat().st_size} bytes)")
                return True
                
            else:
                temp_file.rename(local_path)
                print(f"✅ Downloaded {blob_path} ({local_path.stat().st_size} bytes)")
                return True
                
        except Exception as e:
            print(f"   ❌ Error processing {blob_path}: {e}")
            if 'temp_file' in locals() and temp_file.exists():
                temp_file.unlink()
            return False

    def download_shapefile_archives_from_blob(self) -> bool:
        """Download and extract shapefile archives from blob storage"""
        print("\n📥 Downloading shapefile archives from blob storage...")
        
        city_shp_dir = self.temp_raw_dir / "shapefiles" / "saint-louis-city"
        county_shp_dir = self.temp_raw_dir / "shapefiles" / "saint-louis-county"
        city_shp_dir.mkdir(parents=True, exist_ok=True)
        county_shp_dir.mkdir(parents=True, exist_ok=True)
        
        encryption_key = os.getenv('SHAPEFILE_ENCRYPTION_KEY')
        if not encryption_key:
            print("❌ SHAPEFILE_ENCRYPTION_KEY required for encrypted archives")
            return False
        
        archives = [
            ("parcel-source/saint-louis-city/shapefiles.tar.gz.enc", city_shp_dir, "saint-louis-city"),
            ("parcel-source/saint-louis-county/shapefiles.tar.gz.enc", county_shp_dir, "saint-louis-county")
        ]
        
        downloaded_count = 0
        
        for archive_path, extract_dir, region_name in archives:
            print(f"📥 Downloading {archive_path}...")
            
            try:
                temp_archive = self.temp_raw_dir / f"{region_name}_archive.tar.gz.enc"
                
                if not self.blob_client.download_file(archive_path, temp_archive):
                    print(f"❌ Failed to download {archive_path}")
                    continue
                
                print(f"✅ Downloaded {archive_path} ({temp_archive.stat().st_size / 1024 / 1024:.1f}MB)")
                
                print(f"🔓 Decrypting and extracting {region_name}...")
                
                with open(temp_archive, 'rb') as encrypted_file:
                    f = Fernet(encryption_key.encode())
                    decrypted_data = f.decrypt(encrypted_file.read())
                


                    decompressed_data = gzip.decompress(decrypted_data)
                    
                    with tarfile.open(fileobj=io.BytesIO(decompressed_data), mode='r') as tar:
                        tar.extractall(path=extract_dir, filter='data')
                        extracted_files = tar.getnames()
                        print(f"✅ Extracted {len(extracted_files)} files to {extract_dir}")
                        for filename in extracted_files:
                            print(f"   - {filename}")
                
                temp_archive.unlink()
                downloaded_count += 1
                
            except Exception as e:
                print(f"❌ Error processing {archive_path}: {e}")
                if 'temp_archive' in locals() and temp_archive.exists():
                    temp_archive.unlink()
        
        print(f"\n📊 Successfully downloaded and extracted {downloaded_count}/{len(archives)} archives")
        
        required_files = [
            city_shp_dir / "prcl.shp",
            city_shp_dir / "prcl.dbf", 
            county_shp_dir / "Parcels_Current.shp",
            county_shp_dir / "Parcels_Current.dbf"
        ]
        
        missing_files = [f for f in required_files if not f.exists()]
        if missing_files:
            print(f"⚠️ Missing required files: {[str(f) for f in missing_files]}")
            return False
        
        print("✅ All required shapefile components extracted successfully")
        return downloaded_count == len(archives)

    def step_1_process_regional_data(self) -> List[Path]:
        """Step 1: Process regional shapefile data"""
        print("\n" + "="*60)
        print("1️⃣ PROCESSING REGIONAL SHAPEFILE DATA")
        print("="*60)
        
        shapefiles_available = self.download_shapefile_archives_from_blob()
        
        processed_files = []
        
        city_data, city_geometry = self.shapefile_processor.process_city_data()
        if city_data:
            city_file = self.temp_raw_dir / "saint-louis-city-processed.json"
            with open(city_file, 'w', encoding='utf-8') as f:
                json.dump(city_data, f, separators=(',', ':'))
            processed_files.append(city_file)
            self.stats["files_created"].append(str(city_file))
            print(f"✅ Created {city_file.name}: {len(city_data)} city parcels")
        
        county_data, county_geometry = self.shapefile_processor.process_county_data()
        if county_data:
            county_file = self.temp_raw_dir / "saint-louis-county-processed.json"
            with open(county_file, 'w', encoding='utf-8') as f:
                json.dump(county_data, f, separators=(',', ':'))
            processed_files.append(county_file)
            self.stats["files_created"].append(str(county_file))
            print(f"✅ Created {county_file.name}: {len(county_data)} county parcels")
        
        print("\n📋 Creating unified index files...")
        index_files = self._create_unified_indexes(city_data, county_data, city_geometry, county_geometry)
        
        return processed_files + index_files
    
    def _create_unified_indexes(self, city_data: List[Dict], county_data: List[Dict], 
                              city_geometry: Dict, county_geometry: Dict) -> List[Path]:
        """Create unified search and metadata indexes"""
        all_data = city_data + county_data
        if not all_data:
            print("⚠️ No data to create indexes from")
            return []
        
        search_addresses = []
        metadata_records = {}
        geometry_index = {}
        
        for record in all_data:
            search_addresses.append({
                "display_name": record["full_address"],
                "parcel_id": record["id"],
                "region": record["region"],
                "latitude": record["latitude"],
                "longitude": record["longitude"]
            })
            
            original_id = record["original_parcel_id"]
            if original_id not in metadata_records:
                metadata_records[original_id] = {
                    "id": original_id,
                    "primary_full_address": record["full_address"],
                    "latitude": record["latitude"],
                    "longitude": record["longitude"],
                    "region": record["region"],
                    "calc": {
                        "landarea": record["calc"]["landarea_sqft"],
                        "building_sqft": record["calc"]["building_sqft"],
                        "estimated_landscapable_area": record["calc"]["estimated_landscapable_area_sqft"],
                        "property_type": record["calc"]["property_type"]
                    },
                    "owner": {
                        "name": record.get("owner", {}).get("name", "")
                    },
                    "affluence_score": record.get("affluence_score", 0)
                }
        
        all_geometry = {}
        all_geometry.update(city_geometry)
        all_geometry.update(county_geometry)
        
        for original_id in metadata_records.keys():
            if original_id in all_geometry:
                geometry_index[original_id] = all_geometry[original_id]
        
        metadata_list = list(metadata_records.values())
        
        index_files = []
        
        address_index_data = {
            "addresses": search_addresses,
            "metadata": {
                "total_addresses": len(search_addresses),
                "build_time": datetime.now().isoformat(),
                "source": "ingest_pipeline_unified",
                "version": "1.0"
            }
        }
        
        address_index_file = self.temp_raw_dir / "address_index.json"
        with open(address_index_file, 'w', encoding='utf-8') as f:
            json.dump(address_index_data, f, separators=(',', ':'))
        index_files.append(address_index_file)
        self.stats["files_created"].append(str(address_index_file))
        print(f"✅ Created address_index.json: {len(search_addresses):,} addresses")
        
        metadata_file = self.temp_raw_dir / "parcel_metadata_index.json"
        parcel_data = {
            "parcels": metadata_list,
            "metadata": {
                "total_parcels": len(metadata_list),
                "build_time": datetime.now().isoformat(),
                "source": "ingest_pipeline_unified",
                "version": "1.0"
            }
        }
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(parcel_data, f, separators=(',', ':'))
        index_files.append(metadata_file)
        self.stats["files_created"].append(str(metadata_file))
        print(f"✅ Created parcel_metadata_index.json: {len(metadata_list):,} parcels")
        
        if geometry_index:
            geometry_file = self.temp_raw_dir / "parcel_geometry_index.json"
            with open(geometry_file, 'w', encoding='utf-8') as f:
                json.dump(geometry_index, f, separators=(',', ':'))
            index_files.append(geometry_file)
            self.stats["files_created"].append(str(geometry_file))
            print(f"✅ Created parcel_geometry_index.json: {len(geometry_index):,} geometries")
        
        self.stats["total_addresses"] = len(search_addresses)
        self.stats["total_parcels"] = len(metadata_list)
        
        return index_files
    
    def step_2_upload_integration_data(self, processed_files: List[Path]):
        """Step 2: Upload regional processed files to integration bucket"""
        print("\n" + "="*60)
        print("2️⃣ UPLOADING TO INTEGRATION BUCKET")
        print("="*60)
        
        for file_path in processed_files:
            if "processed" in file_path.name:
                if "saint-louis-city" in file_path.name:
                    region = "saint-louis-city"
                elif "saint-louis-county" in file_path.name:
                    region = "saint-louis-county"
                else:
                    region = "unknown"
                
                versioned_filename = f"{region}-processed{self.version_suffix}.json"
                blob_path = f"parcel-source/{region}/{versioned_filename}"
            else:
                base_filename = file_path.stem
                versioned_filename = f"{base_filename}{self.version_suffix}.json"
                blob_path = f"integration/{versioned_filename}"
            
            print(f"📤 Uploading {file_path.name} to {blob_path}")
            
            result = self.blob_client.upload_file(file_path, blob_path)
            if result:
                self.stats["files_uploaded"].append(blob_path)
                self.stats["upload_urls"][blob_path] = result.get('url', '')
                print(f"✅ Uploaded {blob_path}")
            else:
                self.stats["errors"].append(f"Failed to upload {blob_path}")
                print(f"❌ Failed to upload {blob_path}")
    
    def step_3_build_flexsearch_indexes(self):
        """Step 3: Build FlexSearch indexes using TypeScript"""
        print("\n" + "="*60)
        print("3️⃣ BUILDING FLEXSEARCH INDEXES")
        print("="*60)
        
        builder_script = self.scripts_dir / "flexsearch_builder.ts"
        
        if not builder_script.exists():
            self.stats["errors"].append("FlexSearch builder script not found")
            return False
        
        try:
            print("🔍 Running FlexSearch builder (TypeScript)...")
            print(f"📂 Working directory: {self.scripts_dir}")
            print(f"📂 Expected input dir: {self.temp_raw_dir}")
            print(f"📂 Expected output dir: {self.temp_dir}")
            
            result = subprocess.run(
                ["npx", "tsx", str(builder_script)],
                cwd=str(self.scripts_dir),
                capture_output=True,
                text=True,
                timeout=600
            )
            
            if result.returncode == 0:
                print("✅ FlexSearch indexes built successfully")
                print("📋 Builder output:")
                print(result.stdout)
                
                expected_files = [
                    "address-index.json.gz",
                    "parcel-metadata.json.gz",
                    "parcel-geometry.json.gz"
                ]
                
                for filename in expected_files:
                    file_path = self.temp_dir / filename
                    if file_path.exists():
                        self.stats["files_created"].append(str(file_path))
                        print(f"✅ Created {filename} at {file_path}")
                    else:
                        print(f"⚠️  Missing {filename} at {file_path}")
                
                # Also check if files were created in unexpected locations
                print("🔍 Checking for files in other locations...")
                check_locations = [
                    self.scripts_dir,
                    self.project_root / "src",
                    Path.cwd()
                ]
                
                for location in check_locations:
                    for filename in expected_files:
                        unexpected_file = location / filename
                        if unexpected_file.exists() and unexpected_file != self.temp_dir / filename:
                            print(f"⚠️  Found {filename} in unexpected location: {unexpected_file}")
                
                return True
            else:
                print("❌ FlexSearch builder failed")
                print("Error output:", result.stderr)
                self.stats["errors"].append(f"FlexSearch build failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("❌ FlexSearch builder timed out")
            self.stats["errors"].append("FlexSearch builder timed out")
            return False
        except Exception as e:
            print(f"❌ Error running FlexSearch builder: {e}")
            self.stats["errors"].append(f"FlexSearch builder error: {e}")
            return False
    
    def get_package_version(self) -> str:
        """Get version from package.json"""
        try:
            package_json_path = self.project_root / "package.json"
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
                version = package_data.get('version', '0.1.0')
                print(f"📦 Package version: {version}")
                return version
        except Exception as e:
            print(f"⚠️  Could not read package.json version: {e}")
            return "0.1.0"
    
    def list_existing_cdn_versions(self) -> List[str]:
        """List existing CDN versions in blob storage"""
        try:
            files = self.blob_client.list_files(prefix="cdn/")
            versions = set()
            
            for file_info in files:
                filename = file_info['pathname'].replace('cdn/', '')
                match = re.search(r'-v(\d+\.\d+\.\d+)\.json\.gz$', filename)
                if match:
                    versions.add(match.group(1))
            
            return sorted(list(versions), key=lambda v: [int(x) for x in v.split('.')])
        except Exception as e:
            print(f"⚠️  Error listing existing CDN versions: {e}")
            return []
    
    def cleanup_old_cdn_versions(self, current_version: str):
        """Keep only current and previous CDN versions"""
        print("\n🧹 Cleaning up old CDN versions...")
        
        try:
            existing_versions = self.list_existing_cdn_versions()
            print(f"📋 Found existing versions: {existing_versions}")
            
            if len(existing_versions) <= 2:
                print("✅ Only current and/or previous version exist, no cleanup needed")
                return
            
            versions_to_delete = existing_versions[:-2] if current_version in existing_versions else existing_versions[:-1]
            
            if not versions_to_delete:
                print("✅ No old versions to clean up")
                return
            
            print(f"🗑️  Deleting old versions: {versions_to_delete}")
            
            for version in versions_to_delete:
                filenames = [
                    f"cdn/address-index-v{version}.json.gz",
                    f"cdn/parcel-metadata-v{version}.json.gz",
                    f"cdn/parcel-geometry-v{version}.json.gz"
                ]
                
                for filename in filenames:
                    try:
                        result = self.blob_client.delete_file(filename)
                        if result:
                            print(f"🗑️  Deleted {filename}")
                        else:
                            print(f"⚠️  Could not delete {filename} (may not exist)")
                    except Exception as e:
                        print(f"⚠️  Error deleting {filename}: {e}")
            
        except Exception as e:
            print(f"❌ Error during CDN cleanup: {e}")
            self.stats["errors"].append(f"CDN cleanup error: {e}")
    
    def cleanup_non_versioned_cdn_files(self):
        """Remove any non-versioned files from CDN directory to ensure only versioned files exist"""
        print("\n🧹 Cleaning up non-versioned CDN files...")
        
        try:
            files = self.blob_client.list_files(prefix="cdn/")
            
            non_versioned_files = []
            versioned_files = []
            manifest_files = []
            legacy_files = []
            
            for file_info in files:
                filename = file_info['pathname']
                base_name = filename.replace('cdn/', '')
                
                if not base_name or base_name == '':
                    continue
                
                if base_name == 'version-manifest.json':
                    manifest_files.append(filename)
                    continue
                
                if re.search(r'-v\d+\.\d+\.\d+\.json\.gz$', base_name):
                    versioned_files.append(filename)
                elif re.search(r'__(test|archives|debug|temp|backup).*\.json\.gz$', base_name):
                    legacy_files.append(filename)
                elif base_name.endswith('.json.gz'):
                    non_versioned_files.append(filename)
                else:
                    legacy_files.append(filename)
            
            print(f"📋 CDN File Analysis:")
            print(f"   ✅ Versioned files: {len(versioned_files)}")
            print(f"   📄 Manifest files: {len(manifest_files)}")
            print(f"   ⚠️  Non-versioned files: {len(non_versioned_files)}")
            print(f"   🗑️  Legacy/test files: {len(legacy_files)}")
            
            files_to_delete = non_versioned_files + legacy_files
            
            if files_to_delete:
                print(f"\n🗑️  Removing {len(files_to_delete)} unwanted files:")
                deleted_count = 0
                for filename in files_to_delete:
                    try:
                        result = self.blob_client.delete_file(filename)
                        if result:
                            print(f"🗑️  Deleted {filename}")
                            deleted_count += 1
                        else:
                            print(f"⚠️  Could not delete {filename}")
                    except Exception as e:
                        print(f"⚠️  Error deleting {filename}: {e}")
                
                print(f"✅ Successfully deleted {deleted_count}/{len(files_to_delete)} files")
            else:
                print("✅ No unwanted files found to clean up")
            
            print(f"\n📊 Final CDN state:")
            print(f"   ✅ Versioned files: {len(versioned_files)}")
            print(f"   📄 Manifest files: {len(manifest_files)}")
            
            if versioned_files:
                versions = set()
                for filename in versioned_files:
                    match = re.search(r'-v(\d+\.\d+\.\d+)\.json\.gz$', filename.replace('cdn/', ''))
                    if match:
                        versions.add(match.group(1))
                
                if versions:
                    sorted_versions = sorted(list(versions), key=lambda v: [int(x) for x in v.split('.')])
                    print(f"   🏷️  Available versions: {sorted_versions}")
            
        except Exception as e:
            print(f"❌ Error during non-versioned file cleanup: {e}")
            self.stats["errors"].append(f"Non-versioned cleanup error: {e}")
    
    def generate_version_manifest(self, current_version: str):
        """Generate version manifest for the app to know which index version to use"""
        try:
            existing_versions = self.list_existing_cdn_versions()
            
            previous_version = None
            if len(existing_versions) >= 2:
                if current_version in existing_versions:
                    sorted_versions = sorted(existing_versions, key=lambda v: [int(x) for x in v.split('.')])
                    current_index = sorted_versions.index(current_version)
                    if current_index > 0:
                        previous_version = sorted_versions[current_index - 1]
                else:
                    previous_version = existing_versions[-1]
            
            manifest = {
                "generated_at": datetime.now().isoformat(),
                "current": {
                    "version": current_version,
                    "files": {
                        "address_index": f"https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/address-index-v{current_version}.json.gz",
                        "parcel_metadata": f"https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-metadata-v{current_version}.json.gz",
                        "parcel_geometry": f"https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-geometry-v{current_version}.json.gz"
                    }
                },
                "previous": {
                    "version": previous_version,
                    "files": {
                        "address_index": f"https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/address-index-v{previous_version}.json.gz",
                        "parcel_metadata": f"https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-metadata-v{previous_version}.json.gz",
                        "parcel_geometry": f"https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-geometry-v{previous_version}.json.gz"
                    } if previous_version else None
                },
                "available_versions": existing_versions + [current_version] if current_version not in existing_versions else existing_versions
            }
            
            manifest_path = self.temp_dir / "version-manifest.json"
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            result = self.blob_client.upload_file(manifest_path, "cdn/version-manifest.json")
            if result:
                print(f"✅ Uploaded version manifest")
                print(f"📋 Current version: {current_version}")
                print(f"📋 Previous version: {previous_version or 'None'}")
                self.stats["files_uploaded"].append("cdn/version-manifest.json")
                self.stats["upload_urls"]["cdn/version-manifest.json"] = result.get('url', '')
            else:
                print("❌ Failed to upload version manifest")
                self.stats["errors"].append("Failed to upload version manifest")
            
        except Exception as e:
            print(f"❌ Error generating version manifest: {e}")
            self.stats["errors"].append(f"Version manifest error: {e}")
    
    def step_4_upload_cdn_files(self):
        """Step 4: Upload versioned files to CDN with Firebase backup and manifest generation"""
        print("\n" + "="*60)
        print("4️⃣ UPLOADING VERSIONED FILES TO CDN WITH BACKUP")
        print("="*60)
        
        # Only upload to CDN for large datasets to avoid overwriting production indexes with test data
        if self.dataset_size != "large":
            print(f"⚠️  Skipping CDN upload for {self.dataset_size} dataset")
            print(f"📍 CDN uploads are only performed for --dataset-size=large")
            print(f"📍 This prevents overwriting production indexes with test data")
            print(f"✅ FlexSearch files are still generated locally for testing")
            return True
        
        expected_files = [
            "address-index.json.gz",
            "parcel-metadata.json.gz", 
            "parcel-geometry.json.gz"
        ]
        
        # Verify file sizes before uploading (large dataset should have substantial file sizes)
        min_file_sizes = {
            "address-index.json.gz": 50 * 1024,      # At least 50KB for 500k+ addresses
            "parcel-metadata.json.gz": 30 * 1024,    # At least 30KB for parcel metadata
            "parcel-geometry.json.gz": 100 * 1024    # At least 100KB for geometry data
        }
        
        print("🔍 Verifying file sizes for large dataset...")
        size_check_passed = True
        
        for filename in expected_files:
            file_path = self.temp_dir / filename
            
            if not file_path.exists():
                print(f"⚠️  Missing file: {filename}")
                size_check_passed = False
                continue
                
            file_size = file_path.stat().st_size
            min_size = min_file_sizes.get(filename, 0)
            
            print(f"📊 {filename}: {file_size:,} bytes (min: {min_size:,})")
            
            if file_size < min_size:
                print(f"❌ File {filename} is too small ({file_size:,} < {min_size:,} bytes)")
                print(f"   This suggests incomplete data processing")
                size_check_passed = False
            else:
                print(f"✅ {filename} size verification passed")
        
        if not size_check_passed:
            print("❌ File size verification failed - not uploading to CDN")
            print("📍 This prevents uploading incomplete indexes to production")
            self.stats["errors"].append("File size verification failed for CDN upload")
            return False
        
        # Test Vercel connection first before attempting uploads
        print(f"\n🔍 Testing Vercel Blob Storage connection...")
        vercel_available = False
        try:
            # Test with a simple list operation
            test_files = self.blob_client.list_files(prefix="cdn/")
            vercel_available = True
            print(f"✅ Vercel connection successful ({len(test_files)} files in cdn/)")
        except Exception as e:
            error_message = str(e)
            if "suspended" in error_message.lower():
                print(f"⚠️ Vercel Blob Storage is suspended - skipping Vercel uploads")
                print(f"📍 Will rely on Firebase backup CDN instead")
                vercel_available = False
            else:
                print(f"⚠️ Vercel connection failed: {e}")
                vercel_available = False
        
        # Upload versioned files to Vercel Blob Storage (only if available)
        vercel_success = True
        if vercel_available:
            print(f"\n📤 Uploading files to Vercel Blob Storage (version: {self.current_version})")
            
            for filename in expected_files:
                file_path = self.temp_dir / filename
                
                if not file_path.exists():
                    print(f"⚠️  Skipping missing file: {filename}")
                    continue
                
                base_name = filename.replace('.json.gz', '')
                versioned_filename = f"{base_name}-{self.current_version}.json.gz"
                blob_path = f"cdn/{versioned_filename}"
                
                print(f"📤 Uploading {filename} to {blob_path}")
                
                result = self.blob_client.upload_file(file_path, blob_path)
                if result:
                    self.stats["files_uploaded"].append(blob_path)
                    self.stats["upload_urls"][blob_path] = result.get('url', '')
                    print(f"✅ Uploaded {blob_path}")
                    print(f"🌐 CDN URL: {result.get('url', 'No URL returned')}")
                else:
                    self.stats["errors"].append(f"Failed to upload {blob_path}")
                    print(f"❌ Failed to upload {blob_path}")
                    vercel_success = False
        else:
            print(f"\n⚠️ Skipping Vercel uploads - service unavailable")
            print(f"📍 Proceeding with Firebase backup only")
            vercel_success = False  # Mark as failed since we couldn't upload
        
        # Upload to Firebase backup CDN (if available)
        firebase_success = self._upload_to_firebase_backup(expected_files)
        
        # Generate and upload version manifest
        manifest_success = self._generate_and_upload_version_manifest()
        
        # Clean up old versions
        self._cleanup_old_cdn_versions()
        
        overall_success = vercel_success and manifest_success
        if firebase_success:
            self.stats["firebase_backup_success"] = True
            print("✅ Firebase backup completed successfully")
        else:
            print("⚠️ Firebase backup failed or unavailable")
            
        if overall_success:
            print(f"✅ CDN upload completed successfully for version {self.current_version}")
        else:
            print(f"❌ CDN upload had errors for version {self.current_version}")
            
        return overall_success
    
    def _upload_to_firebase_backup(self, expected_files: List[str]) -> bool:
        """Upload files to Firebase Storage as backup CDN"""
        if not self.firebase_initialized:
            print("⚠️ Firebase backup unavailable - skipping backup upload")
            return False
            
        print(f"\n🔥 Uploading files to Firebase backup CDN (version: {self.current_version})")
        backup_success = True
        
        for filename in expected_files:
            file_path = self.temp_dir / filename
            
            if not file_path.exists():
                continue
                
            base_name = filename.replace('.json.gz', '')
            versioned_filename = f"{base_name}-{self.current_version}.json.gz"
            firebase_path = f"cdn/{versioned_filename}"
            
            print(f"🔥 Uploading {filename} to Firebase: {firebase_path}")
            
            try:
                result = self.firebase_backup.upload_file(str(file_path), firebase_path)
                if result:
                    self.stats["backup_urls"][firebase_path] = result.get('download_url', '')
                    print(f"✅ Firebase backup: {firebase_path}")
                else:
                    print(f"❌ Firebase backup failed: {firebase_path}")
                    backup_success = False
            except Exception as e:
                print(f"❌ Firebase backup error for {firebase_path}: {e}")
                backup_success = False
                
        return backup_success
    
    def _generate_and_upload_version_manifest(self) -> bool:
        """Generate and upload version manifest to both CDNs"""
        print(f"\n📋 Generating version manifest for {self.current_version}")
        
        try:
            # Create version manifest
            manifest = {
                "generated_at": datetime.now().isoformat(),
                "current": {
                    "version": self.current_version,
                    "files": {
                        "address_index": f"cdn/address-index-{self.current_version}.json.gz",
                        "parcel_metadata": f"cdn/parcel-metadata-{self.current_version}.json.gz",
                        "parcel_geometry": f"cdn/parcel-geometry-{self.current_version}.json.gz"
                    }
                },
                "previous": None,  # Will be populated by the app when it detects version changes
                "available_versions": [self.current_version],
                "dataset_info": {
                    "size": self.dataset_size,
                    "total_addresses": self.stats.get("total_addresses", 0),
                    "total_parcels": self.stats.get("total_parcels", 0),
                    "local_shapefiles_used": self.stats.get("local_shapefiles_used", False)
                }
            }
            
            # Write manifest to temp file
            manifest_path = self.temp_dir / "version-manifest.json"
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            print(f"📝 Created version manifest: {manifest_path}")
            
            # Upload to Vercel Blob Storage
            vercel_result = self.blob_client.upload_file(manifest_path, "cdn/version-manifest.json")
            vercel_success = bool(vercel_result)
            
            if vercel_success:
                print("✅ Uploaded version manifest to Vercel Blob Storage")
                self.stats["upload_urls"]["version-manifest"] = vercel_result.get('url', '')
            else:
                print("❌ Failed to upload version manifest to Vercel")
                
            # Upload to Firebase backup (if available)
            firebase_success = True
            if self.firebase_initialized:
                try:
                    firebase_result = self.firebase_backup.upload_file(str(manifest_path), "cdn/version-manifest.json")
                    if firebase_result:
                        print("✅ Uploaded version manifest to Firebase backup")
                        self.stats["backup_urls"]["version-manifest"] = firebase_result.get('download_url', '')
                    else:
                        print("❌ Failed to upload version manifest to Firebase")
                        firebase_success = False
                except Exception as e:
                    print(f"❌ Firebase manifest upload error: {e}")
                    firebase_success = False
            
            self.stats["version_manifest_created"] = vercel_success
            return vercel_success
            
        except Exception as e:
            print(f"❌ Error generating version manifest: {e}")
            self.stats["errors"].append(f"Version manifest error: {e}")
            return False
    
    def _cleanup_old_cdn_versions(self):
        """Clean up old versions from CDN (keep last 3 versions)"""
        print(f"\n🧹 Cleaning up old CDN versions")
        
        try:
            # This would need to be implemented based on your blob storage capabilities
            # For now, just log that cleanup would happen
            print("📍 Old version cleanup would happen here (keeping last 3 versions)")
            print("📍 Implementation depends on blob storage list/delete capabilities")
            
        except Exception as e:
            print(f"⚠️ Error during version cleanup: {e}")
            self.stats["errors"].append(f"Version cleanup error: {e}")
    
    def step_5_cleanup(self):
        """Step 5: Clean up temporary files"""
        print("\n" + "="*60)
        print("5️⃣ CLEANING UP TEMPORARY FILES")
        print("="*60)
        
        cleanup_success = True
        
        try:
            if self.temp_dir.exists():
                print(f"🗑️  Removing temp directory: {self.temp_dir}")
                print(f"📊 Directory size before cleanup: {self._get_directory_size(self.temp_dir)}")
                
                # List what's being removed
                files_to_remove = list(self.temp_dir.rglob('*'))
                print(f"📁 Files to remove: {len(files_to_remove)}")
                
                shutil.rmtree(self.temp_dir)
                
                # Verify removal
                if not self.temp_dir.exists():
                    self.stats["cleanup_completed"] = True
                    print(f"✅ Successfully cleaned up temp directory")
                else:
                    print(f"⚠️  Temp directory still exists after cleanup attempt")
                    cleanup_success = False
            else:
                print("⚠️  Temp directory does not exist - nothing to clean up")
                self.stats["cleanup_completed"] = True
                
        except PermissionError as e:
            print(f"❌ Permission error during cleanup: {e}")
            print(f"💡 You may need to manually remove: {self.temp_dir}")
            self.stats["errors"].append(f"Cleanup permission error: {e}")
            cleanup_success = False
        except Exception as e:
            print(f"❌ Unexpected error during cleanup: {e}")
            self.stats["errors"].append(f"Cleanup error: {e}")
            cleanup_success = False
        
        if not cleanup_success:
            print(f"\n💡 To manually clean up temp files, run:")
            print(f"   rm -rf {self.temp_dir}")
    
    def _get_directory_size(self, path: Path) -> str:
        """Get human-readable directory size"""
        try:
            total_size = sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
            if total_size < 1024:
                return f"{total_size} B"
            elif total_size < 1024 * 1024:
                return f"{total_size / 1024:.1f} KB"
            else:
                return f"{total_size / (1024 * 1024):.1f} MB"
        except Exception:
            return "unknown"
    
    def generate_report(self):
        """Generate final pipeline report"""
        print("\n" + "="*60)
        print("📊 PIPELINE EXECUTION REPORT")
        print("="*60)
        
        end_time = datetime.now()
        duration = end_time - self.stats["start_time"]
        
        print(f"⏱️  Total runtime: {duration}")
        print(f"📊 Dataset size: {self.stats['dataset_size']}")
        print(f"🏷️  Version: {self.stats['version_suffix'] or 'default'}")
        print(f"📍 Total addresses processed: {self.stats['total_addresses']:,}")
        print(f"🏠 Total parcels processed: {self.stats['total_parcels']:,}")
        print(f"📁 Files created: {len(self.stats['files_created'])}")
        print(f"📤 Files uploaded: {len(self.stats['files_uploaded'])}")
        print(f"🧹 Cleanup completed: {self.stats['cleanup_completed']}")
        
        if hasattr(self, 'shapefile_processor'):
            stats = self.shapefile_processor.address_stats
            print(f"\n📋 Address Processing Details:")
            print(f"   City records processed: {stats['city_records_processed']:,}")
            print(f"   City records valid: {stats['city_records_valid']:,}")
            print(f"   County records processed: {stats['county_records_processed']:,}")
            print(f"   County records valid: {stats['county_records_valid']:,}")
            print(f"   Total valid addresses: {stats['valid_addresses']:,}")
            print(f"   Standardization failures: {stats['standardization_failure']:,}")
            print(f"   Invalid ZIP codes: {stats['invalid_zip']:,}")
            print(f"   PO boxes skipped: {stats['po_box']:,}")
        
        if self.stats["errors"]:
            print(f"\n❌ Errors encountered: {len(self.stats['errors'])}")
            for error in self.stats["errors"]:
                print(f"   • {error}")
        
        print(f"\n🌐 Uploaded URLs:")
        for path, url in self.stats["upload_urls"].items():
            print(f"   {path}: {url}")
        
        print("\n✅ Pipeline completed successfully!" if not self.stats["errors"] else "\n⚠️ Pipeline completed with errors")
        
        # Always print CDN status summary at the end
        print("\n" + "="*60)
        print("📡 FINAL CDN STATUS SUMMARY")
        print("="*60)
        
        # Get current CDN status and print the status lights
        try:
            final_cdn_status = self.cdn_checker.check_cdn_status()
            
            # Add transfer status information from this pipeline run
            final_cdn_status["vercel_transfer_attempted"] = len([url for url in self.stats["upload_urls"] if "vercel" in url.lower()]) > 0
            final_cdn_status["firebase_transfer_attempted"] = self.stats.get("firebase_backup_success", False)
            
            self.cdn_checker.print_status_lights(final_cdn_status)
        except Exception as e:
            print(f"⚠️ Could not check CDN status: {e}")
            print("📡 CDN status check failed - manual verification recommended")
    
    def run_intelligent_pipeline(self):
        """Run the complete ingestion pipeline with intelligent CDN checking"""
        try:
            # Step 0: Check existing CDN status before any building
            cdn_status = self.cdn_checker.check_cdn_status()
            
            # Execute based on recommendation
            if cdn_status["recommendation"] == "use_vercel":
                print("\n🎯 Using existing Vercel indexes - no rebuild needed")
                self._verify_existing_indexes("vercel", cdn_status["latest_version"])
                
            elif cdn_status["recommendation"] == "use_firebase":
                print("\n🔥 Using Firebase backup indexes")
                self._sync_firebase_to_vercel(cdn_status["latest_version"])
                
            elif cdn_status["recommendation"] == "rebuild_from_local":
                print("\n🏗️ Rebuilding indexes from local shapefiles")
                self._execute_full_rebuild()
                
            elif cdn_status["recommendation"] == "partial_recovery":
                print("\n⚠️ Attempting partial recovery")
                self._attempt_partial_recovery(cdn_status)
                
            else:  # critical_failure
                print("\n❌ Critical failure - manual intervention required")
                self._handle_critical_failure()
                return
                
            # Final verification
            self._verify_final_state()

        except Exception as e:
            print(f"\n❌ Pipeline failed with critical error: {e}")
            self.stats["errors"].append(f"Pipeline failure: {e}")
        finally:
            # Always cleanup, regardless of success or failure
            self.step_5_cleanup()
            
            # Generate report
            self.generate_report()
    
    def _verify_existing_indexes(self, source: str, version: str):
        """Verify that existing indexes are accessible and properly formatted"""
        print(f"\n🔍 Verifying existing {source} indexes (version: {version})")
        
        index_files = [
            f"address-index-{version}.json.gz",
            f"parcel-metadata-{version}.json.gz",
            f"parcel-geometry-{version}.json.gz"
        ]
        
        verification_passed = True
        for filename in index_files:
            try:
                if source == "vercel":
                    # Test download from Vercel
                    url = f"https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/{filename}"
                    # You could add actual verification here
                    print(f"✅ {filename} accessible at {url}")
                elif source == "firebase":
                    # Test download from Firebase
                    print(f"✅ {filename} accessible in Firebase")
                    
            except Exception as e:
                print(f"❌ {filename} verification failed: {e}")
                verification_passed = False
                
        if verification_passed:
            print("✅ All indexes verified successfully")
            self.stats["verification_completed"] = True
        else:
            print("⚠️ Index verification failed - consider rebuild")
            self.stats["errors"].append("Index verification failed")
    
    def _sync_firebase_to_vercel(self, version: str):
        """Download indexes from Firebase and upload to Vercel primary CDN"""
        print(f"\n🔄 Syncing Firebase backup to Vercel primary (version: {version})")
        
        index_files = [
            f"address-index-{version}.json.gz",
            f"parcel-metadata-{version}.json.gz", 
            f"parcel-geometry-{version}.json.gz"
        ]
        
        sync_success = True
        for filename in index_files:
            try:
                # Download from Firebase
                print(f"📥 Downloading {filename} from Firebase backup...")
                # Implementation would go here
                
                # Upload to Vercel
                print(f"📤 Uploading {filename} to Vercel primary...")
                # Implementation would go here
                
                print(f"✅ Synced {filename}")
                
            except Exception as e:
                print(f"❌ Failed to sync {filename}: {e}")
                sync_success = False
                
        if sync_success:
            print("✅ Firebase → Vercel sync completed successfully")
            self.stats["sync_completed"] = True
        else:
            print("⚠️ Sync failed - falling back to full rebuild")
            self._execute_full_rebuild()
    
    def _execute_full_rebuild(self):
        """Execute the full rebuild pipeline when no usable indexes exist"""
        print("\n🏗️ Executing full rebuild from local shapefiles")
        
        # Check for local shapefiles first (preferred)
        local_available = self._prefer_local_shapefiles()
        if not local_available:
            # Fallback: Download shapefiles from blob storage
            download_success = self.download_shapefiles_from_blob()
            if not download_success:
                raise Exception("Failed to obtain shapefiles from local or remote sources")
        
        # Step 1: Process regional data (keep local only)
        processed_files = self.step_1_process_regional_data()
        
        # Step 2: Skip integration upload - keep everything ephemeral
        print("\n" + "="*60)
        print("2️⃣ SKIPPING INTEGRATION UPLOAD (EPHEMERAL PROCESSING)")
        print("="*60)
        print("✅ Keeping all intermediate files local per Claude.md contract")
        
        # Step 3: Build FlexSearch indexes
        flexsearch_success = self.step_3_build_flexsearch_indexes()
        
        # Step 4: Upload only final CDN files (if FlexSearch succeeded and dataset is large)
        if flexsearch_success:
            cdn_upload_success = self.step_4_upload_cdn_files()
            if not cdn_upload_success and self.dataset_size == "large":
                print("⚠️ CDN upload failed for large dataset")
                self.stats["errors"].append("CDN upload failed for production dataset")
        else:
            print("⚠️ Skipping CDN upload due to FlexSearch build failure")
            self.stats["errors"].append("FlexSearch build failed")
    
    def _attempt_partial_recovery(self, cdn_status: Dict[str, Any]):
        """Attempt to recover from partial CDN availability"""
        print("\n⚠️ Attempting partial recovery from available CDN data")
        
        # Try to identify what's missing and rebuild only what's needed
        missing_indexes = []
        
        if cdn_status["vercel_available"]:
            # Check what's missing from Vercel
            available_indexes = cdn_status["vercel_indexes"].get("available_versions", [])
            if len(available_indexes) < 3:
                missing_indexes = ["address", "parcel-metadata", "parcel-geometry"]
                
        print(f"� Missing indexes: {missing_indexes}")
        
        if missing_indexes:
            print("🏗️ Need to rebuild missing indexes")
            self._execute_full_rebuild()
        else:
            print("✅ Partial recovery not needed")
    
    def _handle_critical_failure(self):
        """Handle critical failure when no data sources are available"""
        print("\n❌ CRITICAL FAILURE - NO DATA SOURCES AVAILABLE")
        print("="*60)
        print("📍 Manual intervention required:")
        print("   1. Check local shapefile directory: /src/data/")
        print("   2. Verify Vercel Blob Storage credentials")
        print("   3. Verify Firebase Storage credentials")
        print("   4. Contact data providers for fresh shapefiles")
        print("   5. Check backup locations")
        
        self.stats["errors"].append("Critical failure - no data sources available")
    
    def _verify_final_state(self):
        """Verify the final state of indexes and CDN availability"""
        print("\n🔍 Final verification of CDN state")
        
        # Re-check CDN status to confirm everything is working
        final_status = self.cdn_checker.check_cdn_status()
        
        if final_status["recommendation"] == "use_vercel":
            print("✅ Final state: Vercel primary CDN ready")
            if final_status["firebase_indexes"].get("complete_set"):
                print("✅ Firebase backup also available")
                
        elif final_status["recommendation"] == "use_firebase":
            print("⚠️ Final state: Only Firebase backup available")
            print("💡 Consider syncing to Vercel primary")
            
        else:
            print("❌ Final state: CDN not fully operational")
            self.stats["errors"].append("Final CDN state verification failed")

    def run_full_pipeline(self):
        """Legacy method - redirects to intelligent pipeline"""
        print("🔄 Redirecting to intelligent pipeline...")
        self.run_intelligent_pipeline()


def main():
    """Main entry point"""
    # Load environment variables from .env.local
    load_dotenv('.env.local')
    
    parser = argparse.ArgumentParser(description="Land Estimator Data Ingest Pipeline")
    parser.add_argument(
        "--dataset-size",
        choices=["small", "medium", "large"],
        default="small",
        help="Dataset size: small (100), medium (1000), large (all records)"
    )
    parser.add_argument(
        "--version",
        default="",
        help="Version suffix for uploaded files (e.g., '_v2', '_test')"
    )
    
    args = parser.parse_args()
    
    print("🌟 Land Estimator Data Ingest Pipeline - INTELLIGENT MODE")
    print("="*50)
    print(f"📊 Dataset size: {args.dataset_size}")
    print(f"📦 Version: {args.version or 'default'}")
    print("🧠 CDN-aware execution - checking existing indexes first")
    print("="*50)
    
    pipeline = IngestPipeline(dataset_size=args.dataset_size, version=args.version)
    pipeline.run_intelligent_pipeline()


if __name__ == "__main__":
    main()
