// realWorldTest.ts
// Test fetching actual addresses from each storage solution

import { lookupAddressByPrefix as firestoreLookup } from './firestore-address-lookup/addressLookup.firestore';
import { lookupAddressByPrefix as vercelLookup } from './vercel-blob-address-lookup/addressLookup.vercel';
import { lookupAddressByPrefix as cloudflareLookup } from './cloudflare-address-lookup/addressLookup.cloudflare';

async function testRealWorldFetch() {
  const testQueries = ['123', '456', '789', '101', '200'];

  console.log('🔍 Testing Real Address Fetches\n');

  for (const query of testQueries) {
    console.log(`\n📍 Testing query: "${query}"`);
    console.log('─'.repeat(50));

    // Test Firebase Storage CDN
    try {
      console.time(`⚡ Firebase CDN - ${query}`);
      const firestoreResults = await firestoreLookup(query, 3);
      console.timeEnd(`⚡ Firebase CDN - ${query}`);
      console.log(`   Results: ${firestoreResults.length} addresses found`);
      if (firestoreResults.length > 0) {
        console.log(
          `   Sample: ${JSON.stringify(firestoreResults[0], null, 2).slice(0, 100)}...`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Firebase CDN failed: ${message}`);
    }

    // Test Vercel Blob
    try {
      console.time(`⚡ Vercel Blob - ${query}`);
      const vercelResults = await vercelLookup(query, 3);
      console.timeEnd(`⚡ Vercel Blob - ${query}`);
      console.log(`   Results: ${vercelResults.length} addresses found`);
      if (vercelResults.length > 0) {
        console.log(
          `   Sample: ${JSON.stringify(vercelResults[0], null, 2).slice(0, 100)}...`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Vercel Blob failed: ${message}`);
    }

    // Test Cloudflare KV (will fail without proper setup, but good to test)
    try {
      console.time(`⚡ Cloudflare KV - ${query}`);
      const cloudflareResults = await cloudflareLookup(query, 3);
      console.timeEnd(`⚡ Cloudflare KV - ${query}`);
      console.log(`   Results: ${cloudflareResults.length} addresses found`);
      if (cloudflareResults.length > 0) {
        console.log(
          `   Sample: ${JSON.stringify(cloudflareResults[0], null, 2).slice(0, 100)}...`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Cloudflare KV failed: ${message}`);
    }
  }

  console.log('\n✅ Real-world test complete!');
}

// Run the test
testRealWorldFetch().catch(console.error);
