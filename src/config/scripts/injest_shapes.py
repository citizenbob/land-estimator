import os
import json
import re
from pathlib import Path
from collections import defaultdict
from dbfread import DBF
import pandas as pd
import geopandas as gpd
import tempfile
import shutil
import firebase_admin
from firebase_admin import credentials, storage
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv(dotenv_path="/Users/duebelbytes/Sites/land-estimator/.env.local")

# Extract Firebase credentials from environment variables
firebase_project_id = os.getenv("FIREBASE_PROJECT_ID")
firebase_client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
firebase_private_key = os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n")  # Ensure proper formatting

# Create Firebase Admin SDK credentials dynamically
firebase_credentials = {
    "type": "service_account",
    "project_id": firebase_project_id,
    "private_key_id": "dummy-private-key-id",  # Replace with actual if needed
    "private_key": firebase_private_key,
    "client_email": firebase_client_email,
    "client_id": "dummy-client-id",  # Replace with actual if needed
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{firebase_client_email.replace('@', '%40')}"
}

# Initialize Firebase Admin SDK
cred = credentials.Certificate(firebase_credentials)
firebase_admin.initialize_app(cred, {
    "storageBucket": f"{firebase_project_id}.firebasestorage.app"
})
bucket = storage.bucket()

print(f"🔥 Firebase initialized with bucket: {bucket.name}")

# Create temporary directory for local processing
temp_dir = tempfile.mkdtemp()
print(f"Temporary directory created: {temp_dir}")

def fetch_file_from_storage(remote_path, temp_dir):
    """Fetch a file from Firebase Storage and save it locally."""
    local_path = f"{temp_dir}/{remote_path.split('/')[-1]}"
    blob = bucket.blob(remote_path)
    try:
        blob.download_to_filename(local_path)
        print(f"✅ Fetched {remote_path} to {local_path}")
        return local_path
    except Exception as e:
        print(f"❌ Failed to fetch {remote_path}: {e}")
        return None

def upload_file_to_storage(local_path, remote_path):
    """Upload a file to Firebase Storage."""
    blob = bucket.blob(remote_path)
    blob.upload_from_filename(local_path)
    print(f"✅ Uploaded {local_path} to {remote_path}")

# Update DATA_DIR to use the temporary directory
DATA_DIR = Path(temp_dir)

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent.parent  # Go up to land-estimator root
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

address_stats = {
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

FIELD_MAPPINGS = {
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
            "number": "LowAddrNum",         # Primary house number
            "street_primary": "SITEADDR",   # Full street address (from CSV)
            "zip": "ZIP"                    # ZIP code
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
            "number": "PROP_ADRNU", # Used as fallback if PROP_ADD lacks number
            "zip": "PROP_ZIP",
            "municipality": "MUNICIPALI"
        },
        "property_class": "PROPCLASS",
        "parcel_id": "LOCATOR"
    }
}

def get_field_value(row, region, category, field, default=None):
    try:
        field_name = FIELD_MAPPINGS[region][category][field]
        value = row.get(field_name, default)
        # Attempt numeric conversion only if the original type suggests it might be numeric
        # For now, return as is, and let specific calculations handle conversion
        return value
    except (KeyError, TypeError):
        return default

def initialize_logs():
    log_files = [
        "address_validation.log",
        "missing_components.log",
        "po_box_addresses.log",
        "hyphenated_ranges.log",
        "fractional_addresses.log",
        "invalid_zip.log",
        "foreign_addresses.log",
        "address_variants.log",
        "standardization_errors.log"
    ]
    for log_file in log_files:
        with open(LOG_DIR / log_file, "w", encoding="utf-8") as f:
            f.write(f"# {log_file} created on {pd.Timestamp.now()}\\n")
            f.write("# Format: JSON per line with context details\\n\\n")

