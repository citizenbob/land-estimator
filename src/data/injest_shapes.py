import json
import re
import os
from pathlib import Path
from collections import defaultdict
import geopandas as gpd
import pandas as pd
from dbfread import DBF

BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
SHARD_DIR = BASE_DIR / "flexsearch_shards"
SHARD_DIR.mkdir(exist_ok=True)

# Initialize address categorization trackers
address_stats = {
    "total_processed": 0,
    "valid_addresses": 0,
    "missing_number": 0,
    "missing_street": 0,
    "po_box": 0,
    "hyphenated_range": 0,
    "fractional": 0,
    "invalid_zip": 0,
    "foreign_address": 0,
    "preserved_variants": 0
}

def initialize_logs():
    """Initialize log files with headers"""
    log_files = [
        "address_validation.log",
        "missing_components.log",
        "po_box_addresses.log",
        "hyphenated_ranges.log", 
        "fractional_addresses.log",
        "invalid_zip.log",
        "foreign_addresses.log",
        "address_variants.log"
    ]
    for log_file in log_files:
        with open(LOG_DIR / log_file, "w") as f:
            f.write(f"# {log_file} created on {pd.Timestamp.now()}\n")
            f.write("# Format: JSON per line with context details\n\n")

def log_address_issue(log_file, record):
    """Log address issues to the appropriate file"""
    with open(LOG_DIR / log_file, "a") as f:
        f.write(json.dumps(record) + "\n")

def standardize_address(address):
    """Apply USPS-like standardization to address string"""
    if not address or not isinstance(address, str):
        return ""
    
    # Initial cleanup
    address = address.strip().upper()
    
    # Standardize street suffixes
    suffix_map = {
        " STREET": " ST",
        " AVENUE": " AVE",
        " BOULEVARD": " BLVD",
        " DRIVE": " DR",
        " ROAD": " RD",
        " LANE": " LN",
        " COURT": " CT",
        " PARKWAY": " PKWY",
        " HIGHWAY": " HWY",
        " CIRCLE": " CIR",
        " TERRACE": " TER",
        " PLACE": " PL"
    }
    for full, abbr in suffix_map.items():
        address = re.sub(f"{full}([, ]|$)", f"{abbr}\\1", address)
    
    # Normalize number formats
    address = re.sub(r"^(\d+)\.0\b", r"\1", address)
    
    return address

def is_po_box(address):
    """Check if address is a PO Box"""
    if not isinstance(address, str):
        return False
    po_patterns = [
        r"^P\.?O\.?\s+BOX\s+\d+",
        r"^PO\s+BOX\s+\d+",
        r"^BOX\s+\d+",
        r"^PMB\s+\d+"
    ]
    return any(re.search(pattern, address.upper()) for pattern in po_patterns)

def is_valid_zip(zip_code):
    """Check if ZIP code is valid"""
    if not zip_code or not isinstance(zip_code, str):
        return False
    zip_code = zip_code.strip()
    
    # Check for 5-digit ZIP
    if re.match(r"^\d{5}$", zip_code):
        return True
    
    # Check for ZIP+4
    if re.match(r"^\d{5}-\d{4}$", zip_code):
        return True
    
    return False

def extract_address_components(address):
    """Extract components from a full address string"""
    if not address:
        return {}
    
    # Split into parts
    parts = address.split(",")
    street_address = parts[0].strip() if parts else ""
    
    # Extract street number and name
    street_match = re.match(r"^(\d+(?:[/-]\d+)?(?:\s+\d+/\d+)?)\s+(.*?)$", street_address)
    street_num = street_match.group(1) if street_match else ""
    street_name = street_match.group(2) if street_match else street_address
    
    # Check for fractional address
    has_fraction = bool(re.search(r"\d+/\d+", street_num)) if street_num else False
    
    # Check for hyphenated range
    has_range = bool(re.search(r"\d+-\d+", street_num)) if street_num else False
    
    return {
        "street_number": street_num,
        "street_name": street_name,
        "has_fraction": has_fraction,
        "has_range": has_range,
        "street_address": street_address
    }

