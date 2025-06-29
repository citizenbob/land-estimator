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

// Try different export approaches
console.log('\n🔄 Testing FlexSearch export...');

try {
  // Method 1: Direct export (sync)
  console.log('Trying direct export...');
  const exportedSync = flexIndex.export();
  console.log('✅ Direct export successful:', typeof exportedSync);
  console.log('📊 Export result:', exportedSync);

  if (exportedSync) {
    // Test import
    console.log('\n🔄 Testing FlexSearch import...');
    const newIndex = new FlexSearch.Index({
      charset: 'latin:extra',
      tokenize: 'forward',
      resolution: 9
    });

    newIndex.import(exportedSync);
    const importTestSearch = newIndex.search('Sacramento');
    console.log('🔍 Search for "Sacramento" after import:', importTestSearch);
    console.log('✅ Export/import cycle successful!');
  }
} catch (error) {
  console.log('❌ Direct export failed:', error.message);

  // Method 2: Callback-based export
  console.log('Trying callback-based export...');
  let exportData = {};

  const exportResult = flexIndex.export((key, data) => {
    console.log('📊 Export callback called with key:', key);
    exportData[key] = data;
    return true;
  });

  if (exportResult && exportResult.then) {
    exportResult
      .then(() => {
        console.log('✅ Callback export completed');
        console.log('📊 Export data keys:', Object.keys(exportData));
      })
      .catch((err) => {
        console.log('❌ Callback export failed:', err.message);
      });
  } else {
    console.log('📊 Callback export immediate result:', exportResult);
    console.log('📊 Export data keys:', Object.keys(exportData));
  }
}

console.log('\n🎉 FlexSearch test completed!');
