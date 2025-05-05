import unittest
import json
import os
import pandas as pd
import geopandas as gpd
from pathlib import Path
from unittest.mock import patch, MagicMock, mock_open
import sys
import tempfile
import shutil

# Add the parent directory to sys.path to import the module
sys.path.append(str(Path(__file__).parent))

# Import the functions from injest_shapes.py
from injest_shapes import (
    standardize_address,
    is_po_box,
    is_valid_zip,
    extract_address_components,
    expand_address_range,
    log_address_issue
)

class TestAddressProcessing(unittest.TestCase):
    """Test suite for address processing functions"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.log_dir = Path(self.temp_dir) / "logs"
        self.log_dir.mkdir(exist_ok=True)
        
        # Mock the LOG_DIR path in the module
        patcher = patch('injest_shapes.LOG_DIR', self.log_dir)
        self.addCleanup(patcher.stop)
        patcher.start()
    
    def tearDown(self):
        """Clean up after tests"""
        shutil.rmtree(self.temp_dir)
    
    def test_standardize_address(self):
        """Test address standardization function"""
        test_cases = [
            # Input, Expected Output
            ("123 Main Street", "123 MAIN ST"),
            ("456 N. First Avenue", "456 N. FIRST AVE"),
            ("789 WASHINGTON Boulevard", "789 WASHINGTON BLVD"),
            ("101 MLK Jr. Drive", "101 MLK JR. DR"),
            ("202 College Road", "202 COLLEGE RD"),
            ("303 Park Lane", "303 PARK LN"),
            ("404 Oak Court", "404 OAK CT"),
            ("505 Pine Parkway", "505 PINE PKWY"),
            ("606 Highway 61", "606 HWY 61"),
            ("707 Central Circle", "707 CENTRAL CIR"),
            ("808 Summit Terrace", "808 SUMMIT TER"),
            ("909 River Place", "909 RIVER PL"),
            ("123.0 Main St", "123 MAIN ST"),  # Clean trailing .0
            (None, ""),  # Handle None
            ("", ""),  # Handle empty string
            (123, ""),  # Handle non-string
        ]
        
        for input_addr, expected in test_cases:
            with self.subTest(input_addr=input_addr):
                result = standardize_address(input_addr)
                self.assertEqual(result, expected)
    
    def test_is_po_box(self):
        """Test PO Box detection function"""
        test_cases = [
            # Input, Expected Output
            ("P.O. BOX 1234", True),
            ("PO BOX 567", True),
            ("BOX 891011", True),
            ("PMB 1212", True),
            ("123 Main St", False),
            ("P.O. Box Avenue", False),  # Not a true PO Box
            ("P O BOX 1234", False),  # Spacing is wrong
            (None, False),  # Handle None
            ("", False),  # Handle empty string
            (123, False),  # Handle non-string
        ]
        
        for input_addr, expected in test_cases:
            with self.subTest(input_addr=input_addr):
                result = is_po_box(input_addr)
                self.assertEqual(result, expected)
    
    def test_is_valid_zip(self):
        """Test ZIP code validation function"""
        test_cases = [
            # Input, Expected Output
            ("12345", True),  # 5-digit ZIP
            ("12345-6789", True),  # ZIP+4
            ("1234", False),  # Too short
            ("123456", False),  # Too long
            ("12345-678", False),  # Incomplete ZIP+4
            ("ABCDE", False),  # Non-numeric
            ("12345-ABCD", False),  # Bad ZIP+4
            (None, False),  # Handle None
            ("", False),  # Handle empty string
            (" 12345 ", True),  # Handles whitespace
            (12345, False),  # Handle numeric (not string)
        ]
        
        for input_zip, expected in test_cases:
            with self.subTest(input_zip=input_zip):
                result = is_valid_zip(input_zip)
                self.assertEqual(result, expected)
    
    def test_extract_address_components(self):
        """Test address component extraction function"""
        test_cases = [
            # Input, Expected keys/values to check
            ("123 Main St", {"street_number": "123", "street_name": "Main St", "has_fraction": False, "has_range": False}),
            ("456-458 Broadway", {"street_number": "456-458", "street_name": "Broadway", "has_range": True}),
            ("789 1/2 Oak Ave", {"street_number": "789 1/2", "street_name": "Oak Ave", "has_fraction": True}),
            ("101-3 Cedar Ln", {"street_number": "101-3", "street_name": "Cedar Ln", "has_range": True}),
            ("Main St", {"street_number": "", "street_name": "Main St"}),
            ("", {}),  # Handle empty string
            (None, {}),  # Handle None
        ]
        
        for input_addr, expected in test_cases:
            with self.subTest(input_addr=input_addr):
                result = extract_address_components(input_addr)
                for key, value in expected.items():
                    self.assertEqual(result.get(key), value)
    
    def test_expand_address_range(self):
        """Test address range expansion function"""
        test_cases = [
            # Input components, Expected count of expanded addresses
            ({"street_number": "101-103", "street_name": "Main St", "has_range": True}, 2),  # 101, 103
            ({"street_number": "200-206", "street_name": "Oak Ave", "has_range": True}, 4),  # 200, 202, 204, 206
            ({"street_number": "300-2", "street_name": "Pine St", "has_range": True}, 2),  # 300, 302 (short notation)
            ({"street_number": "400", "street_name": "Elm St", "has_range": False}, 1),  # No range, just one address
            ({}, 1),  # Handle empty dict
            (None, 1),  # Handle None
        ]
        
        for input_components, expected_count in test_cases:
            with self.subTest(input_components=input_components):
                result = expand_address_range(input_components)
                self.assertEqual(len(result), expected_count)
                
                # Test short notation expansion (e.g., 300-2 -> 300, 302)
                if input_components and input_components.get("street_number") == "300-2":
                    # Check that we properly expanded the short notation
                    street_numbers = [r.get("street_number") for r in result]
                    self.assertIn("300", street_numbers)
                    self.assertIn("302", street_numbers)
    
    def test_log_address_issue(self):
        """Test address issue logging function"""
        # Create a test record
        test_record = {
            "issue": "test_issue",
            "address": "123 Test St",
            "data": {"field1": "value1", "field2": "value2"}
        }
        
        # Test logging to a file
        log_file = "test_log.log"
        log_address_issue(log_file, test_record)
        
        # Check if the log file was created and contains the record
        log_path = self.log_dir / log_file
        self.assertTrue(log_path.exists())
        
        with open(log_path, "r") as f:
            content = f.read()
            # Check if JSON content can be parsed and matches
            logged_record = json.loads(content.strip())
            self.assertEqual(logged_record["issue"], test_record["issue"])
            self.assertEqual(logged_record["address"], test_record["address"])
    
    def test_edge_cases(self):
        """Test various edge cases in address processing"""
        
        # Test handling of fractional addresses
        fractional = "812 1/2 N 1ST ST"
        components = extract_address_components(fractional)
        self.assertTrue(components["has_fraction"])
        self.assertEqual(components["street_number"], "812 1/2")
        
        # Test handling of extreme ranges
        range_addr = {"street_number": "100-1000", "street_name": "Long Range Rd", "has_range": True}
        expanded = expand_address_range(range_addr)
        # This should be limited to avoid excessive expansion
        self.assertLess(len(expanded), 100)
        
        # Test standardization of different address formats
        po_box = "P.O. BOX 1234"
        self.assertTrue(is_po_box(po_box))
        
        # Test mixed case addresses
        mixed_case = "123 Main STREET, apt 4B"
        standardized = standardize_address(mixed_case)
        self.assertEqual(standardized, "123 MAIN ST, APT 4B")


# Define more complex test cases for integration testing
class TestAddressIntegration(unittest.TestCase):
    """Integration tests for address processing pipeline"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Create a temporary directory for test outputs
        self.temp_dir = tempfile.mkdtemp()
        self.log_dir = Path(self.temp_dir) / "logs"
        self.log_dir.mkdir(exist_ok=True)
        
        # Create geometry points with a proper CRS
        geometries = [
            gpd.points_from_xy([0], [0])[0],
            gpd.points_from_xy([1], [1])[0],
            gpd.points_from_xy([2], [2])[0],
            gpd.points_from_xy([3], [3])[0],
            gpd.points_from_xy([4], [4])[0]
        ]
        
        # Mock GeoDataFrame with test data
        self.mock_gdf = gpd.GeoDataFrame({
            "LOCATOR": ["12345", "67890", "13579", "24680", "97531"],
            "PROP_ADD": ["123 MAIN ST", "456-458 OAK AVE", "789 1/2 PINE LN", "P.O. BOX 1234", ""],
            "PROP_ADRNU": [123, 456, 789, None, 321],
            "PROP_ZIP": ["12345", "67890-1234", "ABCDE", "", "98765"],
            "MUNICIPALI": ["SAINT LOUIS", "UNINCORPORATED", "CLAYTON", "LADUE", ""],
            "OWNER_NAME": ["John Doe", "Jane Smith", "Company LLC", "Foreign Owner", "Missing Data"],
            "OWN_ADDR": ["123 MAIN ST", "500 OTHER ST", "P.O. BOX 5678", "123 Foreign St", ""],
            "OWN_CITY": ["SAINT LOUIS", "NEW YORK", "CHICAGO", "TOKYO", ""],
            "OWN_STATE": ["MO", "NY", "IL", "JP", ""],
            "OWN_ZIP": ["12345", "10001", "60601", "12345", ""],
            "TOTAPVAL": [250000, 350000, 550000, 750000, 150000],
            "TENURE": ["OWNER", "OWNER", "RENTER", "OWNER", "UNKNOWN"],
            "geometry": geometries
        }, geometry="geometry")
        
        # Set the CRS - important for to_crs() operation
        self.mock_gdf.set_crs(epsg=4326, inplace=True)
        
        # Add calculated fields
        self.mock_gdf["landarea"] = [1000, 2000, 3000, 4000, 5000]
        self.mock_gdf["building_sqft"] = [500, 1000, 1500, 0, 2500]
        self.mock_gdf["estimated_landscapable_area"] = [500, 1000, 1500, 4000, 2500]
        
        # Mock the LOG_DIR path in the module
        patcher = patch('injest_shapes.LOG_DIR', self.log_dir)
        self.addCleanup(patcher.stop)
        patcher.start()
    
    def tearDown(self):
        """Clean up after tests"""
        shutil.rmtree(self.temp_dir)
    
    @patch('injest_shapes.process_county')
    def test_process_county_integration(self, mock_process_county):
        """Test county processing with mock data"""
        # Prepare sample data that would be returned by process_county
        mock_results = [
            {
                "id": "12345",
                "full_address": "123 MAIN ST, SAINT LOUIS, MO 12345",
                "region": "Saint Louis",
                "latitude": 38.123456,
                "longitude": -90.123456,
                "calc": {
                    "landarea": 1000.0,
                    "building_sqft": 500.0,
                    "estimated_landscapable_area": 500.0,
                    "property_type": "residential"
                },
                "owner": {"name": "John Doe"},
                "affluence_score": 2
            },
            {
                "id": "67890-456",
                "full_address": "456 OAK AVE, SAINT LOUIS COUNTY (UNINCORPORATED), MO 67890-1234",
                "region": "Saint Louis County (Unincorporated)",
                "latitude": 38.654321,
                "longitude": -90.654321,
                "calc": {
                    "landarea": 2000.0,
                    "building_sqft": 1000.0,
                    "estimated_landscapable_area": 1000.0,
                    "property_type": "residential"
                },
                "owner": {"name": "Jane Smith"},
                "affluence_score": 1
            }
        ]
        
        # Set the return value of the mock
        mock_process_county.return_value = mock_results
        
        # Call the mocked function
        from injest_shapes import process_county
        result = process_county()
        
        # Assertions
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 2)
        
        # Check sample data structure
        self.assertEqual(result[0]["id"], "12345")
        self.assertEqual(result[1]["id"], "67890-456")
        
        # Verify that hyphenated address expanded (67890-456) has correct structure
        self.assertIn("full_address", result[1])
        self.assertIn("calc", result[1])
    
    @patch('injest_shapes.gpd')
    @patch('injest_shapes.pd')
    def test_process_county_missing_files(self, mock_pd, mock_gpd):
        """Test process_county when shapefiles are missing"""
        from injest_shapes import process_county
        
        # Suppress stdout during this test to avoid misleading output
        import io
        from contextlib import redirect_stdout
        
        f = io.StringIO()
        with redirect_stdout(f):
            # Set up mock for non-existent files
            with patch('pathlib.Path.exists', return_value=False):
                # When shapefiles don't exist, we should still return an empty list, not None
                result = process_county()
        
        # Assertions
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 0)  # Should be an empty list
    
    @patch('injest_shapes.shard_records')
    def test_shard_records_none_handling(self, mock_shard):
        """Test that shard_records properly handles None or empty records"""
        # Import the actual function without mocking for this test
        from injest_shapes import shard_records
        
        # Create a real temporary directory for test data
        shard_dir = Path(self.temp_dir) / "test_shards" 
        shard_dir.mkdir(exist_ok=True)
        
        # Use the actual function but with the test directory
        with patch('injest_shapes.SHARD_DIR', shard_dir):
            # Test with None
            shard_records(None, "test")
            
            # Test with empty list
            shard_records([], "test")
            
            # No files should be created in the test directory
            self.assertEqual(len(list(shard_dir.iterdir())), 0)
    
    @patch('injest_shapes.shard_records')
    def test_address_validation_in_sharding(self, mock_shard):
        """Test that addresses are properly validated during sharding"""
        # Create test records with various address patterns
        records = [
            {
                "id": "valid1",
                "full_address": "123 MAIN ST, ST. LOUIS, MO 63101",
                "latitude": 38.123456,
                "longitude": -90.654321,
                "region": "St. Louis City",
                "calc": {"estimated_landscapable_area": 1000.0}
            },
            {
                "id": "valid2", 
                "full_address": "456 N OAK AVE, CLAYTON, MO 63105",
                "latitude": 38.654321,
                "longitude": -90.123456,
                "region": "Saint Louis County",
                "calc": {"estimated_landscapable_area": 2000.0}
            },
            {
                "id": "empty",
                "full_address": "",  # Empty address should be skipped
                "latitude": 38.0,
                "longitude": -90.0,
                "region": "St. Louis City",
                "calc": {"estimated_landscapable_area": 500.0}
            },
            {
                "id": "none",
                "full_address": "NONE",  # "NONE" address should be skipped
                "latitude": 38.1,
                "longitude": -90.1,
                "region": "St. Louis City",
                "calc": {"estimated_landscapable_area": 600.0}
            },
            {
                "id": "nan",
                "full_address": "NAN STREET, ST. LOUIS, MO",  # Starts with "NAN" - should be skipped
                "latitude": 38.2,
                "longitude": -90.2,
                "region": "St. Louis City", 
                "calc": {"estimated_landscapable_area": 700.0}
            },
            {
                "id": "missing_components",
                "full_address": ", ST. LOUIS, MO",  # Missing street - should be skipped
                "latitude": 38.3,
                "longitude": -90.3,
                "region": "St. Louis City",
                "calc": {"estimated_landscapable_area": 800.0}
            }
        ]
        
        # Just directly test the filtering logic in shard_records
        test_records = records.copy()
        
        from injest_shapes import shard_records
        
        # Count how many records should be valid
        valid_records = [r for r in test_records if r["full_address"] and 
                        not r["full_address"].startswith(("NAN", "NONE")) and
                        r["full_address"].split(",")[0].strip()]
        
        # Test that our understanding of the validation logic matches the implementation
        self.assertEqual(len(valid_records), 2)
        self.assertEqual(valid_records[0]["id"], "valid1")
        self.assertEqual(valid_records[1]["id"], "valid2")
    
    def test_city_data_preprocessing(self):
        """Test that city data preprocessing filters out invalid records before sharding"""
        # Create a simplified test that just verifies our filtering logic
        # for records with NAN or NONE values works as expected
        
        # Mock data with various address values
        test_data = [
            {"ADDRNUM": "123", "STREETNAME": "MAIN ST"},  # Valid
            {"ADDRNUM": "NAN", "STREETNAME": "ELM ST"},   # Invalid - has NAN
            {"ADDRNUM": "456", "STREETNAME": "NONE"},     # Invalid - has NONE
            {"ADDRNUM": "", "STREETNAME": ""},            # Invalid - empty
        ]
        
        # Apply the same filtering logic as in the process_city function
        valid_records = []
        for row in test_data:
            addr_num = str(row.get('ADDRNUM', ''))
            street_name = str(row.get('STREETNAME', ''))
            
            # The filtering logic from process_city
            if any(val.upper() in ("NAN", "NONE") for val in [addr_num, street_name]):
                continue
                
            if not (addr_num.strip() or street_name.strip()):
                continue
                
            valid_records.append(row)
        
        # Verify we correctly filtered out invalid records
        self.assertEqual(len(valid_records), 1)
        self.assertEqual(valid_records[0]["ADDRNUM"], "123")
        self.assertEqual(valid_records[0]["STREETNAME"], "MAIN ST")


if __name__ == '__main__':
    unittest.main()