def expand_address_range(address_components):
    """Expand hyphenated address range into individual addresses"""
    if not address_components or not address_components.get("has_range"):
        return [address_components]
    
    street_num = address_components.get("street_number", "")
    street_name = address_components.get("street_name", "")
    range_match = re.match(r"^(\d+)-(\d+)$", street_num)
    
    if not range_match:
        return [address_components]
    
    start_num = int(range_match.group(1))
    end_num = int(range_match.group(2))
    
    # If it's a "short notation" range like 606-22 rather than 606-622
    if len(range_match.group(2)) < len(range_match.group(1)):
        end_prefix = range_match.group(1)[:-len(range_match.group(2))]
        end_num = int(end_prefix + range_match.group(2))
    
    # Limit extreme ranges to prevent excessive expansion
    if end_num - start_num > 100:
        end_num = start_num + 100
        log_address_issue("address_validation.log", {
            "issue": "extreme_range_limited",
            "original_range": street_num,
            "limited_to": f"{start_num}-{end_num}"
        })
    
    expanded = []
    for num in range(start_num, end_num + 1, 2):  # Step by 2 for typical address numbering
        expanded.append({
            "street_number": str(num),
            "street_name": street_name,
            "has_fraction": False,
            "has_range": False,
            "street_address": f"{num} {street_name}",
            "is_expanded_from_range": True,
            "original_range": street_num
        })
    
    address_stats["preserved_variants"] += len(expanded) - 1
    
    return expanded

def shard_records(records, region_prefix):
    """Shard records into separate files by first letter of street name"""
    # Handle None or empty records list
    if not records:
        print(f"⚠️ No {region_prefix} records to shard.")
        return
        
    print(f"🔄 Sharding {len(records)} {region_prefix} records...")
    shards = defaultdict(list)
    skipped = 0
    skipped_reasons = {
        "empty": 0,
        "nan_none": 0,
        "missing_components": 0
    }
    
    for record in records:
        address = record.get("full_address", "")
        
        # Skip records with invalid addresses
        if not address:
            skipped += 1
            skipped_reasons["empty"] += 1
            continue
            
        if address.startswith(("NAN", "NONE")):
            skipped += 1
            skipped_reasons["nan_none"] += 1
            continue
            
        # Check for addresses missing key components (e.g. just ", ST. LOUIS, MO")
        address_parts = address.split(",")[0].strip()
        if not address_parts or address_parts.isspace():
            skipped += 1
            skipped_reasons["missing_components"] += 1
            continue
        
        # Determine shard key based on street name
        address_parts = address.split(",")[0].strip().split(" ", 2)
        if len(address_parts) >= 3 and address_parts[1] in {"N", "S", "E", "W"}:
            shard_key = address_parts[2][0].upper()
        elif len(address_parts) >= 2:
            shard_key = address_parts[1][0].upper()
        else:
            shard_key = "_"
        
        if not shard_key.isalnum():
            shard_key = "_"
        
        shard_name = f"{region_prefix}-{shard_key}.json"
        
        # Ensure consistent rounding for numeric fields
        shards[shard_name].append({
            "id": record["id"],
            "full_address": record["full_address"],
            "latitude": round(float(record["latitude"]), 6),
            "longitude": round(float(record["longitude"]), 6),
            "estimated_landscapable_area": round(float(record["calc"]["estimated_landscapable_area"]), 2),
            "region": record["region"]
        })
    
    for filename, data in shards.items():
        with open(SHARD_DIR / filename, "w") as f:
            json.dump(data, f, separators=(",", ":"))
    
    # Print detailed information about skipped records
    if skipped > 0:
        print(f"⚠️ Skipped {skipped} invalid {region_prefix} records:")
        print(f"  - Empty addresses: {skipped_reasons['empty']}")
        print(f"  - 'NAN'/'NONE' values: {skipped_reasons['nan_none']}")
        print(f"  - Missing components: {skipped_reasons['missing_components']}")
    
    print(f"✅ Sharded {region_prefix} into {len(shards)} files. Included {sum(len(data) for data in shards.values())} records.")

