// addressLookupComparison.ts
// Compare Firebase Storage + FlexSearch + Web Worker vs Vercel Blob architecture

import { lookupAddressByPrefix as vercelLookup } from './vercel-blob-address-lookup/addressLookup.vercel';

async function compareArchitectures() {
  console.log(
    '🚀 FlexSearch + Web Worker vs Vercel Blob Architecture Comparison\n'
  );
  console.log(
    '⚠️  NOTE: This is Node.js - FlexSearch Web Worker cannot run here'
  );
  console.log(
    '📋 For real FlexSearch performance, open: src/exp/real-performance-test.html\n'
  );

  console.log('📊 ARCHITECTURE COMPARISON');
  console.log('═'.repeat(60));

  console.log('\n🔥 Firebase Storage + FlexSearch + Web Worker:');
  console.log('   • Build: Convert data → FlexSearch index → Firebase Storage');
  console.log('   • Runtime: Web Worker loads index in background');
  console.log(
    '   • Search: <10ms after index loads, API fallback during loading'
  );
  console.log('   • Memory: ~80-120MB in isolated Web Worker');
  console.log(
    '   • UX: Instant API response → Progressive enhancement to ultra-fast'
  );

  console.log('\n🌐 Vercel Blob CDN:');
  console.log('   • Build: Upload data → Vercel Blob → CDN distribution');
  console.log('   • Runtime: Direct fetch from CDN on each search');
  console.log('   • Search: 200-500ms per request (network dependent)');
  console.log('   • Memory: Minimal (no local index)');
  console.log('   • UX: Consistent but slower response times');

  console.log('\n⚡ EXPECTED PERFORMANCE (based on FlexSearch benchmarks)');
  console.log('═'.repeat(60));

  console.log('\nFlexSearch + Web Worker (Expected):');
  console.log('   Cold start: 200-500ms (API fallback)');
  console.log('   Warm state: 5-15ms (FlexSearch in-memory search)');
  console.log('   Index load: 10-30 seconds (background, non-blocking)');

  console.log('\nVercel Blob (Measured below):');
  console.log('   All requests: Network + processing time');
  console.log('   No warmup needed');
  console.log('   Network dependent');

  // Test Vercel Blob for real performance data
  console.log('\n🧪 REAL VERCEL BLOB PERFORMANCE TEST');
  console.log('═'.repeat(60));

  const testQueries = ['123', '456', '789'];
  const vercelTimes: number[] = [];

  for (const query of testQueries) {
    console.log(`\n📍 Testing Vercel Blob: "${query}"`);
    try {
      const startTime = Date.now();
      const results = await vercelLookup(query, 3);
      const elapsed = Date.now() - startTime;
      vercelTimes.push(elapsed);

      console.log(`   ⚡ Results: ${results.length} addresses in ${elapsed}ms`);
      if (results.length > 0) {
        const sample = results[0];
        let sampleText = 'N/A';

        if (typeof sample === 'string') {
          sampleText = sample;
        } else if (sample && typeof sample === 'object') {
          const obj = sample as Record<string, unknown>;
          sampleText =
            (obj.searchable as string) ||
            (obj.address as string) ||
            JSON.stringify(sample).slice(0, 50);
        }

        console.log(`   📄 Sample: ${sampleText}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Failed: ${message}`);
    }
  }

  if (vercelTimes.length > 0) {
    const avgTime = vercelTimes.reduce((a, b) => a + b, 0) / vercelTimes.length;
    console.log(`\n📊 Vercel Blob Average: ${avgTime.toFixed(1)}ms`);
  }

  console.log('\n✨ RECOMMENDATION');
  console.log('═'.repeat(60));
  console.log(
    '⚠️  IMPORTANT: These are architectural projections for FlexSearch'
  );
  console.log(
    '📋 For real performance validation, use: src/exp/real-performance-test.html\n'
  );
  console.log(
    '🏆 Firebase Storage + FlexSearch + Web Worker is recommended for:'
  );
  console.log('   • Ultra-fast search performance after loading');
  console.log('   • No user-facing delays (instant API fallback)');
  console.log('   • Scalable to 500k+ addresses');
  console.log('   • Progressive enhancement UX');

  console.log('\n📋 Next Steps:');
  console.log(
    '   1. Open src/exp/real-performance-test.html for real browser testing'
  );
  console.log('   2. Upload FlexSearch index to Firebase Storage');
  console.log('   3. Integrate into main application with proper monitoring');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  compareArchitectures().catch(console.error);
}

export { compareArchitectures };
