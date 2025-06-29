// Test script to verify FlexSearch import logic in o// Create a proper exported index with matching config
const sourceIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100,
  resolution: 3
});
import FlexSearch from 'flexsearch';

// Simulate our app's createSearchIndex function
function createSearchIndex(indexData) {
  // Use exact same config as production
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

// Create a proper exported index with matching config
const sourceIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100,
  resolution: 3
});

testData.searchStrings.forEach((searchString, idx) => {
  sourceIndex.add(idx, searchString);
});

// Export using callback
const exportedData = {};
sourceIndex.export((key, data) => {
  console.log(`📦 Export callback: ${key}`);
  exportedData[key] = data;
  return data;
});

console.log(`📦 Exported keys: ${Object.keys(exportedData).join(', ')}`);

// Test with exported index
const testDataWithExport = {
  ...testData,
  exportedIndex: exportedData
};

const precomputedIndex = createSearchIndex(testDataWithExport);
const precomputedResults = precomputedIndex.search('Sacramento');
console.log('🔍 Precomputed search for "Sacramento":', precomputedResults);

// Compare results
console.log('\n📊 Results comparison:');
console.log('Fallback results:', fallbackResults);
console.log('Precomputed results:', precomputedResults);
console.log(
  'Results match:',
  JSON.stringify(fallbackResults) === JSON.stringify(precomputedResults)
);

console.log('\n🎉 Test completed!');
