// build-flexsearch-index.ts
// Build FlexSearch index from Firebase Storage data and save it for Web Worker loading

import FlexSearch from 'flexsearch';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_URL =
  'https://firebasestorage.googleapis.com/v0/b/land-estimator-29ee9.firebasestorage.app/o/cdn%2Faddress-index.json.gz?alt=media&token=744d3a34-24d7-4203-a08b-142f27620e58';

interface IndexEntry {
  id: number;
  searchable: string;
  parcelId?: string;
}

async function buildFlexSearchIndex() {
  console.log('🔄 Building FlexSearch index for Firebase Storage...');

  try {
    // Download and parse source data
    console.log('📥 Fetching source data...');
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    console.log(`📦 Downloaded ${buffer.length} bytes`);

    const jsonText = zlib.gunzipSync(buffer).toString('utf-8');
    const parsed = JSON.parse(jsonText);

    const searchStrings: string[] = parsed.searchStrings || [];
    console.log(`📋 Processing ${searchStrings.length} address strings`);

    // Create FlexSearch index
    console.log('🔍 Creating FlexSearch index...');
    const flexIndex = new FlexSearch.Index({
      tokenize: 'forward',
      cache: 100,
      resolution: 3
    });

    // Prepare entries and build index
    const entries: IndexEntry[] = [];

    console.log('📝 Adding entries to index...');
    for (let i = 0; i < searchStrings.length; i++) {
      const str = searchStrings[i];

      // Extract parcel ID from end of string
      const lastSpaceIndex = str.lastIndexOf(' ');
      const parcelId =
        lastSpaceIndex > 0 ? str.substring(lastSpaceIndex + 1) : '';

      const entry: IndexEntry = {
        id: i,
        searchable: str,
        parcelId
      };

      entries.push(entry);
      flexIndex.add(i, str);

      if (i % 50000 === 0) {
        console.log(`   Processed ${i}/${searchStrings.length} entries...`);
      }
    }

    console.log('✅ FlexSearch index created successfully');

    // Create the data structure for Web Worker
    const indexData = {
      entries,
      metadata: {
        totalEntries: entries.length,
        buildTime: new Date().toISOString(),
        sourceUrl: SOURCE_URL,
        version: '1.0',
        indexConfig: {
          tokenize: 'forward',
          cache: 100,
          resolution: 3
        }
      }
    };

    // Save to file (compressed)
    console.log('💾 Saving index files...');

    // Create directory structure
    const integrationDir = path.join(__dirname, 'store', 'integration');
    const flexsearchDir = path.join(__dirname, 'store', 'flexsearch');
    fs.mkdirSync(integrationDir, { recursive: true });
    fs.mkdirSync(flexsearchDir, { recursive: true });

    // Save sample entries for integration testing
    const sampleEntries = entries.slice(0, 100);
    const entriesPath = path.join(integrationDir, 'address-entries.json');
    fs.writeFileSync(entriesPath, JSON.stringify(sampleEntries, null, 2));
    console.log(`✅ Sample entries saved: ${entriesPath}`);

    // Save uncompressed index
    const jsonString = JSON.stringify(indexData);
    const uncompressedPath = path.join(flexsearchDir, 'flexsearch-index.json');
    fs.writeFileSync(uncompressedPath, jsonString);
    console.log(`✅ Uncompressed index saved: ${uncompressedPath}`);

    // Save compressed index
    const compressed = zlib.gzipSync(Buffer.from(jsonString));
    const compressedPath = path.join(flexsearchDir, 'flexsearch-index.json.gz');
    fs.writeFileSync(compressedPath, compressed);

    console.log(`💾 Compressed index saved: ${compressedPath}`);
    console.log(
      `📊 Compressed size: ${compressed.length} bytes (${Math.round((compressed.length / 1024 / 1024) * 100) / 100}MB)`
    );
    console.log(
      `📊 Uncompressed size: ${jsonString.length} bytes (${Math.round((jsonString.length / 1024 / 1024) * 100) / 100}MB)`
    );

    // Test the index
    console.log('🧪 Testing index...');
    const testResults = flexIndex.search('626', { limit: 3 });
    console.log(
      `✅ Test search found ${testResults.length} results:`,
      testResults.map((id) => entries[id as number].searchable)
    );

    console.log('\n🎉 Build complete!');
    console.log('📤 Next steps:');
    console.log(
      '1. Upload store/flexsearch/flexsearch-index.json.gz to Firebase Storage'
    );
    console.log('2. Update the Web Worker to use the new index URL');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildFlexSearchIndex().catch(console.error);
}

export { buildFlexSearchIndex };
