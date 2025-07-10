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
import tarfile
import io
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict

# Third-party imports
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from dbfread import DBF
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Import local modules
# Add the scripts directory to Python path to ensure local imports work
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Inline blob client functionality
class BlobClient:
    """Inline Vercel Blob Storage client using Node.js subprocess"""
    
    def __init__(self):
        self.uploader_script = Path(__file__).parent / "upload_blob.js"
        
        if not self.uploader_script.exists():
            print("⚠️ upload_blob.js not found - blob uploads will fail")
    
    def upload_file(self, local_file_path, blob_path, content_type="application/json"):
        """Upload a file to Vercel Blob Storage"""
        try:
            result = subprocess.run(
                ["node", str(self.uploader_script), str(local_file_path), blob_path],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                stdout_lines = result.stdout.strip().split('\n')
                last_line = stdout_lines[-1] if stdout_lines else ""
                
                try:
                    response = json.loads(last_line)
                    return response
                except json.JSONDecodeError:
                    for line in stdout_lines:
                        if "Upload successful:" in line:
                            url = line.split("Upload successful: ")[-1]
                            return {"success": True, "url": url}
                    return {"success": True, "url": "unknown"}
            else:
                print(f"❌ Blob upload failed: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"❌ Blob upload error: {e}")
            return None
    
    def list_files(self, prefix=None):
        """List files in blob storage"""
        try:
            cmd = ["node", str(self.uploader_script), "--list"]
            if prefix:
                cmd.extend(["--prefix", prefix])
                
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                stdout_lines = result.stdout.strip().split('\n')
                last_line = stdout_lines[-1] if stdout_lines else ""
                try:
                    return json.loads(last_line)
                except json.JSONDecodeError:
                    return {"blobs": []}
            return {"blobs": []}
            
        except Exception as e:
            print(f"❌ Blob list error: {e}")
            return {"blobs": []}
    
    def delete_file(self, blob_path):
        """Delete a file from blob storage"""
        try:
            result = subprocess.run(
                ["node", str(self.uploader_script), "--delete", blob_path],
                capture_output=True, 
                text=True,
                timeout=60
            )
            return result.returncode == 0
        except Exception as e:
            print(f"❌ Blob delete error: {e}")
            return False

# Stub Firebase backup class (optional)
class FirebaseBackupCDN:
    """Stub Firebase backup - implement if needed"""
    def __init__(self):
        self.available = False
        
    def initialize(self):
        return False
        
    def upload_file(self, local_path, remote_path):
        return False

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
            vercel_response = self.blob_client.list_files(prefix="cdn/")
            vercel_files = vercel_response.get("blobs", []) if isinstance(vercel_response, dict) else []
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
            # Handle both string and dict formats
            if isinstance(file_info, dict):
                pathname = file_info.get('pathname', '')
            else:
                pathname = str(file_info)
                
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
            
            # Transform centroid to WGS84 lat/lng if needed
            if hasattr(row.geometry, 'crs') and row.geometry.crs and row.geometry.crs.to_epsg() != 4326:
                # Create a GeoSeries with the centroid and transform it
                centroid_gdf = gpd.GeoSeries([centroid], crs=row.geometry.crs)
                centroid_wgs84 = centroid_gdf.to_crs(epsg=4326).iloc[0]
                lat, lng = centroid_wgs84.y, centroid_wgs84.x
            else:
                # If no CRS or already WGS84, assume it's in UTM Zone 15N (common for Missouri)
                # This handles the case where coordinates are clearly projected but CRS is missing
                if abs(centroid.x) > 180 or abs(centroid.y) > 90:
                    # Coordinates are clearly projected, assume UTM Zone 15N
                    centroid_gdf = gpd.GeoSeries([centroid], crs='EPSG:26915')  # UTM Zone 15N
                    centroid_wgs84 = centroid_gdf.to_crs(epsg=4326).iloc[0]
                    lat, lng = centroid_wgs84.y, centroid_wgs84.x
                else:
                    # Already in WGS84 decimal degrees
                    lat, lng = centroid.y, centroid.x
            
            results.append({
                "id": parcel_id,
                "original_parcel_id": parcel_id,
                "full_address": standardized_address,
                "region": "St. Louis City",
                "latitude": round(lat, 6) if centroid else 0,
                "longitude": round(lng, 6) if centroid else 0,
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
            
            # Transform centroid to WGS84 lat/lng if needed
            if hasattr(row.geometry, 'crs') and row.geometry.crs and row.geometry.crs.to_epsg() != 4326:
                # Create a GeoSeries with the centroid and transform it
                centroid_gdf = gpd.GeoSeries([centroid], crs=row.geometry.crs)
                centroid_wgs84 = centroid_gdf.to_crs(epsg=4326).iloc[0]
                lat, lng = centroid_wgs84.y, centroid_wgs84.x
            else:
                # If no CRS or already WGS84, assume it's in UTM Zone 15N (common for Missouri)
                # This handles the case where coordinates are clearly projected but CRS is missing
                if abs(centroid.x) > 180 or abs(centroid.y) > 90:
                    # Coordinates are clearly projected, assume UTM Zone 15N
                    centroid_gdf = gpd.GeoSeries([centroid], crs='EPSG:26915')  # UTM Zone 15N
                    centroid_wgs84 = centroid_gdf.to_crs(epsg=4326).iloc[0]
                    lat, lng = centroid_wgs84.y, centroid_wgs84.x
                else:
                    # Already in WGS84 decimal degrees
                    lat, lng = centroid.y, centroid.x
            
            results.append({
                "id": parcel_id,
                "original_parcel_id": parcel_id,
                "full_address": standardized_address,
                "region": raw_municipality.title() if raw_municipality else "St. Louis County",
                "latitude": round(lat, 6) if centroid else 0,
                "longitude": round(lng, 6) if centroid else 0,
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
            "version_manifest_created": False,
            "cold_storage_uploads": 0
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
        
        # Skip downloading from blob, use only local data
        shapefiles_available = self._prefer_local_shapefiles()
        
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
        
        print("\n📋 Creating regional index files...")
        index_files = self._create_regional_indexes(city_data, county_data, city_geometry, county_geometry)
        
        return processed_files + index_files
    
    def _create_regional_indexes(self, city_data: List[Dict], county_data: List[Dict], 
                               city_geometry: Dict, county_geometry: Dict) -> List[Path]:
        """Create FlexSearch Document Mode bundles: document.json and lookup.json for each region"""
        if not city_data and not county_data:
            print("⚠️ No data to create indexes from")
            return []
        
        print("\n📋 Creating FlexSearch Document Mode bundles with versioned naming...")
        index_files = []
        
        # Create output directory in src/data/tmp (final destination)
        data_tmp_dir = self.project_root / "src" / "data" / "tmp"
        data_tmp_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate version suffix for this run
        timestamp = datetime.now().strftime("%Y%m%d")
        version_hash = f"{hash(str(timestamp + self.current_version)) & 0xffffffff:08x}"[-8:]
        version_suffix = f"{timestamp}-{version_hash}"
        
        # Process each region separately with FlexSearch Document Mode
        regions = [
            ("stl_city", city_data, city_geometry),
            ("stl_county", county_data, county_geometry)
        ]
        
        for region_name, region_data, region_geometry in regions:
            if not region_data:
                print(f"⚠️ No data for {region_name}, skipping...")
                continue
                
            print(f"\n🏗️ Building {region_name} FlexSearch Document Mode bundles...")
            
            # Create FlexSearch Document Mode array: simple id + full_address pairs
            documents = []
            lookup_index = {}
            
            for record in region_data:
                # FlexSearch Document Mode: each document is just id + searchable text
                documents.append({
                    "id": record["id"],
                    "full_address": record["full_address"]
                })
                
                # Lookup index: everything else mapped by ID
                original_id = record["original_parcel_id"]
                if original_id not in lookup_index:
                    lookup_record = {
                        "region": record["region"],
                        "latitude": record["latitude"],
                        "longitude": record["longitude"],
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
                    
                    # Include geometry directly in lookup if available
                    if original_id in region_geometry:
                        lookup_record["geometry"] = region_geometry[original_id]
                    
                    lookup_index[original_id] = lookup_record
            
            # Write FlexSearch Document Mode file: region-VERSION-document.json
            document_file = data_tmp_dir / f"{region_name}-{version_suffix}-document.json"
            with open(document_file, 'w', encoding='utf-8') as f:
                json.dump(documents, f, separators=(',', ':'))
            index_files.append(document_file)
            self.stats["files_created"].append(str(document_file))
            print(f"✅ Created {region_name}-{version_suffix}-document.json: {len(documents):,} documents")
            
            # Write lookup file: region-VERSION-lookup.json
            lookup_file = data_tmp_dir / f"{region_name}-{version_suffix}-lookup.json"
            with open(lookup_file, 'w', encoding='utf-8') as f:
                json.dump(lookup_index, f, separators=(',', ':'))
            index_files.append(lookup_file)
            self.stats["files_created"].append(str(lookup_file))
            print(f"✅ Created {region_name}-{version_suffix}-lookup.json: {len(lookup_index):,} lookups")
        
        # Create latest.json manifest 
        regions_info = []
        for region_name, region_data, _ in regions:
            if region_data:
                regions_info.append({
                    "region": region_name,
                    "version": version_suffix,
                    "document_file": f"{region_name}-{version_suffix}-document.json",
                    "lookup_file": f"{region_name}-{version_suffix}-lookup.json"
                })
        
        latest_manifest = {
            "regions": regions_info,
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "version": version_suffix,
                "total_regions": len(regions_info),
                "source": "ingest_pipeline_document_mode"
            }
        }
        
        latest_file = data_tmp_dir / "latest.json"
        with open(latest_file, 'w', encoding='utf-8') as f:
            json.dump(latest_manifest, f, separators=(',', ':'))
        index_files.append(latest_file)
        self.stats["files_created"].append(str(latest_file))
        print(f"✅ Created latest.json manifest: {len(regions_info)} regions")
        
        # Update stats with total counts
        self.stats["total_addresses"] = len(city_data) + len(county_data)
        self.stats["total_parcels"] = len(city_data) + len(county_data)
        
        return index_files
    
    def step_2_upload_integration_data_DEPRECATED(self, processed_files: List[Path]):
        """Step 2: Upload regional processed files to integration bucket (DEPRECATED - replaced by cold storage)"""
        print("\n" + "="*60)
        print("2️⃣ SKIPPING INTEGRATION UPLOAD (EPHEMERAL PROCESSING)")
        print("="*60)
        
        print("✅ Keeping all intermediate files local per Claude.md contract")
        
        # Copy files to src/data/tmp directory for next step
        data_tmp_dir = self.project_root / "src" / "data" / "tmp"
        data_tmp_dir.mkdir(parents=True, exist_ok=True)
        
        for file_path in processed_files:
            if file_path.name.endswith("_index.json"):
                # Copy only index files to src/data/tmp
                dest_path = data_tmp_dir / file_path.name
                shutil.copy2(file_path, dest_path)
                print(f"✅ Copied {file_path.name} to {dest_path}")
                self.stats["files_created"].append(str(dest_path))
    
    def step_2_upload_cold_storage(self) -> bool:
        """Step 2: Upload regional document and lookup files to CDN storage"""
        print("\n" + "="*60)
        print("2️⃣ UPLOADING REGIONAL DOCUMENT & LOOKUP FILES")
        print("="*60)
        
        # Define regional files to upload from src/data/tmp directory
        data_tmp_dir = self.project_root / "src" / "data" / "tmp"
        cold_storage_files = []
        
        # Find all document and lookup files
        document_files = list(data_tmp_dir.glob("*-document.json"))
        lookup_files = list(data_tmp_dir.glob("*-lookup.json"))
        manifest_files = list(data_tmp_dir.glob("latest.json"))
        
        for file_path in document_files:
            cold_storage_files.append((file_path, "document"))
        for file_path in lookup_files:
            cold_storage_files.append((file_path, "lookup"))
        for file_path in manifest_files:
            cold_storage_files.append((file_path, "manifest"))
        
        if not cold_storage_files:
            print("⚠️ No FlexSearch document/lookup files found to upload")
            return False
        
        print(f"📋 Found {len(cold_storage_files)} FlexSearch files to upload")
        
        upload_success = True
        uploaded_files = []
        
        try:
            for file_path, file_type in cold_storage_files:
                print(f"\n🔄 Processing {file_path.name}...")
                
                # For FlexSearch files, serve raw JSON (not compressed) for browser compatibility
                cdn_filename = f"search/{file_path.name}"
                
                # Upload to Vercel Blob Storage (CDN)
                try:
                    blob_result = self.blob_client.upload_file(
                        str(file_path),
                        cdn_filename,
                        "application/json"
                    )

                    if blob_result and blob_result.get('success'):
                        print(f"✅ Uploaded to Vercel Blob: {cdn_filename}")
                        uploaded_files.append({
                            "type": file_type,
                            "filename": cdn_filename,
                            "url": blob_result.get('url'),
                            "size": file_path.stat().st_size
                        })
                    else:
                        print(f"⚠️ Failed to upload {file_path.name} to Vercel Blob")
                        upload_success = False

                except Exception as e:
                    print(f"❌ Error uploading {file_path.name} to Vercel Blob: {e}")
                    upload_success = False

                # Upload to Firebase (backup)
                try:
                    firebase_path = f"search/{file_path.name}"
                    firebase_result = self.firebase_backup.upload_file(
                        str(file_path),
                        firebase_path
                    )

                    if firebase_result:
                        print(f"✅ Uploaded to Firebase: {firebase_path}")
                    else:
                        print(f"⚠️ Failed to upload {file_path.name} to Firebase")

                except Exception as e:
                    print(f"❌ Error uploading {file_path.name} to Firebase: {e}")
            
            print(f"\n✅ FlexSearch upload completed - {len(uploaded_files)} files uploaded")
            self.stats["cold_storage_uploads"] = len(uploaded_files)
            
            return upload_success
            
        except Exception as e:
            print(f"❌ Critical error during FlexSearch upload: {e}")
            self.stats["errors"].append(f"FlexSearch upload failed: {e}")
            return False
    
    def step_3_build_flexsearch_indexes(self):
        """Step 3: FlexSearch indexes are now built directly in Python during step 1"""
        print("\n" + "="*60)
        print("3️⃣ FLEXSEARCH INDEXES BUILT IN PYTHON")
        print("="*60)
        
        print("✅ FlexSearch Document Mode bundles already created in step 1")
        print("� Files created:")
        
        # List the document and lookup files created
        data_tmp_dir = self.project_root / "src" / "data" / "tmp"
        document_files = list(data_tmp_dir.glob("*-document.json"))
        lookup_files = list(data_tmp_dir.glob("*-lookup.json"))
        manifest_files = list(data_tmp_dir.glob("latest.json"))
        
        for file_path in document_files:
            print(f"   ✅ {file_path.name}")
        for file_path in lookup_files:
            print(f"   ✅ {file_path.name}")
        for file_path in manifest_files:
            print(f"   ✅ {file_path.name}")
        
        total_files = len(document_files) + len(lookup_files) + len(manifest_files)
        print(f"\n📊 Total FlexSearch files ready: {total_files}")
        
        return total_files > 0
    
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
    
    def cleanup_old_cdn_versions(self, keep_versions: int = 3):
        """Clean up old CDN versions, keeping only the latest N versions"""
        print(f"\n🧹 Cleaning up old CDN versions (keeping latest {keep_versions})...")
        
        try:
            # Get all files in CDN directory
            vercel_response = self.blob_client.list_files(prefix="cdn/")
            vercel_files = vercel_response.get("blobs", []) if isinstance(vercel_response, dict) else []
            firebase_files = []
            
            # Try to get Firebase files if the method exists
            if hasattr(self.firebase_backup, 'list_files'):
                firebase_files = self.firebase_backup.list_files(prefix="cdn/")
            else:
                print("   ℹ️  Firebase list_files method not available, skipping Firebase cleanup")
            
            # Extract version information from filenames
            version_files = {}
            
            for file_info in vercel_files:
                # Handle both string and dict formats
                if isinstance(file_info, dict):
                    filename = file_info.get('pathname', '')
                else:
                    filename = str(file_info)
                    
                # Look for versioned files like stl_city-parcel_metadata-20250708-abc123.json.gz
                match = re.search(r'-(\d{8}-\w{6,8})\.json\.gz$', filename)
                if match:
                    version = match.group(1)
                    if version not in version_files:
                        version_files[version] = {'vercel': [], 'firebase': []}
                    version_files[version]['vercel'].append(filename)
            
            for file_info in firebase_files:
                filename = file_info.get('name', '')
                match = re.search(r'-(\d{8}-\w{6,8})\.json\.gz$', filename)
                if match:
                    version = match.group(1)
                    if version not in version_files:
                        version_files[version] = {'vercel': [], 'firebase': []}
                    version_files[version]['firebase'].append(filename)
            
            # Sort versions by date (newest first)
            sorted_versions = sorted(version_files.keys(), reverse=True)
            
            print(f"📋 Found {len(sorted_versions)} versions: {sorted_versions}")
            
            if len(sorted_versions) <= keep_versions:
                print(f"✅ Only {len(sorted_versions)} versions found, no cleanup needed")
                return
            
            # Delete old versions
            versions_to_delete = sorted_versions[keep_versions:]
            print(f"🗑️  Deleting {len(versions_to_delete)} old versions: {versions_to_delete}")
            
            deleted_count = 0
            for version in versions_to_delete:
                print(f"\n🗑️  Cleaning up version: {version}")
                
                # Delete from Vercel Blob
                for filename in version_files[version]['vercel']:
                    try:
                        result = self.blob_client.delete_file(filename)
                        if result:
                            print(f"   ✅ Deleted from Vercel: {filename}")
                            deleted_count += 1
                        else:
                            print(f"   ⚠️ Failed to delete from Vercel: {filename}")
                    except Exception as e:
                        print(f"   ❌ Error deleting from Vercel {filename}: {e}")
                
                # Delete from Firebase
                for filename in version_files[version]['firebase']:
                    try:
                        if hasattr(self.firebase_backup, 'delete_file'):
                            result = self.firebase_backup.delete_file(filename)
                            if result:
                                print(f"   ✅ Deleted from Firebase: {filename}")
                                deleted_count += 1
                            else:
                                print(f"   ⚠️ Failed to delete from Firebase: {filename}")
                        else:
                            print(f"   ℹ️  Firebase delete_file method not available")
                    except Exception as e:
                        print(f"   ❌ Error deleting from Firebase {filename}: {e}")
            
            print(f"\n✅ Cleanup completed - deleted {deleted_count} files from {len(versions_to_delete)} old versions")
            
        except Exception as e:
            print(f"❌ Error during CDN cleanup: {e}")
            self.stats["errors"].append(f"CDN cleanup error: {e}")

    def cleanup_non_versioned_cdn_files(self):
        """Remove any non-versioned files from CDN directory to ensure only versioned files exist"""
        print("\n🧹 Cleaning up non-versioned CDN files...")
        
        try:
            files_response = self.blob_client.list_files(prefix="cdn/")
            files = files_response.get("blobs", []) if isinstance(files_response, dict) else []
            
            non_versioned_files = []
            versioned_files = []
            manifest_files = []
            legacy_files = []
            
            for file_info in files:
                # Handle both string and dict formats
                if isinstance(file_info, dict):
                    filename = file_info.get('pathname', '')
                else:
                    filename = str(file_info)
                    
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
        """Step 4: Upload versioned regional parcel files to CDN with Firebase backup"""
        print("\n" + "="*60)
        print("4️⃣ UPLOADING VERSIONED FILES TO CDN WITH BACKUP")
        print("="*60)
        
        # Address index files are already in /public/search from the FlexSearch builder
        # Now upload regional parcel metadata and geometry files to CDN
        print("\n📤 Uploading regional parcel metadata and geometry files to CDN (with Firebase backup)...")
        
        # Find all regional parcel metadata and geometry files
        data_tmp_dir = self.project_root / "src" / "data" / "tmp"
        regional_files = []
        
        for pattern in ["*-parcel_metadata.json", "*-parcel_geometry.json"]:
            for file_path in data_tmp_dir.glob(pattern):
                regional_files.append(file_path)
        
        if not regional_files:
            print("⚠️ No regional parcel files found to upload")
            return True
        
        # Create compressed versions and upload
        uploaded_count = 0
        timestamp = datetime.now().strftime("%Y%m%d")
        version_hash = f"{hash(str(timestamp)) & 0xffffffff:08x}"[-8:]
        uploaded_files = {}
        
        for source_file in regional_files:
            print(f"📦 Compressing {source_file.name}...")
            
            # Create compressed version
            compressed_file = self.temp_dir / f"{source_file.name}.gz"
            try:
                with open(source_file, 'rb') as f_in:
                    with gzip.open(compressed_file, 'wb') as f_out:
                        f_out.write(f_in.read())
                
                print(f"✅ Compressed {source_file.name} → {compressed_file.name}")
                
                # Create versioned remote path
                base_name = source_file.stem  # e.g., "stl_city-parcel_metadata"
                remote_name = f"{base_name}-v{timestamp}-{version_hash}.json.gz"
                remote_path = f"cdn/{remote_name}"
                
                # Upload to primary CDN
                if hasattr(self, 'blob_client') and self.blob_client:
                    try:
                        result = self.blob_client.upload_file(compressed_file, remote_path)
                        if result and 'url' in result:
                            print(f"✅ Uploaded to CDN: {remote_path}")
                            self.stats["files_uploaded"].append(remote_path)
                            self.stats["upload_urls"][remote_path] = result['url']
                            uploaded_files[base_name] = {
                                "url": result['url'],
                                "filename": remote_name,
                                "size": compressed_file.stat().st_size,
                                "timestamp": datetime.now().isoformat(),
                                "original_size": source_file.stat().st_size,
                                "compression_ratio": f"{compressed_file.stat().st_size / source_file.stat().st_size:.2%}"
                            }
                            uploaded_count += 1
                        else:
                            print(f"❌ Failed to upload to CDN: {remote_path}")
                    except Exception as e:
                        print(f"❌ CDN upload error for {remote_path}: {e}")
                
                # Backup to Firebase Storage
                if hasattr(self, 'firebase_backup') and self.firebase_backup:
                    try:
                        result = self.firebase_backup.upload_file(compressed_file, remote_path)
                        if result:
                            print(f"✅ Backed up to Firebase: {remote_path}")
                        else:
                            print(f"⚠️ Firebase backup failed for {remote_path}")
                    except Exception as e:
                        print(f"❌ Firebase backup error for {remote_path}: {e}")
                
                # Clean up compressed file
                compressed_file.unlink()
                
            except Exception as e:
                print(f"❌ Error compressing {source_file.name}: {e}")
                continue
        
        # Generate and upload manifest if files were uploaded
        if uploaded_files:
            version_manifest = {
                "version": f"v{timestamp}-{version_hash}",
                "generated": datetime.now().isoformat(),
                "files": uploaded_files,
                "note": "Only parcel metadata and geometry files are stored in cold storage - address index is client-side only"
            }
            
            manifest_path = self.temp_dir / "version-manifest.json"
            with open(manifest_path, 'w', encoding='utf-8') as f:
                json.dump(version_manifest, f, indent=2)
            
            # Upload manifest to primary CDN
            if hasattr(self, 'blob_client') and self.blob_client:
                try:
                    result = self.blob_client.upload_file(manifest_path, "cdn/version-manifest.json")
                    if result and 'url' in result:
                        print(f"✅ Uploaded version manifest")
                        self.stats["files_uploaded"].append("cdn/version-manifest.json")
                        self.stats["upload_urls"]["cdn/version-manifest.json"] = result['url']
                    else:
                        print("❌ Failed to upload version manifest")
                        self.stats["errors"].append("Failed to upload version manifest")
                except Exception as e:
                    print(f"❌ Manifest upload error: {e}")
            
            # Backup manifest to Firebase
            if hasattr(self, 'firebase_backup') and self.firebase_backup:
                try:
                    result = self.firebase_backup.upload_file(manifest_path, "cdn/version-manifest.json")
                    if result:
                        print(f"✅ Backed up version manifest to Firebase")
                    else:
                        print(f"⚠️ Firebase manifest backup failed")
                except Exception as e:
                    print(f"❌ Firebase manifest backup error: {e}")
        
        print(f"\n📊 Uploaded {uploaded_count}/{len(regional_files)} parcel files to CDN")
        
        # Clean up old versions after successful uploads
        if uploaded_count > 0:
            self.cleanup_old_cdn_versions(keep_versions=3)
        
        return uploaded_count > 0
    
    def run_intelligent_pipeline(self):
        """Run the complete ingestion pipeline with local-only processing"""
        try:
            # Skip CDN checking, always use local data
            print("\n�️ Using local-only mode per refactor instructions")
            self._execute_full_rebuild()
            
            # Skip final CDN verification
            print("\n✅ Local processing completed successfully")

        except Exception as e:
            print(f"\n❌ Pipeline failed with critical error: {e}")
            self.stats["errors"].append(f"Pipeline failure: {e}")
        finally:
            # Always cleanup, regardless of success or failure
            self.step_5_cleanup()
            
            # Generate report
            self.generate_report()
    
    def _execute_full_rebuild(self):
        """Execute the full rebuild pipeline when no usable indexes exist"""
        print("\n🏗️ Executing full rebuild from local shapefiles")
        
        # Only use local shapefiles (per refactor instructions)
        local_available = self._prefer_local_shapefiles()
        if not local_available:
            # No fallback to downloads - fail if local files not available
            print("❌ Local shapefiles not found - pipeline cannot continue")
            print("📋 Please ensure shapefiles are available in src/data directory")
            raise Exception("Local shapefiles required for processing - no remote fallback")
        
        # Step 1: Process regional data (keep local only)
        processed_files = self.step_1_process_regional_data()
        
        # Step 2: Upload regional cold storage files (metadata and geometry)
        cold_storage_success = self.step_2_upload_cold_storage()
        if not cold_storage_success:
            print("⚠️ Cold storage upload had issues, but continuing with pipeline")
        
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

    def _copy_to_public_search(self):
        """Copy regional address index files to public/search directory for client-side use"""
        public_search_dir = self.project_root / "public" / "search"
        public_search_dir.mkdir(parents=True, exist_ok=True)
        
        # Regional files to copy - only the address index files should go to public/search
        # Parcel metadata and geometry should only be in cold storage
        regional_files = [
            "saint_louis_city-address_index.json",
            "saint_louis_county-address_index.json"
        ]
        
        print(f"\n📋 Copying regional address index files to public/search for client-side use...")
        
        copied_count = 0
        for filename in regional_files:
            source_file = self.temp_raw_dir / filename
            if source_file.exists():
                # Copy directly with the same name (no timestamp/hash needed for regional files)
                dest_path = public_search_dir / filename
                
                try:
                    shutil.copy2(source_file, dest_path)
                    copied_count += 1
                    print(f"✅ Copied {filename} to {dest_path}")
                except Exception as e:
                    print(f"❌ Error copying {filename}: {e}")
            else:
                print(f"⚠️ Source file not found: {source_file}")
                    
        # Create a basic version manifest for regional files
        version_manifest = {
            "timestamp": datetime.now().isoformat(),
            "version": f"v{datetime.now().strftime('%Y%m%d')}",
            "type": "regional_sharded",
            "regions": ["saint_louis_city", "saint_louis_county"],
            "files_copied": copied_count
        }
        
        manifest_path = public_search_dir / "version-manifest-dev.json"
        try:
            with open(manifest_path, 'w') as f:
                json.dump(version_manifest, f, indent=2)
            print(f"✅ Created {manifest_path}")
        except Exception as e:
            print(f"❌ Error creating version manifest: {e}")
        
        print(f"📊 Copied {copied_count}/{len(regional_files)} files to {public_search_dir}")
        return copied_count > 0
    
    def step_5_cleanup(self):
        """Clean up temp directories"""
        try:
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)
                print(f"🧹 Cleaned up {self.temp_dir}")
            if self.temp_raw_dir.exists():
                shutil.rmtree(self.temp_raw_dir)
                print(f"🧹 Cleaned up {self.temp_raw_dir}")
            self.stats["cleanup_completed"] = True
        except Exception as e:
            print(f"⚠️ Cleanup failed: {e}")
            self.stats["cleanup_completed"] = False

    def generate_report(self):
        """Generate and print a summary report of the pipeline execution"""
        print("\n============================================================")
        print("📊 PIPELINE EXECUTION SUMMARY")
        print("============================================================")
        
        # Execution time
        end_time = datetime.now()
        execution_time = end_time - self.stats.get("start_time", end_time)
        print(f"⏱️  Execution Time: {execution_time}")
        
        # Basic stats
        print(f"📊 Dataset Size: {self.stats.get('dataset_size', 'unknown')}")
        print(f"🏷️  Version: {self.stats.get('current_version', 'unknown')}")
        print(f"📍 Total Addresses: {self.stats.get('total_addresses', 0)}")
        print(f"📦 Total Parcels: {self.stats.get('total_parcels', 0)}")
        
        # File statistics
        files_created = self.stats.get('files_created', [])
        files_uploaded = self.stats.get('files_uploaded', [])
        print(f"📄 Files Created: {len(files_created)}")
        print(f"☁️  Files Uploaded: {len(files_uploaded)}")
        print(f"❄️  Cold Storage Uploads: {self.stats.get('cold_storage_uploads', 0)}")
        
        # Processing flags
        print(f"🏠 Local Shapefiles Used: {self.stats.get('local_shapefiles_used', False)}")
        print(f"🔥 Firebase Backup Success: {self.stats.get('firebase_backup_success', False)}")
        print(f"📝 Version Manifest Created: {self.stats.get('version_manifest_created', False)}")
        print(f"🧹 Cleanup Completed: {self.stats.get('cleanup_completed', False)}")
        
        # Address processing stats (if available from processor)
        if hasattr(self, 'shapefile_processor') and hasattr(self.shapefile_processor, 'address_stats'):
            print("\n🏠 Address Processing Statistics:")
            for key, value in self.shapefile_processor.address_stats.items():
                formatted_key = key.replace('_', ' ').title()
                print(f"   {formatted_key}: {value}")
        
        # Errors (if any)
        errors = self.stats.get('errors', [])
        if errors:
            print(f"\n⚠️  Errors Encountered ({len(errors)}):")
            for i, error in enumerate(errors, 1):
                print(f"   {i}. {error}")
        else:
            print("\n✅ No errors encountered")
        
        print("\n✅ Pipeline execution summary complete")
        
if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Ingest shapefile data and build search indexes')
    parser.add_argument('--dataset-size', choices=['small', 'medium', 'large'], 
                        default='small', help='Size of dataset to process')
    parser.add_argument('--version', type=str, default='', 
                        help='Version suffix for output files')
    
    args = parser.parse_args()
    
    print("🚀 Starting Regional Ingest Pipeline")
    print(f"📊 Dataset size: {args.dataset_size}")
    print(f"🏷️  Version suffix: {args.version or 'auto-generated'}")
    
    try:
        pipeline = IngestPipeline(dataset_size=args.dataset_size, version=args.version)
        pipeline.run_full_pipeline()
    except Exception as e:
        print(f"❌ Pipeline failed with error: {e}")