def process_county():
    """Process Saint Louis County data"""
    print("🔄 Processing Saint Louis County...")
    base = BASE_DIR / "saint_louis_county" / "shapefiles"
    malformed_addresses = defaultdict(list)
    shp = base / "Parcels_Current.shp"
    shx = base / "Parcels_Current.shx"
    
    if not (shp.exists() and shx.exists()):
        print("❌ County shapefiles missing.")
        return []

    try:
        gdf = gpd.read_file(shp)
        if "LOCATOR" not in gdf.columns:
            print("❌ 'LOCATOR' missing in county shapefile.")
            return []

        gdf = gdf.to_crs(epsg=26915)
        gdf["landarea"] = gdf.geometry.area * 10.7639
        gdf["parcel_id"] = gdf["LOCATOR"].astype(str)
        gdf["building_sqft"] = pd.to_numeric(gdf.get("RESQFT", 0), errors="coerce").fillna(0)
        gdf["estimated_landscapable_area"] = (gdf["landarea"] - gdf["building_sqft"]).clip(lower=0)
    except Exception as e:
        print(f"❌ Error reading county shapefile: {str(e)}")
        return []

    def classify(propclass):
        return {"R": "residential", "C": "commercial", "I": "industrial"}.get(str(propclass).upper(), "unknown")

    def full_address(row):
        # Handle PROP_ADD
        street_val = row.get("PROP_ADD")
        street = str(street_val).strip() if street_val is not None else ""
        
        if not street:
            address_stats["missing_street"] += 1
            log_address_issue("missing_components.log", {
                "parcel_id": row.get("LOCATOR", ""),
                "issue": "missing_street",
                "data": {k: str(row.get(k, "")) for k in ["PROP_ADD", "PROP_ADRNU", "PROP_ZIP", "MUNICIPALI"]}
            })
            return "", ""
        
        # Check if starts with a number, if not try to prepend PROP_ADRNU
        if not street.split(" ", 1)[0].isdigit():
            address_stats["missing_number"] += 1
            number_val = row.get("PROP_ADRNU")
            
            # Handle NaN values and None safely
            if pd.isna(number_val) or number_val is None:
                number = ""
            else:
                number = str(int(number_val)).strip()
                
            street = f"{number} {street}".strip() if number else street
            
            # Log missing street number issue
            if not number:
                log_address_issue("missing_components.log", {
                    "parcel_id": row.get("LOCATOR", ""),
                    "issue": "missing_number",
                    "street": street,
                    "data": {k: str(row.get(k, "")) for k in ["PROP_ADD", "PROP_ADRNU", "PROP_ZIP", "MUNICIPALI"]}
                })
        
        # Check for PO Box
        if is_po_box(street):
            address_stats["po_box"] += 1
            log_address_issue("po_box_addresses.log", {
                "parcel_id": row.get("LOCATOR", ""),
                "po_box_address": street,
                "data": {k: str(row.get(k, "")) for k in ["PROP_ADD", "PROP_ADRNU", "PROP_ZIP", "MUNICIPALI"]}
            })
        
        # Check for hyphenated range in street number
        components = extract_address_components(street)
        if components.get("has_range"):
            address_stats["hyphenated_range"] += 1
            log_address_issue("hyphenated_ranges.log", {
                "parcel_id": row.get("LOCATOR", ""),
                "range_address": street,
                "components": components,
                "data": {k: str(row.get(k, "")) for k in ["PROP_ADD", "PROP_ADRNU", "PROP_ZIP", "MUNICIPALI"]}
            })
        
        # Check for fractional address
        if components.get("has_fraction"):
            address_stats["fractional"] += 1
            log_address_issue("fractional_addresses.log", {
                "parcel_id": row.get("LOCATOR", ""),
                "fractional_address": street,
                "components": components,
                "data": {k: str(row.get(k, "")) for k in ["PROP_ADD", "PROP_ADRNU", "PROP_ZIP", "MUNICIPALI"]}
            })
        
        # Strip .0 from street number
        street = re.sub(r"^(\d+)\.0\b", r"\1", street)
        
        # Handle PROP_ZIP
        zip_val = row.get("PROP_ZIP")
        raw_zip = str(zip_val).strip() if zip_val is not None else ""
        
        if not is_valid_zip(raw_zip):
            address_stats["invalid_zip"] += 1
            log_address_issue("invalid_zip.log", {
                "parcel_id": row.get("LOCATOR", ""),
                "invalid_zip": raw_zip,
                "street": street,
                "data": {k: str(row.get(k, "")) for k in ["PROP_ADD", "PROP_ADRNU", "PROP_ZIP", "MUNICIPALI"]}
            })
            zip_code = raw_zip if raw_zip.isdigit() and len(raw_zip) <= 10 else "00000"
        else:
            zip_code = raw_zip
        
        # Handle MUNICIPALI
        muni_val = row.get("MUNICIPALI")
        muni = str(muni_val).strip().upper() if muni_val is not None else "SAINT LOUIS COUNTY"
        muni_name = "Saint Louis County (Unincorporated)" if muni == "UNINCORPORATED" else muni.title()
        
        # Construct full address
        addr = f"{street}, {muni_name}, MO {zip_code}".upper().strip()
        addr = re.sub(r"^(\d+)\.0\b", r"\1", addr)
        
        # Final validation
        if addr:
            address_stats["valid_addresses"] += 1
        
        return addr, muni_name

    def affluence(row):
        score = 0
        val = row.get("TOTAPVAL", 0)
        if val > 500000:
            score += 2
        elif val > 300000:
            score += 1
        if row.get("TENURE") == "OWNER":
            score += 1
        
        # Check for out-of-state owners
        owner_state = row.get("OWN_STATE", "")
        if owner_state and owner_state != "MO":
            score += 1
            
            # Check for potentially foreign owners
            if len(owner_state) != 2 or not owner_state.isalpha():
                address_stats["foreign_address"] += 1
                log_address_issue("foreign_addresses.log", {
                    "parcel_id": row.get("LOCATOR", ""),
                    "owner_state": owner_state,
                    "data": {
                        "owner_name": str(row.get("OWNER_NAME", "")),
                        "owner_addr": str(row.get("OWN_ADDR", "")), 
                        "owner_city": str(row.get("OWN_CITY", "")),
                        "owner_zip": str(row.get("OWN_ZIP", ""))
                    }
                })
        
        return score

    results = []
    address_stats["total_processed"] = 0
    
    for _, row in gdf.iterrows():
        address_stats["total_processed"] += 1
        
        if not row.get("parcel_id"):
            continue
            
        centroid = row.geometry.centroid
        addr, region = full_address(row)
        
        # Skip rows with completely empty addresses
        if not addr:
            continue
        
        # Extract address components and handle address expansion for ranges
        components = extract_address_components(addr.split(",")[0])
        address_variants = expand_address_range(components)
        
        # Base record with common properties
        base_record = {
            "id": row["parcel_id"],
            "region": region,
            "latitude": round(float(centroid.y), 6),
            "longitude": round(float(centroid.x), 6),
            "calc": {
                "landarea": round(float(row["landarea"]), 2),
                "building_sqft": round(float(row["building_sqft"]), 2),
                "estimated_landscapable_area": round(float(row["estimated_landscapable_area"]), 2),
                "property_type": classify(row.get("PROPCLASS"))
            },
            "owner": {
                "name": str(row.get("OWNER_NAME", "")).strip()
            },
            "affluence_score": affluence(row)
        }
        
        # If we have multiple address variants, create records for each
        if len(address_variants) > 1:
            for variant in address_variants:
                variant_addr = f"{variant['street_address']}, {region}, MO {str(row.get('PROP_ZIP', '')).strip()}".upper()
                
                # Only include valid variants
                if variant.get("street_number") and variant.get("street_name"):
                    variant_record = base_record.copy()
                    variant_record["full_address"] = standardize_address(variant_addr)
                    variant_record["id"] = f"{row['parcel_id']}-{variant['street_number']}"
                    results.append(variant_record)
                    
                    # Log expanded variants
                    if variant.get("is_expanded_from_range"):
                        log_address_issue("address_variants.log", {
                            "parcel_id": row.get("LOCATOR", ""),
                            "original_address": addr,
                            "expanded_variant": variant_addr,
                            "reason": "range_expansion"
                        })
        else:
            # Just use the original address
            base_record["full_address"] = standardize_address(addr)
            results.append(base_record)
    
    if malformed_addresses:
        print(f"⚠️ County malformed addresses: {sum(len(v) for v in malformed_addresses.values())}")
        for k, samples in malformed_addresses.items():
            print(f"  - Starts with '{k}': {len(samples)} examples (e.g., {samples[:2]})")
    
    # Add debug output before returning
    print(f"✅ Processed {len(results)} county records")
    
    # Make sure we're writing the JSON file
    try:
        with open(BASE_DIR / "saint_louis_county" / "saint_louis_county-optimized.json", "w") as f:
            json.dump(results, f, separators=(",", ":"))
        print("✅ Wrote county data to JSON file")
    except Exception as e:
        print(f"❌ Error writing county JSON: {str(e)}")
    
    # Important: Make sure we're actually returning the results
    return results

