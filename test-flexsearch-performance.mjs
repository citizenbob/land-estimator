// Performance test: How fast is rebuilding FlexSearch from search strings?
import FlexSearch from 'flexsearch';

console.log('🎯 Performance test: FlexSearch rebuild vs export/import...');

// Create a larger test dataset
const generateTestData = (count) => {
  const cities = ['Sacramento', 'Davis', 'Roseville', 'Folsom', 'Elk Grove'];
  const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'First St', 'Second Ave'];
  const data = [];

  for (let i = 0; i < count; i++) {
    const city = cities[i % cities.length];
    const street = streets[i % streets.length];
    const number = 100 + i;
    data.push(
      `${number} ${street}, ${city}, CA 95${String(800 + (i % 100)).padStart(3, '0')}`
    );
  }

  return data;
};

const testSizes = [100, 500, 1000, 5000];

for (const size of testSizes) {
  console.log(`\n📊 Testing with ${size} addresses...`);

  const testData = generateTestData(size);

  // Test rebuild performance
  const startTime = performance.now();

  const index = new FlexSearch.Index({
    tokenize: 'forward',
    cache: 100,
    resolution: 3
  });

  testData.forEach((searchString, idx) => {
    index.add(idx, searchString);
  });

  const endTime = performance.now();
  const buildTime = endTime - startTime;

  // Test search performance
  const searchStart = performance.now();
  const results = index.search('Sacramento');
  const searchEnd = performance.now();
  const searchTime = searchEnd - searchStart;

  console.log(`  📋 Build time: ${buildTime.toFixed(2)}ms`);
  console.log(`  🔍 Search time: ${searchTime.toFixed(2)}ms`);
  console.log(`  📊 Results: ${results.length} matches`);
  console.log(
    `  ⚡ Total (build + search): ${(buildTime + searchTime).toFixed(2)}ms`
  );
}

console.log(
  '\n💡 Conclusion: If rebuild time is acceptable, we can skip export/import complexity!'
);
