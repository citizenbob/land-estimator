#!/usr/bin/env python3
"""
Address Index Schema Validator

Validates that *-address_index.json files have the correct structure
for the FlexSearch regional sharded index pipeline.

Usage:
  python3 address-index-schema-validator.py data/tmp/
  python3 address-index-schema-validator.py data/tmp/stl_city-address_index.json

Expected schema:
{
  "addresses": [
    {
      "id": string,
      "full_address": string,
      "region": string,
      "latitude": number,
      "longitude": number
    }
  ],
  "metadata": {
    "region": string,
    "total_addresses": number,
    "build_time": string,
    "source": string,
    "version": string
  }
}
"""
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Union


def validate_address_record(record: Dict[str, Any], index: int) -> List[str]:
    """Validate a single address record"""
    errors = []
    
    # Required fields
    required_fields = {
        'id': str,
        'full_address': str,
        'region': str,
        'latitude': (int, float),
        'longitude': (int, float)
    }
    
    for field, expected_type in required_fields.items():
        if field not in record:
            errors.append(f"Record {index}: missing required field '{field}'")
        elif not isinstance(record[field], expected_type):
            errors.append(f"Record {index}: field '{field}' should be {expected_type.__name__}, got {type(record[field]).__name__}")
    
    # Validate coordinates are reasonable
    if 'latitude' in record and isinstance(record['latitude'], (int, float)):
        if not (-90 <= record['latitude'] <= 90):
            if record['latitude'] > 1000:  # Likely projected coordinates
                errors.append(f"Record {index}: latitude {record['latitude']} appears to be projected coordinates (UTM/State Plane), not WGS84 decimal degrees. Convert to lat/lng first.")
            else:
                errors.append(f"Record {index}: latitude {record['latitude']} is out of valid range [-90, 90]")
    
    if 'longitude' in record and isinstance(record['longitude'], (int, float)):
        if not (-180 <= record['longitude'] <= 180):
            if abs(record['longitude']) > 1000:  # Likely projected coordinates
                errors.append(f"Record {index}: longitude {record['longitude']} appears to be projected coordinates (UTM/State Plane), not WGS84 decimal degrees. Convert to lat/lng first.")
            else:
                errors.append(f"Record {index}: longitude {record['longitude']} is out of valid range [-180, 180]")
    
    # Validate non-empty strings
    string_fields = ['id', 'full_address', 'region']
    for field in string_fields:
        if field in record and isinstance(record[field], str) and not record[field].strip():
            errors.append(f"Record {index}: field '{field}' cannot be empty")
    
    return errors


def validate_metadata(metadata: Dict[str, Any]) -> List[str]:
    """Validate metadata structure"""
    errors = []
    
    required_fields = {
        'region': str,
        'total_addresses': int,
        'build_time': str,
        'source': str,
        'version': str
    }
    
    for field, expected_type in required_fields.items():
        if field not in metadata:
            errors.append(f"Metadata: missing required field '{field}'")
        elif not isinstance(metadata[field], expected_type):
            errors.append(f"Metadata: field '{field}' should be {expected_type.__name__}, got {type(metadata[field]).__name__}")
    
    return errors


def validate_address_index_file(file_path: Path) -> Dict[str, Any]:
    """Validate a single address index file"""
    result = {
        'file': str(file_path),
        'valid': False,
        'errors': [],
        'warnings': [],
        'stats': {}
    }
    
    try:
        # Load and parse JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Check top-level structure
        if not isinstance(data, dict):
            result['errors'].append("Root should be an object")
            return result
        
        if 'addresses' not in data:
            result['errors'].append("Missing 'addresses' field")
            return result
        
        if 'metadata' not in data:
            result['errors'].append("Missing 'metadata' field")
            return result
        
        # Validate addresses array
        addresses = data['addresses']
        if not isinstance(addresses, list):
            result['errors'].append("'addresses' should be an array")
            return result
        
        if len(addresses) == 0:
            result['warnings'].append("'addresses' array is empty")
        
        # Validate each address record
        for i, record in enumerate(addresses[:100]):  # Check first 100 to avoid overwhelming output
            if not isinstance(record, dict):
                result['errors'].append(f"Address record {i} should be an object")
                continue
            
            record_errors = validate_address_record(record, i)
            result['errors'].extend(record_errors)
        
        if len(addresses) > 100:
            result['warnings'].append(f"Only validated first 100 of {len(addresses)} address records")
        
        # Validate metadata
        metadata = data['metadata']
        if not isinstance(metadata, dict):
            result['errors'].append("'metadata' should be an object")
        else:
            metadata_errors = validate_metadata(metadata)
            result['errors'].extend(metadata_errors)
            
            # Check consistency
            if 'total_addresses' in metadata and len(addresses) != metadata['total_addresses']:
                result['errors'].append(f"Metadata total_addresses ({metadata['total_addresses']}) doesn't match actual count ({len(addresses)})")
        
        # Collect stats
        result['stats'] = {
            'total_addresses': len(addresses),
            'file_size_bytes': file_path.stat().st_size,
            'regions': list(set(addr.get('region', 'unknown') for addr in addresses[:1000])),
        }
        
        # Determine if valid
        result['valid'] = len(result['errors']) == 0
        
    except json.JSONDecodeError as e:
        result['errors'].append(f"Invalid JSON: {e}")
    except Exception as e:
        result['errors'].append(f"Validation error: {e}")
    
    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 address-index-schema-validator.py <file_or_directory>")
        sys.exit(1)
    
    path = Path(sys.argv[1])
    
    if not path.exists():
        print(f"❌ Path does not exist: {path}")
        sys.exit(1)
    
    # Collect files to validate
    files_to_check = []
    
    if path.is_file():
        if path.name.endswith('-address_index.json'):
            files_to_check.append(path)
        else:
            print(f"❌ File does not match pattern '*-address_index.json': {path}")
            sys.exit(1)
    elif path.is_dir():
        files_to_check = list(path.glob('*-address_index.json'))
        if not files_to_check:
            print(f"❌ No *-address_index.json files found in: {path}")
            sys.exit(1)
    
    print(f"🔍 Validating {len(files_to_check)} address index file(s)...")
    print()
    
    all_valid = True
    total_addresses = 0
    
    for file_path in sorted(files_to_check):
        result = validate_address_index_file(file_path)
        
        # Print results
        status = "✅" if result['valid'] else "❌"
        print(f"{status} {file_path.name}")
        
        if result['stats']:
            stats = result['stats']
            print(f"   📊 {stats['total_addresses']:,} addresses, {stats['file_size_bytes']:,} bytes")
            if stats['regions']:
                print(f"   🌍 Regions: {', '.join(stats['regions'])}")
            total_addresses += stats['total_addresses']
        
        if result['warnings']:
            for warning in result['warnings']:
                print(f"   ⚠️  {warning}")
        
        if result['errors']:
            for error in result['errors']:
                print(f"   ❌ {error}")
            all_valid = False
        
        print()
    
    # Summary
    print(f"📋 Summary: {len(files_to_check)} files, {total_addresses:,} total addresses")
    
    if all_valid:
        print("🎉 All address index files are valid!")
        sys.exit(0)
    else:
        print("💥 Some files have validation errors!")
        sys.exit(1)


if __name__ == "__main__":
    main()