def process_city():
    """Process St. Louis City data"""
    print("🔄 Processing St. Louis City...")
    base = BASE_DIR / "saint_louis_city" / "shapefiles"
    malformed_addresses = defaultdict(list)
    invalid_address_count = 0
    
    shp = base / "prcl.shp"
    shx = base / "prcl.shx"
    dbf = base / "par.dbf"
    csv = base / "parcels-basic-info.csv"
    
    if not (shp.exists() and shx.exists()):
        print("❌ City shapefiles missing.")
        return []

    # Load and merge datasets
    try:
        gdf = gpd.read_file(shp)[["HANDLE", "geometry"]]
        gdf["HANDLE"] = gdf["HANDLE"].astype(str)
        
        df_dbf = pd.DataFrame(iter(DBF(dbf, load=True)))
        df_dbf["HANDLE"] = df_dbf["HANDLE"].astype(str)
        
        df_csv = pd.read_csv(csv)
        df_csv["HANDLE"] = df_csv["HANDLE"].astype(str)
        
        merged = df_csv.merge(df_dbf, on="HANDLE", how="left")
        gdf = gdf.merge(merged, on="HANDLE", how="left").to_crs(epsg=26915)
    except Exception as e:
        print(f"❌ Error processing city data: {e}")
        return []
    
    # Calculate derived fields
    gdf["landarea"] = gdf.geometry.area * 10.7639
    gdf["building_sqft"] = pd.to_numeric(gdf.get("BDG1AREA", 0), errors="coerce").fillna(0)
    gdf["estimated_landscapable_area"] = (gdf["landarea"] - gdf["building_sqft"]).clip(lower=0)

    def classify(asr_class):
        """Classify property type based on assessment class code"""
        try:
            code = float(asr_class)
            if 100 <= code < 300:
                return "residential"
            elif 300 <= code < 500:
                return "commercial"
            elif 500 <= code < 700:
                return "industrial"
        except:
            pass
        return "unknown"

    results = []
    address_stats["total_processed"] += len(gdf)
    
    # Process each property row
    for _, row in gdf.iterrows():
        # Skip rows with missing geometry
        if row.geometry is None or row.geometry.is_empty:
            continue
        
        # Prepare address components
        addr_num = str(row.get('ADDRNUM', ''))
        street_name = str(row.get('STREETNAME', ''))
        
        # Skip records with "NAN" or "NONE" values to prevent downstream skipping
        if any(val.upper() in ("NAN", "NONE") for val in [addr_num, street_name]):
            invalid_address_count += 1
            continue
            
        # Create full address, ensuring it won't be empty or contain just commas
        if addr_num.strip() or street_name.strip():
            full_address = f"{addr_num} {street_name}, ST. LOUIS, MO".upper().strip()
            if full_address.startswith(", "):
                full_address = full_address[2:]  # Remove leading comma and space
        else:
            invalid_address_count += 1
            continue
            
        centroid = row.geometry.centroid
        results.append({
            "id": str(row.get("HANDLE", "")),
            "full_address": full_address,
            "region": "St. Louis City",
            "latitude": round(float(centroid.y), 6),
            "longitude": round(float(centroid.x), 6),
            "calc": {
                "landarea": round(float(row.get("landarea", 0)), 2),
                "building_sqft": round(float(row.get("building_sqft", 0)), 2),
                "estimated_landscapable_area": round(float(row.get("estimated_landscapable_area", 0)), 2),
                "property_type": classify(row.get("ASRCLASS1"))
            }
        })
    
    if invalid_address_count > 0:
        print(f"ℹ️ Filtered {invalid_address_count} city records with invalid addresses")
    
    print(f"✅ Processed {len(results)} city records")
    
    # Write optimized JSON output
    with open(BASE_DIR / "saint_louis_city" / "saint_louis_city-optimized.json", "w") as f:
        json.dump(results, f, separators=(",", ":"))
    
    return results

