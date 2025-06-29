#!/usr/bin/env node

import FlexSearch from 'flexsearch';
import fs from 'fs';
import zlib from 'zlib';

console.log('🧪 Testing FlexSearch export/import functionality...');

// Create a small test dataset
const testAddresses = [
  { id: 'parcel1', searchString: '123 Main St, Sacramento, CA 95814' },
  { id: 'parcel2', searchString: '456 Oak Ave, Davis, CA 95616' },
  { id: 'parcel3', searchString: '789 Pine Rd, Roseville, CA 95661' }
];

// Create FlexSearch index like our real code
const flexIndex = new FlexSearch.Index({
  charset: 'latin:extra',
  tokenize: 'forward',
  resolution: 9
});

// Add addresses to index
testAddresses.forEach((addr, index) => {
  flexIndex.add(index, addr.searchString);
});

// Export the index like our builder script
const exportedIndex = flexIndex.export();
console.log('✅ FlexSearch index exported');
console.log('📊 Exported index type:', typeof exportedIndex);
console.log(
  '📊 Exported index size:',
  JSON.stringify(exportedIndex).length,
  'bytes'
);

// Create data structure like our real code
const indexData = {
  parcelIds: testAddresses.map((addr) => addr.id),
  searchStrings: testAddresses.map((addr) => addr.searchString),
  timestamp: new Date().toISOString(),
  recordCount: testAddresses.length,
  version: 'test-1.0',
  exportMethod: 'test_flexsearch',
  exportedIndex: exportedIndex
};

// Test importing the index
console.log('\n🔄 Testing FlexSearch import...');
const newFlexIndex = new FlexSearch.Index({
  charset: 'latin:extra',
  tokenize: 'forward',
  resolution: 9
});

// Import the exported index
newFlexIndex.import(indexData.exportedIndex);
console.log('✅ FlexSearch index imported');

// Test search functionality
const searchQuery = 'Main';
const results = newFlexIndex.search(searchQuery);
console.log(`🔍 Search for "${searchQuery}":`, results);

// Verify we get expected results
const expectedResult = 0;
if (results.includes(expectedResult)) {
  console.log('✅ Search test passed - found expected result');
} else {
  console.log('❌ Search test failed - expected result not found');
}

// Create a compressed test file like our real data
const jsonString = JSON.stringify(indexData);
const compressed = zlib.gzipSync(Buffer.from(jsonString));

// Save test file
const testFilePath = '/tmp/test-address-index.json.gz';
fs.writeFileSync(testFilePath, compressed);

console.log(`\n📁 Test file created: ${testFilePath}`);
console.log(
  `📊 Uncompressed: ${Math.round((jsonString.length / 1024) * 100) / 100}KB`
);
console.log(
  `📊 Compressed: ${Math.round((compressed.length / 1024) * 100) / 100}KB`
);

// Test decompression and loading
const decompressed = zlib.gunzipSync(fs.readFileSync(testFilePath));
const loadedData = JSON.parse(decompressed.toString());

console.log('\n🔄 Testing decompression and loading...');
console.log('✅ File decompressed successfully');
console.log('📊 Loaded data keys:', Object.keys(loadedData));
console.log('📊 Has exportedIndex:', 'exportedIndex' in loadedData);

if ('exportedIndex' in loadedData) {
  // Test creating a new index from the loaded data
  const finalFlexIndex = new FlexSearch.Index({
    charset: 'latin:extra',
    tokenize: 'forward',
    resolution: 9
  });

  finalFlexIndex.import(loadedData.exportedIndex);
  const finalResults = finalFlexIndex.search('Sacramento');
  console.log('🔍 Final search test for "Sacramento":', finalResults);
  console.log('✅ Complete export/import cycle successful!');
} else {
  console.log('❌ exportedIndex missing from loaded data');
}

console.log('\n🎉 FlexSearch export test completed!');
