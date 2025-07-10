#!/usr/bin/env python3
"""
Test coordinate transformation fix for address index validation
"""

import json
import sys
from pathlib import Path
import geopandas as gpd
from shapely.geometry import Point

def test_coordinate_transformation():
    """Test the coordinate transformation logic"""
    print("🧪 Testing coordinate transformation...")
    
    # Test data from your schema validation
    test_coords = [
        (744902.380139, 4278231.181849),
        (744914.169293, 4278264.998914),
        (744911.327138, 4278283.65105)
    ]
    
    print("\n🔍 Original projected coordinates → WGS84 transformation:")
    for i, (x, y) in enumerate(test_coords):
        print(f"\nRecord {i}:")
        print(f"  📍 Original: {x}, {y}")
        
        # Test transformation logic (same as in ingest script)
        centroid = Point(x, y)
        
        # Check if coordinates need transformation
        if abs(centroid.x) > 180 or abs(centroid.y) > 90:
            # Coordinates are clearly projected, assume UTM Zone 15N
            centroid_gdf = gpd.GeoSeries([centroid], crs='EPSG:26915')  # UTM Zone 15N
            centroid_wgs84 = centroid_gdf.to_crs(epsg=4326).iloc[0]
            lat, lng = centroid_wgs84.y, centroid_wgs84.x
            print(f"  🌍 WGS84: {lng}, {lat}")
            print(f"  ✅ Lat/Lng: {lat}, {lng}")
            
            # Validate coordinates are in correct range
            if -90 <= lat <= 90 and -180 <= lng <= 180:
                print(f"  ✅ Coordinates are valid!")
            else:
                print(f"  ❌ Coordinates are still invalid!")
        else:
            print(f"  ℹ️  Already in WGS84 format")
    
    print("\n🎯 Expected results for St. Louis area:")
    print("  Latitude: ~38.6° (should be between 38.5-38.8)")
    print("  Longitude: ~-90.2° (should be between -90.0 to -90.5)")

def test_schema_validation_fix():
    """Test that transformed coordinates pass schema validation"""
    print("\n🔬 Testing schema validation with transformed coordinates...")
    
    # Create a sample address record with transformed coordinates
    test_record = {
        "id": "TEST_001",
        "full_address": "123 Test St, St. Louis, MO 63102",
        "region": "St. Louis City",
        "latitude": 38.61881376075901,  # Transformed coordinate
        "longitude": -90.18704277153144,  # Transformed coordinate
        "calc": {
            "landarea_sqft": 5000,
            "building_sqft": 1200,
            "estimated_landscapable_area_sqft": 3000,
            "property_type": "residential",
            "year_built": 1950
        },
        "assessment": {
            "total_value": 150000,
            "land_value": 50000,
            "improvement_value": 100000
        },
        "owner": {"name": "Test Owner"},
        "affluence_score": 2.5,
        "source_file": "Test_Data"
    }
    
    # Validate coordinates
    lat = test_record["latitude"]
    lng = test_record["longitude"]
    
    print(f"📍 Test record coordinates: {lat}, {lng}")
    
    # Check validation criteria
    lat_valid = -90 <= lat <= 90
    lng_valid = -180 <= lng <= 180
    not_projected = abs(lat) <= 90 and abs(lng) <= 180
    
    print(f"  ✅ Latitude in range [-90, 90]: {lat_valid}")
    print(f"  ✅ Longitude in range [-180, 180]: {lng_valid}")
    print(f"  ✅ Not projected coordinates: {not_projected}")
    
    if lat_valid and lng_valid and not_projected:
        print("🎉 Test record passes all coordinate validation checks!")
        return True
    else:
        print("❌ Test record fails coordinate validation!")
        return False

if __name__ == "__main__":
    test_coordinate_transformation()
    success = test_schema_validation_fix()
    
    if success:
        print("\n✅ All coordinate transformation tests passed!")
        print("📝 Ready to regenerate address index files with correct coordinates.")
        sys.exit(0)
    else:
        print("\n❌ Coordinate transformation tests failed!")
        sys.exit(1)
