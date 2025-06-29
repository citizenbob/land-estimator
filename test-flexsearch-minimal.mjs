// Minimal FlexSearch export/import test
import FlexSearch from 'flexsearch';

console.log('🧪 Minimal FlexSearch export/import test...');

// Create test index
const index = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100,
  resolution: 3
});

// Add test data
index.add(0, 'Sacramento California');
index.add(1, 'Davis California');

// Test search before export
const beforeExport = index.search('Sacramento');
console.log('🔍 Before export:', beforeExport);

// Method 1: Try to export synchronously
console.log('\n📦 Method 1: Synchronous export...');
let exportData1 = {};
const result1 = index.export((key, data) => {
  console.log(`Export callback: ${key}`);
  exportData1[key] = data;
  return data;
});
console.log('Export result:', result1);

// Method 2: Try to export with Promise
console.log('\n📦 Method 2: Promise-based export...');
let exportData2 = {};
const result2 = index.export((key, data) => {
  console.log(`Export callback: ${key}`);
  exportData2[key] = data;
  return Promise.resolve(data);
});

// Method 3: Try different export approach
console.log('\n📦 Method 3: Different export handling...');
let exportData3 = {};
let exportResult3;

try {
  exportResult3 = index.export((key, data) => {
    console.log(`Export callback: ${key}, type: ${typeof data}`);

    // Try different return approaches
    if (typeof data === 'string') {
      try {
        exportData3[key] = JSON.parse(data);
        console.log(`Parsed ${key} successfully`);
        return JSON.parse(data);
      } catch (e) {
        exportData3[key] = data;
        return data;
      }
    } else {
      exportData3[key] = data;
      return data;
    }
  });

  console.log('Export result type:', typeof exportResult3);
  console.log('Export result:', exportResult3);

  if (exportResult3 && exportResult3.then) {
    exportResult3.then(() => {
      console.log('Method 3 Promise resolved');
      testImport(exportData3, 'Method 3');
    });
  } else {
    testImport(exportData3, 'Method 3');
  }
} catch (exportError) {
  console.log('Export error:', exportError.message);
}

function testImport(data, method) {
  console.log(`\n🔄 Testing import with ${method} data...`);

  const newIndex = new FlexSearch.Index({
    tokenize: 'forward',
    cache: 100,
    resolution: 3
  });

  try {
    newIndex.import(data);
    const afterImport = newIndex.search('Sacramento');
    console.log(`🔍 After import (${method}):`, afterImport);

    if (afterImport.length > 0) {
      console.log(`✅ ${method} export/import successful!`);
    } else {
      console.log(`❌ ${method} export/import failed - no search results`);
    }
  } catch (error) {
    console.log(`❌ ${method} import error:`, error.message);
  }
}

// If synchronous, test it immediately
if (!result2 || !result2.then) {
  testImport(exportData1, 'Synchronous');
}
