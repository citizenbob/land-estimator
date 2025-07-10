#!/usr/bin/env python3
"""
Quick coordinate fix for existing address index files
"""

import json
import sys
import geopandas as gpd
from pathlib import Path
from shapely.geometry import Point

def fix_coordinates_in_file(file_path):
    """Fix coordinates in an address index file"""
    print(f"🔧 Fixing coordinates in {file_path.name}...")
    
    # Load the file
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    addresses = data.get('addresses', [])
    if not addresses:
        print(f"  ⚠️ No addresses found in {file_path.name}")
        return False
    
    fixed_count = 0
    
    for addr in addresses:
        lat = addr.get('latitude', 0)
        lng = addr.get('longitude', 0)
        
        # Check if coordinates need transformation
        if abs(lng) > 180 or abs(lat) > 90:
            # Coordinates are clearly projected, transform them
            try:
                point = Point(lng, lat)  # Note: stored as lng, lat in your data
                centroid_gdf = gpd.GeoSeries([point], crs='EPSG:26915')  # UTM Zone 15N
                centroid_wgs84 = centroid_gdf.to_crs(epsg=4326).iloc[0]
                
                # Update with transformed coordinates
                addr['latitude'] = round(centroid_wgs84.y, 6)
                addr['longitude'] = round(centroid_wgs84.x, 6)
                fixed_count += 1
                
            except Exception as e:
                print(f"  ❌ Error transforming coordinates for {addr.get('id', 'unknown')}: {e}")
    
    # Save the fixed file
    backup_path = file_path.with_suffix('.backup.json')
    file_path.rename(backup_path)
    print(f"  📁 Backup saved: {backup_path.name}")
    
    with open(file_path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    
    print(f"  ✅ Fixed {fixed_count} coordinates in {len(addresses)} addresses")
    return True

def main():
    """Fix coordinates in all address index files"""
    print("🚀 Quick coordinate fix for address index files...")
    
    # Find address index files
    src_data_tmp = Path("src/data/tmp")
    if not src_data_tmp.exists():
        print(f"❌ Directory not found: {src_data_tmp}")
        return False
    
    index_files = list(src_data_tmp.glob("*-address_index.json"))
    if not index_files:
        print(f"❌ No address index files found in {src_data_tmp}")
        return False
    
    print(f"📁 Found {len(index_files)} address index files:")
    for file_path in index_files:
        print(f"  📄 {file_path.name}")
    
    success = True
    for file_path in index_files:
        try:
            if not fix_coordinates_in_file(file_path):
                success = False
        except Exception as e:
            print(f"❌ Error processing {file_path.name}: {e}")
            success = False
    
    if success:
        print("\n🎉 All coordinate fixes completed successfully!")
        print("📝 Run schema validation again to verify fixes.")
    else:
        print("\n❌ Some coordinate fixes failed!")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
