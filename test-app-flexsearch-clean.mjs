// Test script to verify FlexSearch import logic in our app
import FlexSearch from 'flexsearch';

// Simulate our app's createSearchIndex function with exact production config
function createSearchIndex(indexData) {
  const searchIndex = new FlexSearch.Index({
    tokenize: 'forward',
    cache: 100,
    resolution: 3
  });

  if (indexData.exportedIndex) {
    console.log('⚡ Using precomputed FlexSearch index for instant loading');
    try {
      searchIndex.import(indexData.exportedIndex);
      return searchIndex;
    } catch (error) {
      console.log('❌ Failed to import precomputed index:', error);
      console.log('🔄 Falling back to rebuilding from search strings...');
    }
  }

  console.log(
    '🔄 Rebuilding FlexSearch index from search strings (slower fallback)'
  );
  indexData.searchStrings.forEach((searchString, idx) => {
    searchIndex.add(idx, searchString);
  });

  return searchIndex;
}

// Create test data
const testData = {
  parcelIds: ['parcel1', 'parcel2', 'parcel3'],
  searchStrings: [
    '123 Main St, Sacramento, CA 95814',
    '456 Oak Ave, Davis, CA 95616',
    '789 Pine Rd, Roseville, CA 95661'
  ],
  recordCount: 3,
  version: 'test',
  exportMethod: 'test'
};

console.log('🧪 Testing FlexSearch logic with fallback (no exportedIndex)...');
const fallbackIndex = createSearchIndex(testData);
const fallbackResults = fallbackIndex.search('Sacramento');
console.log('🔍 Fallback search for "Sacramento":', fallbackResults);

console.log('\n🧪 Testing FlexSearch logic with precomputed index...');

// Create source index with EXACT same config as production
const sourceIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100,
  resolution: 3
});

testData.searchStrings.forEach((searchString, idx) => {
  sourceIndex.add(idx, searchString);
});

// Test search on source index before export
const sourceResults = sourceIndex.search('Sacramento');
console.log('🔍 Source index search for "Sacramento":', sourceResults);

// Export using callback
const exportedData = {};
sourceIndex.export((key, data) => {
  console.log(`📦 Export callback: ${key} (${data ? 'has data' : 'no data'})`);
  console.log(`📦 Export data type for ${key}:`, typeof data);

  // Check if data is a string that needs parsing
  let processedData = data;
  if (typeof data === 'string') {
    try {
      processedData = JSON.parse(data);
      console.log(`📦 Parsed ${key} from string to:`, typeof processedData);
    } catch (e) {
      console.log(`📦 Could not parse ${key}, keeping as string`);
    }
  }

  exportedData[key] = processedData;
  return data;
});

console.log(`📦 Exported keys: ${Object.keys(exportedData).join(', ')}`);
console.log(
  `📦 Processed data types:`,
  Object.keys(exportedData)
    .map((k) => `${k}: ${typeof exportedData[k]}`)
    .join(', ')
);

// Test with exported index
const testDataWithExport = {
  ...testData,
  exportedIndex: exportedData
};

console.log('\n🔍 Testing import step by step...');
const debugIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100,
  resolution: 3
});

console.log('🔍 Debug index created');
try {
  debugIndex.import(exportedData);
  console.log('✅ Import completed without error');

  // Test search immediately after import
  const debugResults = debugIndex.search('Sacramento');
  console.log('🔍 Debug search for "Sacramento":', debugResults);

  // Test other searches
  const debugResults2 = debugIndex.search('Main');
  console.log('🔍 Debug search for "Main":', debugResults2);
} catch (importError) {
  console.log('❌ Import failed:', importError.message);
}

const precomputedIndex = createSearchIndex(testDataWithExport);
const precomputedResults = precomputedIndex.search('Sacramento');
console.log('🔍 Precomputed search for "Sacramento":', precomputedResults);

// Compare results
console.log('\n📊 Results comparison:');
console.log('Source results:      ', sourceResults);
console.log('Fallback results:    ', fallbackResults);
console.log('Precomputed results: ', precomputedResults);
console.log(
  'Fallback matches source:',
  JSON.stringify(fallbackResults) === JSON.stringify(sourceResults)
);
console.log(
  'Precomputed matches source:',
  JSON.stringify(precomputedResults) === JSON.stringify(sourceResults)
);

console.log('\n🎉 Test completed!');