def log_address_issue(log_file, record):
    with open(LOG_DIR / log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\\n")

def safe_to_numeric(value, default=0):
    if value is None:
        return default
    try:
        return pd.to_numeric(value)
    except (ValueError, TypeError):
        return default

def extract_parcel_geometry(geometry):
    """
    Extract and format parcel geometry for web use.
    Returns simplified GeoJSON geometry with bounding box.
    """
    if geometry is None or geometry.is_empty:
        return None
    
    try:
        # Convert to WGS84 (EPSG:4326) for web mapping
        if hasattr(geometry, 'crs') and geometry.crs and geometry.crs.to_epsg() != 4326:
            geometry_wgs84 = geometry.to_crs(epsg=4326)
        else:
            geometry_wgs84 = geometry
        
        # Get the actual geometry object (not GeoSeries)
        if hasattr(geometry_wgs84, 'iloc'):
            geom = geometry_wgs84.iloc[0] if len(geometry_wgs84) > 0 else geometry_wgs84
        else:
            geom = geometry_wgs84
            
        # Round coordinates to 5 decimal places (~1 meter precision)
        def round_coords(coords):
            if isinstance(coords[0], (list, tuple)):
                return [round_coords(coord) for coord in coords]
            else:
                return [round(coord, 5) for coord in coords]
        
        # Extract coordinates based on geometry type
        if geom.geom_type == 'Polygon':
            coords = [list(geom.exterior.coords)]
            # Add holes if they exist
            for interior in geom.interiors:
                coords.append(list(interior.coords))
            
            rounded_coords = round_coords(coords)
            
            # Calculate bounding box
            bounds = geom.bounds  # (minx, miny, maxx, maxy)
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
            
        else:
            # For other geometry types, return None for now
            return None
            
    except Exception as e:
        print(f"⚠️ Error processing geometry: {e}")
        return None

def standardize_address(full_address_str, default_city="Unknown City", default_state="MO", default_zip="63102"):
    """
    Standardize address format for consistent search indexing.
    Formats street types to Title Case with a period (e.g., St., Ave.).
    Title cases street names and city names.
    Ensures state is uppercase and ZIP is validated.
    """
    if not full_address_str or not isinstance(full_address_str, str):
        return ""

    address_str = full_address_str.strip()
    if not address_str:
        return ""

    # Normalize whitespace and common punctuation issues
    address_str = re.sub(r'\\s+', ' ', address_str)
    address_str = re.sub(r'[.,]+(?=[.,])', ',', address_str) # multiple commas/periods to one comma
    address_str = address_str.replace(' ;', ',').replace(';', ',')
    address_str = re.sub(r'\\s*\\,\\s*', ', ', address_str) # Ensure ", " for separation

    parts = [p.strip() for p in address_str.split(',') if p.strip()]

    if not parts:
        return ""

    street_part_raw = parts[0]
    city_part_raw = parts[1] if len(parts) > 1 else default_city
    state_zip_part_raw = parts[2] if len(parts) > 2 else f"{default_state} {default_zip}"

    # Standardize Street Part
    street_words = street_part_raw.split()
    standardized_street_words = []
    
    # More comprehensive street type map (Key: common abbreviation/full name (uppercase), Value: Standardized form)
    street_type_map = {
        "STREET": "St.", "ST": "St.", "STR": "St.", "STRT": "St.",
        "AVENUE": "Ave.", "AVE": "Ave.", "AV": "Ave.",
        "ROAD": "Rd.", "RD": "Rd.",
        "DRIVE": "Dr.", "DR": "Dr.",
        "LANE": "Ln.", "LN": "Ln.",
        "COURT": "Ct.", "CT": "Ct.",
        "BOULEVARD": "Blvd.", "BLVD": "Blvd.", "BL": "Blvd.",
        "PARKWAY": "Pkwy.", "PKWY": "Pkwy.", "PKY": "Pkwy.", "PARKWY": "Pkwy.",
        "CIRCLE": "Cir.", "CIR": "Cir.", "CRCL": "Cir.",
        "TERRACE": "Ter.", "TER": "Ter.", "TERR": "Ter.",
        "PLACE": "Pl.", "PL": "Pl.",
        "SQUARE": "Sq.", "SQ": "Sq.",
        "TRAIL": "Trl.", "TRL": "Trl.", "TR": "Trl.",
        "WAY": "Way",  # Typically no period
        "ALLEY": "Aly.", "ALY": "Aly.", "ALLY": "Aly.",
        "HIGHWAY": "Hwy.", "HWY": "Hwy.",
        "EXPRESSWAY": "Expy.", "EXPW": "Expy.", "EXPY": "Expy.",
        "FREEWAY": "Fwy.", "FWY": "Fwy.",
        "CAUSEWAY": "Cswy.", "CSWY": "Cswy.",
        "POINT": "Pt.", "PT": "Pt.",
        "HEIGHTS": "Hts.", "HTS": "Hts.",
        "ESTATES": "Est.", "EST": "Est.",
        "PARK": "Park", # Typically no period
        "PLAZA": "Plz.", "PLZ": "Plz.",
        "JUNCTION": "Jct.", "JCT": "Jct.",
        "CROSSING": "Xing.", "XING": "Xing.", # Common abbreviation
        "LOOP": "Loop", # Typically no period
        "DR": "Dr.", # Ensure common abbrev like DR gets period if it's a type
        "LN": "Ln.",
        "CT": "Ct.",
        "RD": "Rd.",
        # Add more as needed based on data
    }
    # Directionals should be uppercase
    directionals = {'N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW',
                    'NORTH', 'SOUTH', 'EAST', 'WEST', 
                    'NORTHEAST', 'NORTHWEST', 'SOUTHEAST', 'SOUTHWEST'}
    short_dir_map = {
        "NORTH": "N", "SOUTH": "S", "EAST": "E", "WEST": "W",
        "NORTHEAST": "NE", "NORTHWEST": "NW", "SOUTHEAST": "SE", "SOUTHWEST": "SW"
    }

    for i, word_raw in enumerate(street_words):
        word = word_raw.upper().rstrip('.,') # Clean for matching
        
        # Remove decimal points from numbers first
        word_clean = re.sub(r'^(\d+)\.0$', r'\1', word_raw)
        word = word_clean.upper().rstrip('.,')

        # Handle ordinal numbers FIRST (before street type check) like 1ST, 2ND, 3RD, 4TH
        if re.fullmatch(r'\d+(ST|ND|RD|TH)', word):
            num_match = re.match(r'(\d+)(ST|ND|RD|TH)', word)
            if num_match:
                num = int(num_match.group(1))
                suffix = num_match.group(2)
                
                # Check if this appears to be an ordinal number (not a street type)
                # If the next word is a street type (ST, AVE, etc), then this is ordinal + street type
                # If not, then this might be just an ordinal street name
                next_word_is_street_type = (i + 1 < len(street_words) and 
                                          street_words[i + 1].upper().rstrip('.,') in street_type_map)
                
                if suffix == "ST" and not next_word_is_street_type:
                    # This is likely "1ST" as in "1st Street", so convert to "1st St."
                    if num == 1:
                        standardized_street_words.append("1st St.")
                    elif num == 2:
                        standardized_street_words.append("2nd St.")
                    elif num == 3:
                        standardized_street_words.append("3rd St.")
                    elif num % 10 == 1 and num % 100 != 11:
                        standardized_street_words.append(f"{num}st St.")
                    elif num % 10 == 2 and num % 100 != 12:
                        standardized_street_words.append(f"{num}nd St.")
                    elif num % 10 == 3 and num % 100 != 13:
                        standardized_street_words.append(f"{num}rd St.")
                    else:
                        standardized_street_words.append(f"{num}th St.")
                else:
                    # This is an ordinal number followed by a separate street type, so just format the ordinal
                    if num == 1:
                        standardized_street_words.append("1st")
                    elif num == 2:
                        standardized_street_words.append("2nd")
                    elif num == 3:
                        standardized_street_words.append("3rd")
                    elif num % 10 == 1 and num % 100 != 11:
                        standardized_street_words.append(f"{num}st")
                    elif num % 10 == 2 and num % 100 != 12:
                        standardized_street_words.append(f"{num}nd")
                    elif num % 10 == 3 and num % 100 != 13:
                        standardized_street_words.append(f"{num}rd")
                    else:
                        standardized_street_words.append(f"{num}th")
        elif word in directionals:
            standardized_street_words.append(short_dir_map.get(word, word))
        elif word in street_type_map:
            # Apply street type standardization (e.g., ST -> St., AVE -> Ave.)
            standardized_street_words.append(street_type_map[word])
        elif re.fullmatch(r'\d+[A-Z]?', word) or re.fullmatch(r'[A-Z]?\d+', word) or re.fullmatch(r'\d+-\d+',word) or re.fullmatch(r'\d+/\d+',word): # House numbers, apt numbers
            # Clean decimals from house numbers and preserve
            clean_number = re.sub(r'^(\d+)\.0$', r'\1', word_raw)
            standardized_street_words.append(clean_number)
        else:
            # Title case for street name parts, but clean decimals first
            word_for_title = re.sub(r'^(\d+)\.0$', r'\1', word_raw)
            standardized_street_words.append(word_for_title.title())
    
    street_part_standardized = " ".join(standardized_street_words)
    # Additional cleanup for decimal points in house numbers
    street_part_standardized = re.sub(r'^(\d+)\.0\b', r'\1', street_part_standardized)


    # Standardize City Part
    if city_part_raw.upper() == "ST LOUIS" or city_part_raw.upper() == "SAINT LOUIS":
        city_part_standardized = "St. Louis"
    elif city_part_raw.upper() == "ST LOUIS COUNTY" or city_part_raw.upper() == "SAINT LOUIS COUNTY":
        city_part_standardized = "St. Louis County"
    elif city_part_raw.upper() == "UNINCORPORATED":
         city_part_standardized = "St. Louis County (Unincorporated)" # Or specific handling
    else:
        city_part_standardized = city_part_raw.title()


    # Standardize State and ZIP using end-of-string matching to avoid false matches
    state_zip_match = re.search(r"\b([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\b\s*$", state_zip_part_raw)
    if state_zip_match:
        state_standardized = state_zip_match.group(1).upper()
        zip_standardized = state_zip_match.group(2)
    else:
        state_standardized = default_state
        zip_standardized = default_zip

    # Validate ZIP or fallback to default
    if not is_valid_zip(zip_standardized):
        log_address_issue("invalid_zip.log", {
            "original_full_address": full_address_str,
            "parsed_zip": zip_standardized,
            "issue": "parsed_zip_invalid_or_missing_fallback_to_default"
        })
        zip_standardized = default_zip


    final_address = f"{street_part_standardized}, {city_part_standardized}, {state_standardized} {zip_standardized}"
    # Final cleanup
    final_address = re.sub(r'\\s+', ' ', final_address).strip()
    final_address = re.sub(r'\\s*\\,\\s*', ', ', final_address) # Ensure ", "
    final_address = re.sub(r'\\s*;\\s*', ', ', final_address) # Replace semicolons
    
    # Remove any remaining special characters except commas, periods, spaces, hyphens (for ZIP+4), and alphanumerics
    # This might be too aggressive, consider carefully. For now, let's trust the title casing and specific formatting.
    # final_address = re.sub(r'[^\\w\\s,\\-\\.]', '', final_address)

    return final_address


def is_po_box(address):
    if not isinstance(address, str):
        return False
    po_patterns = [
        r"\\bP\\.?O\\.?\\s+BOX\\b",
        r"\\bPO\\s+BOX\\b",
        r"\\bBOX\\s+\\d+",
        r"\\bPMB\\s+\\d+" # Private Mailbox
    ]
    return any(re.search(pattern, address.upper()) for pattern in po_patterns)

def is_valid_zip(zip_code):
    if not zip_code or not isinstance(zip_code, str):
        return False
    zip_code = zip_code.strip()
    return bool(re.fullmatch(r"^\d{5}(-\d{4})?$", zip_code))

def classify_property(property_class_code, region="city"):
    if property_class_code is None: return "unknown"
    code = str(property_class_code).strip().upper()

    if region == "city": # Based on ASRCLASS1 for St. Louis City
        if code.startswith("A"): return "residential" # Single Family
        if code.startswith("B"): return "residential" # Multi-Family
        if code.startswith("C"): return "commercial"  # Commercial
        if code.startswith("D"): return "industrial"  # Industrial
        if code.startswith("E"): return "exempt"      # Exempt (church, school, gov)
        if code.startswith("F"): return "agricultural" # Agricultural (rare in city)
        if code.startswith("X"): return "exempt" # Another exempt category
        return "other" # Other classifications
    
    elif region == "county": # Based on PROPCLASS for St. Louis County
        if code == "R" or code.startswith("RES"): return "residential"
        if code == "C" or code.startswith("COM"): return "commercial"
        if code == "I" or code.startswith("IND"): return "industrial"
        if code == "A" or code.startswith("AGR"): return "agricultural"
        if code == "E" or code.startswith("EX"): return "exempt"
        return "other"
    
    return "unknown"


def calculate_enhanced_landscapable_area(land_area, building_sqft, property_type):
    land_area = safe_to_numeric(land_area, 0)
    building_sqft = safe_to_numeric(building_sqft, 0)

    if land_area <= 0: return 0
    
    # Estimate hardscape (driveways, patios, walkways)
    estimated_hardscape = 0
    if building_sqft > 0:
        # Base hardscape: 15% of building footprint for smaller buildings, up to 25% for larger.
        # Plus a fixed amount for basic driveway/walkway.
        hardscape_ratio = min(0.15 + (building_sqft / 20000), 0.25) # Scale up to 25% for 2000sqft building
        estimated_hardscape = (building_sqft * hardscape_ratio) + 300 # 300 sqft base for walkway/small patio
    else: # Vacant lot, assume some minimal non-landscapable area or access path
        estimated_hardscape = land_area * 0.05 # 5% for very basic access or unmaintained area

    # Ensure hardscape isn't excessively large compared to land
    estimated_hardscape = min(estimated_hardscape, land_area * 0.6) # Max 60% of lot is hardscape

    landscapable = land_area - building_sqft - estimated_hardscape
    landscapable = max(0, landscapable)

    # Adjustments based on property type
    if property_type == "commercial":
        landscapable *= 0.6 # Assume more area for parking, loading, etc.
    elif property_type == "industrial":
        landscapable *= 0.3 # Assume even more area for operational space
    elif property_type == "residential" and building_sqft > 0 : # For residential, ensure it's not too small
        min_landscapable_residential = building_sqft * 0.2 # At least 20% of building footprint as yard
        landscapable = max(landscapable, min_landscapable_residential)
        landscapable = min(landscapable, land_area * 0.9) # Cap at 90% of land area

    return round(landscapable, 2)


def calculate_enhanced_affluence_score(row_data, region):
    score = 0
    
    total_assessment = safe_to_numeric(get_field_value(row_data, region, "assessment", "total"), 0)
    land_assessment = safe_to_numeric(get_field_value(row_data, region, "assessment", "land"), 0)
    improvement_assessment = safe_to_numeric(get_field_value(row_data, region, "assessment", "improvement"), 0)
    
    building_sqft = safe_to_numeric(row_data.get("building_sqft", 0), 0) # From pre-calculated field
    building_year = safe_to_numeric(get_field_value(row_data, region, "building", "year"), 0)
    land_area = safe_to_numeric(row_data.get("landarea", 0), 0) # From pre-calculated field

    # 1. Property Value (0-3 points)
    if total_assessment > 750000: score += 3
    elif total_assessment > 500000: score += 2.5
    elif total_assessment > 300000: score += 2
    elif total_assessment > 150000: score += 1
    elif total_assessment > 75000: score += 0.5

    # 2. Building Quality Proxy (Size & Age) (0-2 points total)
    if building_sqft > 0:
        # Size (0-1.5 points)
        if building_sqft > 4000: score += 1.5
        elif building_sqft > 2500: score += 1.0
        elif building_sqft > 1500: score += 0.5
        # Age (0-0.5 points, newer is better)
        if building_year > 2010: score += 0.5
        elif building_year > 1990: score += 0.25
    
    # 3. Lot Size (0-1.5 points)
    if land_area > 43560: score += 1.5 # > 1 acre
    elif land_area > 21780: score += 1.0 # > 0.5 acre
    elif land_area > 10000: score += 0.5 # > ~1/4 acre

    # 4. Improvement-to-Land Value Ratio (Indicates investment) (0-1 point)
    if land_assessment > 0 and improvement_assessment > 0:
        ratio = improvement_assessment / land_assessment
        if ratio > 5: score += 1.0 # Heavily improved
        elif ratio > 2: score += 0.5 # Well improved
        elif ratio < 0.5 and building_sqft > 0 : score -= 0.5 # Land worth more than small building on it (potential tear-down or underutilized)


    # 5. Region-specific factors (e.g., owner occupied for county) (0-0.5 points)
    if region == "county":
        owner_tenure = str(get_field_value(row_data, region, "owner", "tenure", "")).upper()
        if owner_tenure == "OWNER": score += 0.25
        
        owner_state = str(get_field_value(row_data, region, "owner", "state", "")).upper()
        if owner_state and owner_state != "MO" and len(owner_state) == 2:
            score -= 0.25 # Potential absentee landlord, could be negative for "neighborhood affluence" feel

    # Normalize score to 0-5 range
    score = max(0, min(5, score))
    return round(score, 2)

def process_city():
    print("🔄 Processing St. Louis City...")
    base = DATA_DIR / "saint_louis_city" / "shapefiles"
    results = []
    geometry_data = {}

    # Fetch required files from Firebase Storage
    shp_path = fetch_file_from_storage("parcel-source/saint-louis-city/shapefiles/prcl.shp", temp_dir)
    shx_path = fetch_file_from_storage("parcel-source/saint-louis-city/shapefiles/prcl.shx", temp_dir)
    dbf_path = fetch_file_from_storage("parcel-source/saint-louis-city/shapefiles/prcl.dbf", temp_dir)
    prj_path = fetch_file_from_storage("parcel-source/saint-louis-city/shapefiles/prcl.prj", temp_dir)
    csv_path = fetch_file_from_storage("parcel-source/saint-louis-city/shapefiles/parcels-basic-info.csv", temp_dir)

    if not shp_path or not Path(shp_path).exists():
        print(f"❌ City shapefile missing or failed to fetch")
        return [], {}
    if not shx_path or not Path(shx_path).exists():
        print(f"❌ City SHX file missing or failed to fetch")
        return [], {}
    if not dbf_path or not Path(dbf_path).exists():
        print(f"❌ City DBF file missing or failed to fetch")
    if not prj_path or not Path(prj_path).exists():
        print(f"⚠️ City PRJ file missing or failed to fetch - will attempt to determine CRS from coordinates")
    if not csv_path or not Path(csv_path).exists():
        print(f"❌ City CSV file missing or failed to fetch")

    try:
        # Load shapefile for geometry and parcel IDs
        gdf_shape = gpd.read_file(shp_path)
        
        # Verify coordinate ranges before any CRS operations
        print(f"📊 Original coordinate ranges - X: {gdf_shape.bounds.minx.min():.2f} to {gdf_shape.bounds.maxx.max():.2f}, Y: {gdf_shape.bounds.miny.min():.2f} to {gdf_shape.bounds.maxy.max():.2f}")
        
        # Sample a few geometries to show original coordinates
        sample_coords = []
        for i in range(min(3, len(gdf_shape))):
            geom = gdf_shape.iloc[i].geometry
            if hasattr(geom, 'exterior'):
                coords = list(geom.exterior.coords)[:3]  # First 3 points
                sample_coords.extend(coords)
        print(f"🔍 Sample original coordinates: {sample_coords[:6]}")  # Show first 6 coordinate pairs
        
        # Check if CRS is defined, if not try to read from .prj file
        if gdf_shape.crs is None:
            print("⚠️ No CRS found in shapefile, attempting to read from .prj file...")
            
            # Try to read CRS from .prj file
            if prj_path and Path(prj_path).exists():
                try:
                    with open(prj_path, 'r') as prj_file:
                        prj_content = prj_file.read().strip()
                    print(f"📄 Found .prj file content: {prj_content[:100]}...")
                    
                    # Create CRS from WKT string
                    from pyproj import CRS
                    crs_from_prj = CRS.from_wkt(prj_content)
                    gdf_shape = gdf_shape.set_crs(crs_from_prj)
                    print(f"✅ Successfully set CRS from .prj file: {crs_from_prj}")
                    
                except Exception as e:
                    print(f"⚠️ Failed to read CRS from .prj file: {e}")
                    # Fall back to coordinate-based detection
                    x_min, x_max = gdf_shape.bounds.minx.min(), gdf_shape.bounds.maxx.max()
                    y_min, y_max = gdf_shape.bounds.miny.min(), gdf_shape.bounds.maxy.max()
                    
                    print("⚠️ Falling back to coordinate-based CRS detection...")
                    
                    # Check different possible coordinate systems based on ranges
                    # Missouri State Plane East (EPSG:2815) typical ranges in US Survey Feet:
                    # X: roughly 575,000-600,000, Y: roughly 970,000-1,000,000 for St. Louis area
                    if (570000 <= x_min <= 610000 and 570000 <= x_max <= 610000 and
                        970000 <= y_min <= 1010000 and 970000 <= y_max <= 1010000):
                        # These coordinates look like they're in State Plane Missouri East (feet)
                        print("✅ Coordinates appear to be Missouri State Plane East (US Survey Feet) - setting to EPSG:2815")
                        gdf_shape = gdf_shape.set_crs(epsg=2815)
                    elif (1600000 <= x_min <= 2600000 and 1100000 <= y_min <= 2000000):
                        # Missouri State Plane West in feet
                        print("✅ Coordinates appear to be Missouri State Plane West (feet) - setting to EPSG:26916")
                        gdf_shape = gdf_shape.set_crs(epsg=26916)
                    elif (700000 <= x_min <= 800000 and 4200000 <= y_min <= 4400000):
                        # UTM Zone 15N in meters
                        print("✅ Coordinates appear to be UTM Zone 15N (meters) - setting to EPSG:26915")
                        gdf_shape = gdf_shape.set_crs(epsg=26915)
                    else:
                        # Default fallback - based on coordinate ranges, likely Missouri East State Plane
                        print(f"⚠️ Coordinate ranges don't match known systems exactly:")
                        print(f"   X: {x_min:.0f} to {x_max:.0f}, Y: {y_min:.0f} to {y_max:.0f}")
                        print("   Assuming Missouri State Plane East (EPSG:2815) as best guess")
                        gdf_shape = gdf_shape.set_crs(epsg=2815)
            else:
                # No .prj file, fall back to coordinate-based detection
                x_min, x_max = gdf_shape.bounds.minx.min(), gdf_shape.bounds.maxx.max()
                y_min, y_max = gdf_shape.bounds.miny.min(), gdf_shape.bounds.maxy.max()
                
                print("⚠️ No .prj file available, using coordinate-based CRS detection...")
                
                # Same coordinate-based detection logic as above
                if (570000 <= x_min <= 610000 and 570000 <= x_max <= 610000 and
                    970000 <= y_min <= 1010000 and 970000 <= y_max <= 1010000):
                    print("✅ Coordinates appear to be Missouri State Plane East (US Survey Feet) - setting to EPSG:2815")
                    gdf_shape = gdf_shape.set_crs(epsg=2815)
                elif (1600000 <= x_min <= 2600000 and 1100000 <= y_min <= 2000000):
                    print("✅ Coordinates appear to be Missouri State Plane West (feet) - setting to EPSG:26916")
                    gdf_shape = gdf_shape.set_crs(epsg=26916)
                elif (700000 <= x_min <= 800000 and 4200000 <= y_min <= 4400000):
                    print("✅ Coordinates appear to be UTM Zone 15N (meters) - setting to EPSG:26915")
                    gdf_shape = gdf_shape.set_crs(epsg=26915)
                else:
                    print(f"⚠️ Coordinate ranges don't match known systems exactly:")
                    print(f"   X: {x_min:.0f} to {x_max:.0f}, Y: {y_min:.0f} to {y_max:.0f}")
                    print("   Assuming Missouri State Plane East (EPSG:2815) as best guess")
                    gdf_shape = gdf_shape.set_crs(epsg=2815)
        else:
            print(f"✅ CRS found in shapefile: {gdf_shape.crs}")
        
        # Transform to NAD83 / UTM zone 15N for area calculation
        gdf_shape = gdf_shape.to_crs(epsg=26915)
        
        # Verify coordinates after transformation
        print(f"📊 After transform to EPSG:26915 - X: {gdf_shape.bounds.minx.min():.2f} to {gdf_shape.bounds.maxx.max():.2f}, Y: {gdf_shape.bounds.miny.min():.2f} to {gdf_shape.bounds.maxy.max():.2f}")
        
        # Sample coordinates after transformation
        sample_coords_after = []
        for i in range(min(3, len(gdf_shape))):
            geom = gdf_shape.iloc[i].geometry
            if hasattr(geom, 'exterior'):
                coords = list(geom.exterior.coords)[:3]
                sample_coords_after.extend(coords)
        print(f"🔍 Sample transformed coordinates: {sample_coords_after[:6]}")
        
        # Validate UTM coordinates are reasonable for St. Louis area
        # St. Louis area in UTM Zone 15N (EPSG:26915): roughly X: 700,000-750,000, Y: 4,250,000-4,310,000
        x_min_utm, x_max_utm = gdf_shape.bounds.minx.min(), gdf_shape.bounds.maxx.max()
        y_min_utm, y_max_utm = gdf_shape.bounds.miny.min(), gdf_shape.bounds.maxy.max()
        
        if (680000 <= x_min_utm <= 780000 and 680000 <= x_max_utm <= 780000 and
            4200000 <= y_min_utm <= 4350000 and 4200000 <= y_max_utm <= 4350000):
            print("✅ UTM coordinates appear correct for St. Louis area")
        else:
            print(f"⚠️ WARNING: UTM coordinates outside expected St. Louis range!")
            print(f"   Expected X: 680,000-780,000, Got: {x_min_utm:.0f}-{x_max_utm:.0f}")
            print(f"   Expected Y: 4,200,000-4,350,000, Got: {y_min_utm:.0f}-{y_max_utm:.0f}")
            print("   This may indicate CRS issues - please verify geometry manually!")
        
        gdf_shape["landarea"] = gdf_shape.geometry.area * 10.7639
        
        parcel_id_field = FIELD_MAPPINGS["city"]["parcel_id"]
        if parcel_id_field not in gdf_shape.columns:
            print(f"❌ Parcel ID field '{parcel_id_field}' not found in city shapefile.")
            return [], {}
        gdf_shape[parcel_id_field] = gdf_shape[parcel_id_field].astype(str)

        # Load CSV for address and basic info, DBF for assessment data
        df_csv = pd.read_csv(csv_path, low_memory=False)
        df_csv[parcel_id_field] = df_csv[parcel_id_field].astype(str)
        
        df_dbf = pd.DataFrame(iter(DBF(dbf_path, load=True, encoding='latin1')))
        df_dbf[parcel_id_field] = df_dbf[parcel_id_field].astype(str)

        # Merge: shapes + CSV (addresses) + DBF (assessments)
        gdf = gdf_shape.merge(df_csv, on=parcel_id_field, how="left")
        gdf = gdf.merge(df_dbf, on=parcel_id_field, how="left", suffixes=('', '_dbf'))
            
    except Exception as e:
        print(f"❌ Error loading or merging city data: {e}")
        return [], {}

    address_stats["city_records_processed"] = len(gdf)

    for _, row in gdf.iterrows():
        parcel_id = str(row.get(parcel_id_field, "")).strip() # Use the already defined parcel_id_field
        if not parcel_id:
            continue

        # Extract geometry for this parcel
        geometry_data[parcel_id] = extract_parcel_geometry(row.geometry)

        # Address components from FIELD_MAPPINGS
        # Use SITEADDR directly as it contains the complete street address
        raw_street_address = get_field_value(row, "city", "address", "street_primary", "")
        full_street_address = str(raw_street_address).strip()
        zip_code_raw = str(get_field_value(row, "city", "address", "zip", "")).strip()

        # Check for missing or invalid street addresses (empty, "nan", "NaN", etc.)
        if not full_street_address or full_street_address.lower() in ['nan', 'none', 'null']:
            address_stats["missing_city_components"] += 1
            log_address_issue("missing_components.log", {
                "parcel_id": parcel_id, "region": "city", "issue": "missing_street_address",
                "data": {
                    "raw_siteaddr": raw_street_address,
                    "converted_str": full_street_address
                }
            })
            continue
        
        # Clean up the street address (remove extra spaces)
        street_line = re.sub(r'\\s+', ' ', full_street_address).strip()
        # street_line = re.sub(r'\\s+', ' ', street_line).strip() # Already done for street_content

        # Extract raw ZIP and normalize numeric representations
        zip_val = get_field_value(row, "city", "address", "zip", "")
        zip_code_raw = str(zip_val).strip()
        # Remove trailing .0 from float ZIP values (e.g., 63104.0)
        zip_code_raw = re.sub(r"\.0$", "", zip_code_raw)

        if not is_valid_zip(zip_code_raw):
            address_stats["invalid_zip"] += 1
            log_address_issue("invalid_zip.log", {"parcel_id": parcel_id, "region": "city", "invalid_zip": zip_code_raw, "street": street_line})
            zip_code = "63102" # Default ZIP for St. Louis City downtown area
        else:
            zip_code = zip_code_raw
            
        # Construct raw full address for standardization
        # City name is St. Louis, State MO
        raw_full_address = f"{street_line}, St. Louis, MO {zip_code}"
        standardized_address = standardize_address(raw_full_address, default_city="St. Louis")

        if not standardized_address:
            address_stats["standardization_failure"] += 1
            log_address_issue("standardization_errors.log", {"parcel_id": parcel_id, "region": "city", "raw_address": raw_full_address})
            continue
        
        if is_po_box(standardized_address):
            address_stats["po_box"] += 1
            log_address_issue("po_box_addresses.log", {"parcel_id": parcel_id, "region": "city", "address": standardized_address})
            # Decide whether to skip PO Boxes or not; for now, process them.
            
        address_stats["valid_addresses"] += 1
        address_stats["city_records_valid"] += 1

        # Metadata
        land_area = safe_to_numeric(row.get("landarea"), 0)
        building_sqft_raw = get_field_value(row, "city", "building", "area")
        building_sqft = safe_to_numeric(building_sqft_raw, 0)
        
        # Estimate building_sqft if missing and has improvement value
        if building_sqft == 0:
            improvement_val = safe_to_numeric(get_field_value(row, "city", "assessment", "improvement"), 0)
            if improvement_val > 0 and land_area > 0:
                # Simple estimation: assume $100/sqft improvement value, cap at 70% of land area
                estimated_bldg = improvement_val / 100
                building_sqft = min(estimated_bldg, land_area * 0.7)


        prop_class_code = get_field_value(row, "city", "property_class", None)
        property_type = classify_property(prop_class_code, "city")
        
        est_landscapable_area = calculate_enhanced_landscapable_area(land_area, building_sqft, property_type)
        
        # Pass a dictionary-like object (row) to affluence calculation
        row_dict_for_affluence = row.to_dict()
        row_dict_for_affluence["landarea"] = land_area # ensure calculated values are present
        row_dict_for_affluence["building_sqft"] = building_sqft
        affluence = calculate_enhanced_affluence_score(row_dict_for_affluence, "city")

        centroid = row.geometry.centroid
        
        # Create single address record (simplified - no range expansion for now)
        results.append({
            "id": parcel_id,
            "original_parcel_id": parcel_id,
            "full_address": standardized_address,
            "region": "St. Louis City",
            "latitude": round(centroid.y, 6) if centroid else 0,
            "longitude": round(centroid.x, 6) if centroid else 0,
            "calc": {
                "landarea_sqft": land_area,
                "building_sqft": round(building_sqft,2),
                "estimated_landscapable_area_sqft": est_landscapable_area,
                "property_type": property_type,
                "year_built": int(safe_to_numeric(get_field_value(row, "city", "building", "year"),0)),
            },
            "assessment": {
                "total_value": safe_to_numeric(get_field_value(row, "city", "assessment", "total"),0),
                "land_value": safe_to_numeric(get_field_value(row, "city", "assessment", "land"),0),
                "improvement_value": safe_to_numeric(get_field_value(row, "city", "assessment", "improvement"),0),
            },
            "owner": {
                "name": str(get_field_value(row, "city", "owner", "name", "")).strip(),
            },
            "affluence_score": affluence,
            "source_file": "StLouisCity_Parcels"
        })
            
    print(f"✅ Processed {address_stats['city_records_valid']} valid city records out of {address_stats['city_records_processed']}.")
    if results:
        try:
            city_output_path = DATA_DIR / "saint_louis_city-processed.json"
            with open(city_output_path, "w", encoding="utf-8") as f:
                json.dump(results, f, separators=(",", ":"))
            print(f"✅ Wrote city data to JSON file: {city_output_path}")
            
            # Upload to Firebase Storage
            upload_file_to_storage(str(city_output_path), "parcel-source/saint-louis-city/saint_louis_city-processed.json")
        except Exception as e:
            print(f"❌ Error writing city JSON: {e}")
    return results, geometry_data


def process_county():
    print("🔄 Processing Saint Louis County...")
    base = DATA_DIR / "saint_louis_county" / "shapefiles"
    results = []
    geometry_data = {}

    # Fetch required files from Firebase Storage
    shp_path = fetch_file_from_storage("parcel-source/saint-louis-county/shapefiles/Parcels_Current.shp", temp_dir)
    shx_path = fetch_file_from_storage("parcel-source/saint-louis-county/shapefiles/Parcels_Current.shx", temp_dir)
    dbf_path = fetch_file_from_storage("parcel-source/saint-louis-county/shapefiles/Parcels_Current.dbf", temp_dir)
    prj_path = fetch_file_from_storage("parcel-source/saint-louis-county/shapefiles/Parcels_Current.prj", temp_dir)

    if not shp_path or not Path(shp_path).exists():
        print(f"❌ County shapefile missing or failed to fetch")
        return [], {}
    if not shx_path or not Path(shx_path).exists():
        print(f"❌ County SHX file missing or failed to fetch")
        return [], {}
    if not prj_path or not Path(prj_path).exists():
        print(f"⚠️ County PRJ file missing or failed to fetch - will attempt to determine CRS from coordinates")

    try:
        gdf = gpd.read_file(shp_path)
        
        # Check if CRS is defined, if not try to read from .prj file
        if gdf.crs is None:
            print("⚠️ No CRS found in county shapefile, attempting to read from .prj file...")
            
            # Try to read CRS from .prj file
            if prj_path and Path(prj_path).exists():
                try:
                    with open(prj_path, 'r') as prj_file:
                        prj_content = prj_file.read().strip()
                    print(f"📄 Found county .prj file content: {prj_content[:100]}...")
                    
                    # Create CRS from WKT string
                    from pyproj import CRS
                    crs_from_prj = CRS.from_wkt(prj_content)
                    gdf = gdf.set_crs(crs_from_prj)
                    print(f"✅ Successfully set county CRS from .prj file: {crs_from_prj}")
                    
                except Exception as e:
                    print(f"⚠️ Failed to read county CRS from .prj file: {e}")
                    print("⚠️ Falling back to default CRS assumption (EPSG:26916)")
                    gdf = gdf.set_crs(epsg=26916)
            else:
                print("⚠️ No county .prj file available, using default CRS assumption (EPSG:26916)")
                gdf = gdf.set_crs(epsg=26916)
        else:
            print(f"✅ CRS found in county shapefile: {gdf.crs}")
            
        # Project for area calculation
        gdf = gdf.to_crs(epsg=26915) 
        gdf["landarea"] = gdf.geometry.area * 10.7639 # Sq meters to Sq feet
    except Exception as e:
        print(f"❌ Error reading county shapefile: {e}")
        return [], {}

    parcel_id_field_county = FIELD_MAPPINGS["county"]["parcel_id"]
    if parcel_id_field_county not in gdf.columns:
        print(f"❌ Parcel ID field '{parcel_id_field_county}' not found in county shapefile.")
        return [], {}
    
    address_stats["county_records_processed"] = len(gdf)

    for _, row in gdf.iterrows():
        parcel_id = str(row.get(parcel_id_field_county, "")).strip()
        if not parcel_id:
            continue

        # Extract geometry for this parcel
        geometry_data[parcel_id] = extract_parcel_geometry(row.geometry)

        raw_address_raw = get_field_value(row, "county", "address", "full", "")
        raw_address = str(raw_address_raw).strip()
        raw_zip = str(get_field_value(row, "county", "address", "zip", "")).strip()
        raw_municipality = str(get_field_value(row, "county", "address", "municipality", "")).strip().title()

        # Check for missing or invalid addresses (empty, "nan", "NaN", etc.)
        if not raw_address or raw_address.lower() in ['nan', 'none', 'null']: # Try to construct if PROP_ADD is missing but number is present
            addr_num_fallback = str(get_field_value(row, "county", "address", "number", "")).strip()
            if addr_num_fallback:
                # This is a guess, assuming street name might be in another field or needs lookup
                # For now, if PROP_ADD is empty, we might not have enough to form a full address.
                log_address_issue("missing_components.log", {
                    "parcel_id": parcel_id, "region": "county", "issue": "missing_PROP_ADD",
                    "data": {
                        "PROP_ADRNU": addr_num_fallback, 
                        "MUNI": raw_municipality,
                        "raw_address": raw_address_raw,
                        "converted_str": raw_address
                    }
                })
            address_stats["missing_street"] +=1
            continue
        
        # Build full address with street, city, state, and ZIP
        city_to_use = raw_municipality or "St. Louis County"
        if city_to_use.upper() == "UNINCORPORATED":
            city_to_use = "St. Louis County (Unincorporated)"
        # Use raw ZIP if valid, else log and fallback to default
        if is_valid_zip(raw_zip):
            zip_to_use = raw_zip
        else:
            address_stats["invalid_zip"] += 1
            log_address_issue("invalid_zip.log", {"parcel_id": parcel_id, "region": "county", "invalid_zip": raw_zip, "address": raw_address})
            zip_to_use = raw_zip
        full_address_for_std = f"{raw_address}, {city_to_use}, MO {zip_to_use}"
        standardized_address = standardize_address(
            full_address_for_std,
            default_city=city_to_use,
            default_state="MO",
            default_zip=zip_to_use
        )

        if not standardized_address:
            address_stats["standardization_failure"] += 1
            log_address_issue("standardization_errors.log", {"parcel_id": parcel_id, "region": "county", "raw_address": full_address_for_std})
            continue

        if is_po_box(standardized_address):
            address_stats["po_box"] += 1
            log_address_issue("po_box_addresses.log", {"parcel_id": parcel_id, "region": "county", "address": standardized_address})
            # Decide whether to skip
        
        address_stats["valid_addresses"] += 1
        address_stats["county_records_valid"] += 1

        # Metadata
        land_area = safe_to_numeric(row.get("landarea"), 0)
        building_sqft_raw = get_field_value(row, "county", "building", "area")
        building_sqft = safe_to_numeric(building_sqft_raw, 0)

        prop_class_code = get_field_value(row, "county", "property_class", None)
        property_type = classify_property(prop_class_code, "county")

        est_landscapable_area = calculate_enhanced_landscapable_area(land_area, building_sqft, property_type)
        
        row_dict_for_affluence = row.to_dict()
        row_dict_for_affluence["landarea"] = land_area
        row_dict_for_affluence["building_sqft"] = building_sqft
        affluence = calculate_enhanced_affluence_score(row_dict_for_affluence, "county")

        centroid = row.geometry.centroid

        # Create single address record (simplified - no range expansion for now)
        results.append({
            "id": parcel_id,
            "original_parcel_id": parcel_id,
            "full_address": standardized_address,
            "region": raw_municipality.title() if raw_municipality else "St. Louis County",
            "latitude": round(centroid.y, 6) if centroid else 0,
            "longitude": round(centroid.x, 6) if centroid else 0,
            "calc": {
                "landarea_sqft": land_area,
                "building_sqft": round(building_sqft,2),
                "estimated_landscapable_area_sqft": est_landscapable_area,
                "property_type": property_type,
                "year_built": int(safe_to_numeric(get_field_value(row, "county", "building", "year"),0)),
            },
            "assessment": {
                "total_value": safe_to_numeric(get_field_value(row, "county", "assessment", "total"),0),
                "land_value": safe_to_numeric(get_field_value(row, "county", "assessment", "land"),0),
                "improvement_value": safe_to_numeric(get_field_value(row, "county", "assessment", "improvement"),0),
            },
            "owner": {
                "name": str(get_field_value(row, "county", "owner", "name", "")).strip(),
                "tenure": str(get_field_value(row, "county", "owner", "tenure", "")).strip(),
                "owner_state": str(get_field_value(row, "county", "owner", "state", "")).strip(),
            },
            "affluence_score": affluence,
            "source_file": "StLouisCounty_Parcels_Current"
        })

    print(f"✅ Processed {address_stats['county_records_valid']} valid county records out of {address_stats['county_records_processed']}.")
    if results:
        try:
            county_output_path = DATA_DIR / "saint_louis_county-processed.json"
            with open(county_output_path, "w", encoding="utf-8") as f:
                json.dump(results, f, separators=(",", ":"))
            print(f"✅ Wrote county data to JSON file: {county_output_path}")
            
            # Upload to Firebase Storage
            upload_file_to_storage(str(county_output_path), "parcel-source/saint-louis-county/saint_louis_county-processed.json")
        except Exception as e:
            print(f"❌ Error writing county JSON: {e}")
    return results, geometry_data

def create_unified_data(city_data, county_data, city_geometry_data=None, county_geometry_data=None):
    print("🔄 Creating unified data files...")
    
    all_data = city_data + county_data
    if not all_data:
        print("⚠️ No data from city or county to unify.")
        return {}, [], {}

    # Deduplicate based on a combination of factors if IDs are not unique across datasets
    # For now, assume 'id' (parcel_id or variant_id) should be unique for entries in the final files.
    # If original_parcel_id is the true unique key for metadata, use that.
    
    search_index = {} # id: full_address
    metadata_records_dict = {} # original_parcel_id: metadata_object (to ensure one metadata entry per original parcel)
    geometry_index = {} # original_parcel_id: geometry_data

    processed_original_ids = set()

    for record in all_data:
        # For search index, each variant gets an entry
        search_index[record["id"]] = record["full_address"]
        
        # For metadata, store one entry per original_parcel_id, preferably the non-variant one or first variant
        original_id = record["original_parcel_id"]
        if original_id not in processed_original_ids:
            metadata_records_dict[original_id] = {
                "id": original_id, # Use original parcel ID for metadata key
                "primary_full_address": record["full_address"], # Address of the first variant encountered or main address
                "latitude": record["latitude"],
                "longitude": record["longitude"],
                "region": record["region"],
                "calc": {
                    "landarea": record["calc"]["landarea_sqft"],  # Rename to match frontend expectation
                    "building_sqft": record["calc"]["building_sqft"],
                    "estimated_landscapable_area": record["calc"]["estimated_landscapable_area_sqft"],  # Rename to match frontend
                    "property_type": record["calc"]["property_type"]
                },
                "owner": {
                    "name": record.get("owner", {}).get("name", "")  # Only name is needed for display
                },
                "affluence_score": record.get("affluence_score", 0)
            }
            processed_original_ids.add(original_id)

    # Process geometry data
    all_geometry_data = {}
    if city_geometry_data:
        all_geometry_data.update(city_geometry_data)
    if county_geometry_data:
        all_geometry_data.update(county_geometry_data)
    
    # Add geometry to index for parcels that have it
    for original_id in processed_original_ids:
        if original_id in all_geometry_data:
            geometry_index[original_id] = all_geometry_data[original_id]

    metadata_records_list = list(metadata_records_dict.values())

    lookup_file = DATA_DIR / "address_index.json"
    with open(lookup_file, 'w', encoding="utf-8") as f:
        json.dump(search_index, f, separators=(',', ':'))
    print(f"✅ Created address_index.json with {len(search_index):,} address variants.")
    
    metadata_file = DATA_DIR / "parcel_metadata.json"
    with open(metadata_file, 'w', encoding="utf-8") as f:
        json.dump(metadata_records_list, f, separators=(',', ':'))
    print(f"✅ Parcel metadata written to {metadata_file} for {len(metadata_records_list):,} unique parcels.")
    
    # Create geometry index file
    geometry_file = DATA_DIR / "parcel_geometry_index.json"
    with open(geometry_file, 'w', encoding="utf-8") as f:
        json.dump(geometry_index, f, separators=(',', ':'))
    print(f"✅ Created parcel_geometry_index.json with {len(geometry_index):,} parcel geometries.")
    
    # Upload unified data to Firebase Storage
    upload_file_to_storage(str(lookup_file), "integration/address_index.json")
    upload_file_to_storage(str(metadata_file), "integration/parcel_metadata.json")
    upload_file_to_storage(str(geometry_file), "integration/parcel_geometry_index.json")

    return search_index, metadata_records_list, geometry_index

def generate_report():
    print("📊 Generating address processing report...")
    total_processed_overall = address_stats['city_records_processed'] + address_stats['county_records_processed']
    if total_processed_overall == 0: total_processed_overall = 1 # Avoid division by zero

    report_path = BASE_DIR / "address_processing_report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Address Processing Report\\n")
        f.write(f"Generated on: {pd.Timestamp.now()}\\n\\n")
        
        f.write("## Overall Summary\\n")
        f.write(f"- Total Records Processed (City + County): {total_processed_overall:,}\\n")
        f.write(f"- Total Valid Standardized Addresses: {address_stats['valid_addresses']:,} ({address_stats['valid_addresses'] / total_processed_overall:.1%})\\n\\n")

        f.write("## City Data Summary\\n")
        f.write(f"- City Records Processed: {address_stats['city_records_processed']:,}\\n")
        f.write(f"- City Records with Valid Standardized Address: {address_stats['city_records_valid']:,} ({address_stats['city_records_valid'] / max(1,address_stats['city_records_processed']):.1%})\\n")
        f.write(f"- City Records Missing Number/Street Name: {address_stats['missing_city_components']:,}\\n\\n")

        f.write("## County Data Summary\\n")
        f.write(f"- County Records Processed: {address_stats['county_records_processed']:,}\\n")
        f.write(f"- County Records with Valid Standardized Address: {address_stats['county_records_valid']:,} ({address_stats['county_records_valid'] / max(1,address_stats['county_records_processed']):.1%})\\n")
        f.write(f"- County Records Missing PROP_ADD (Full Address): {address_stats['missing_street']:,}\\n\\n")
        
        f.write("## Address Quality Issues\\n")
        f.write(f"- Standardization Failures: {address_stats['standardization_failure']:,}\\n")
        f.write(f"- PO Box Addresses Encountered: {address_stats['po_box']:,}\\n")
        f.write(f"- Invalid ZIP Codes Encountered: {address_stats['invalid_zip']:,}\\n")

    print(f"✅ Report generated: {report_path}")


if __name__ == "__main__":
    try:
        pd.set_option('display.float_format', lambda x: '%.2f' % x)  # Pandas display option

        initialize_logs()

        city_processed_data, city_geometry_data = process_city()
        county_processed_data, county_geometry_data = process_county()

        search_index, metadata_data, geometry_index = create_unified_data(
            city_processed_data, county_processed_data,
            city_geometry_data, county_geometry_data
        )

        generate_report()  # Generate report after all processing and unification

        print("\n✅ Processing finished.")
        print(f"📁 Generated search index with {len(search_index):,} address variants.")
        print(f"📁 Generated metadata for {len(metadata_data):,} unique parcels.")
        print(f"📁 Generated geometry index for {len(geometry_index):,} parcels.")
        print(f"ℹ️ Detailed logs are in: {LOG_DIR}")
        print(f"ℹ️ Detailed report at: {BASE_DIR / 'address_processing_report.md'}")
    finally:
        # Cleanup temporary files
        shutil.rmtree(temp_dir)
        print(f"🧹 Temporary directory cleaned up: {temp_dir}")
