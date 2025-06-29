import FlexSearch from 'flexsearch';

console.log('🧪 Testing FlexSearch export/import functionality...');

// Create a small test dataset
const testAddresses = [
  '123 Main St, Sacramento, CA 95814',
  '456 Oak Ave, Davis, CA 95616',
  '789 Pine Rd, Roseville, CA 95661'
];

// Create FlexSearch index like our real code
const flexIndex = new FlexSearch.Index({
  charset: 'latin:extra',
  tokenize: 'forward',
  resolution: 9
});

// Add addresses to index
testAddresses.forEach((addr, index) => {
  flexIndex.add(index, addr);
});

console.log('✅ FlexSearch index created and populated');

// Test search before export
const testSearch = flexIndex.search('Main');
console.log('🔍 Search for "Main" before export:', testSearch);

// Correct export approach - callback-based
console.log('\n🔄 Testing FlexSearch export...');
let exportData = {};

const exportResult = flexIndex.export((key, data) => {
  console.log(
    '📊 Export callback called with key:',
    key,
    'data length:',
    data ? data.length : 'no data'
  );
  exportData[key] = data;
  return true;
});

function testImport() {
  console.log('\n🔄 Testing FlexSearch import...');
  console.log('📊 Export data keys:', Object.keys(exportData));

  try {
    const newIndex = new FlexSearch.Index({
      charset: 'latin:extra',
      tokenize: 'forward',
      resolution: 9
    });

    newIndex.import(exportData);
    console.log('✅ Import completed successfully');

    // Test searches
    const searchMain = newIndex.search('Main');
    const searchSacramento = newIndex.search('Sacramento');
    const searchDavis = newIndex.search('Davis');

    console.log('🔍 Search for "Main":', searchMain);
    console.log('🔍 Search for "Sacramento":', searchSacramento);
    console.log('🔍 Search for "Davis":', searchDavis);

    if (searchMain.length > 0 && searchSacramento.length > 0) {
      console.log('✅ Export/import cycle successful!');

      // Create data structure like our real application
      const indexData = {
        parcelIds: ['parcel1', 'parcel2', 'parcel3'],
        searchStrings: testAddresses,
        timestamp: new Date().toISOString(),
        recordCount: testAddresses.length,
        version: 'test-1.0',
        exportMethod: 'test_flexsearch',
        exportedIndex: exportData
      };

      console.log('\n📦 Created data structure like real app:');
      console.log('📊 Keys:', Object.keys(indexData));
      console.log('📊 Has exportedIndex:', 'exportedIndex' in indexData);
      console.log(
        '📊 exportedIndex keys:',
        Object.keys(indexData.exportedIndex)
      );

      return indexData;
    } else {
      console.log('⚠️ Import successful but searches returned no results');
    }
  } catch (error) {
    console.log('❌ Import failed:', error.message);
  }
}

if (exportResult && exportResult.then) {
  exportResult
    .then(() => {
      console.log('✅ Async export completed');
      testImport();
    })
    .catch((err) => {
      console.log('❌ Async export failed:', err.message);
    });
} else {
  console.log('✅ Sync export completed');
  testImport();
}

console.log('\n🎉 FlexSearch test completed!');