def generate_report():
    """Generate a comprehensive report on address processing"""
    print("📊 Generating address processing report...")
    
    report = [
        "# Address Processing Report",
        f"Generated on: {pd.Timestamp.now()}",
        "",
        "## Summary Statistics",
        f"- Total records processed: {address_stats['total_processed']}",
        f"- Valid addresses: {address_stats['valid_addresses']} ({round(100 * address_stats['valid_addresses'] / max(1, address_stats['total_processed']), 1)}%)",
        "",
        "## Address Quality Issues",
        f"- Missing street numbers: {address_stats['missing_number']} ({round(100 * address_stats['missing_number'] / max(1, address_stats['total_processed']), 1)}%)",
        f"- Missing street names: {address_stats['missing_street']} ({round(100 * address_stats['missing_street'] / max(1, address_stats['total_processed']), 1)}%)",
        f"- PO Box addresses: {address_stats['po_box']} ({round(100 * address_stats['po_box'] / max(1, address_stats['total_processed']), 1)}%)",
        f"- Hyphenated address ranges: {address_stats['hyphenated_range']} ({round(100 * address_stats['hyphenated_range'] / max(1, address_stats['total_processed']), 1)}%)",
        f"- Fractional addresses: {address_stats['fractional']} ({round(100 * address_stats['fractional'] / max(1, address_stats['total_processed']), 1)}%)",
        f"- Invalid ZIP codes: {address_stats['invalid_zip']} ({round(100 * address_stats['invalid_zip'] / max(1, address_stats['total_processed']), 1)}%)",
        f"- Foreign/non-standard addresses: {address_stats['foreign_address']} ({round(100 * address_stats['foreign_address'] / max(1, address_stats['total_processed']), 1)}%)",
        f"- Address variants preserved: {address_stats['preserved_variants']}",
    ]
    
    with open(BASE_DIR / "address_processing_report.md", "w") as f:
        f.write("\n".join(report))
    
    print("✅ Report generated: address_processing_report.md")

if __name__ == "__main__":
    # Initialize log files
    initialize_logs()
    
    # Process data
    city_data = process_city()
    county_data = process_county()
    
    # Generate report
    generate_report()
    
    # Shard records for search
    shard_records(city_data, "city")
    shard_records(county_data, "county")
    
    print("✅ Processing complete.")