#!/usr/bin/env node

/**
 * Test script to validate parallel request deduplication
 * This simulates multiple concurrent calls to loadAddressIndex()
 * and ensures only one CDN request is made.
 */

import { performance } from 'perf_hooks';

// Mock the required modules for testing
console.log('🧪 Testing parallel request deduplication...\n');

// Track CDN requests to verify deduplication
let cdnRequestCount = 0;
const originalFetch = global.fetch;

// Mock fetch to count CDN requests
global.fetch = async (url, options) => {
  if (typeof url === 'string' && url.includes('storage.googleapis.com')) {
    cdnRequestCount++;
    console.log(`📥 [CDN Request #${cdnRequestCount}] ${url.split('/').pop()}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return mock response
    return {
      ok: true,
      arrayBuffer: async () => {
        // Mock compressed data - simple JSON with fflate compression simulation
        const mockData = {
          parcelIds: ['1', '2', '3'],
          searchStrings: ['Address 1', 'Address 2', 'Address 3'],
          timestamp: new Date().toISOString(),
          recordCount: 3,
          version: '1.0.0',
          exportMethod: 'rebuild'
        };

        // Return as ArrayBuffer (simplified mock)
        const jsonString = JSON.stringify(mockData);
        const encoder = new TextEncoder();
        return encoder.encode(jsonString).buffer;
      }
    };
  }

  // For other requests, use original fetch or mock as needed
  return originalFetch
    ? originalFetch(url, options)
    : Promise.reject('Mock fetch');
};

// Mock the compression library
const mockDecompressSync = (data) => {
  return new Uint8Array(data); // Just return the data as-is for testing
};

// Mock the version manifest
const mockGetVersionManifest = async () => ({
  current: {
    version: '1.0.0',
    files: {
      address_index: 'mock-address-index.json.gz'
    }
  }
});

// Import and setup mocks
const { loadVersionedBundle } = await import(
  './src/workers/versionedBundleLoader.ts'
);

// Mock the required imports at module level
const moduleUrl = new URL(
  './src/workers/versionedBundleLoader.ts',
  import.meta.url
);
const module = await import(moduleUrl);

// Override the internal functions
const originalModule = { ...module };

// Create the config for address index loading
const addressIndexConfig = {
  baseFilename: 'address-index',
  createLookupMap: () => ({}),
  extractDataFromIndex: (index) => [index],
  createBundle: async (data) => {
    const indexData = data[0];
    return {
      index: { search: () => [0, 1, 2] }, // Mock FlexSearch index
      parcelIds: indexData.parcelIds,
      addressData: { 1: 'Address 1', 2: 'Address 2', 3: 'Address 3' }
    };
  }
};

async function testParallelRequestDeduplication() {
  const startTime = performance.now();
  cdnRequestCount = 0;

  console.log('🚀 Starting 5 parallel loadVersionedBundle calls...');

  // Make 5 parallel requests
  const promises = Array.from({ length: 5 }, (_, i) => {
    console.log(`   📤 Request ${i + 1} started`);
    return loadVersionedBundle(addressIndexConfig);
  });

  try {
    const results = await Promise.all(promises);
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    console.log(`\n✅ All requests completed in ${duration}ms`);
    console.log(`📊 Results:`);
    console.log(`   • CDN requests made: ${cdnRequestCount}`);
    console.log(`   • Parallel requests: ${promises.length}`);
    console.log(
      `   • Deduplication ratio: ${promises.length}:${cdnRequestCount}`
    );

    // Validate results
    const allResultsValid = results.every(
      (result) =>
        result && result.parcelIds && result.addressData && result.index
    );

    if (cdnRequestCount === 1) {
      console.log('🎯 SUCCESS: Only 1 CDN request made for 5 parallel calls!');
    } else {
      console.log(
        `⚠️  WARNING: Expected 1 CDN request, but got ${cdnRequestCount}`
      );
    }

    if (allResultsValid) {
      console.log('✅ All results are valid bundles');
    } else {
      console.log('❌ Some results are invalid');
    }

    return {
      success: cdnRequestCount === 1 && allResultsValid,
      cdnRequests: cdnRequestCount,
      parallelRequests: promises.length,
      duration
    };
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
const result = await testParallelRequestDeduplication();

if (result.success) {
  console.log('\n🎉 Parallel request deduplication test PASSED!');
  process.exit(0);
} else {
  console.log('\n💥 Parallel request deduplication test FAILED!');
  if (result.error) {
    console.log('Error:', result.error);
  }
  process.exit(1);
}
