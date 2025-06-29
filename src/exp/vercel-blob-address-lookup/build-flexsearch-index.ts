// build-flexsearch-index.ts
// Build FlexSearch index from Vercel Blob data and save it for Web Worker loading

import FlexSearch from 'flexsearch';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the versioned loading system
import { loadAddressIndex } from '@services/loadAddressIndex';

interface IndexEntry {
  id: number;
  searchable: string;
  parcelId?: string;
}

async function buildFlexSearchIndex() {
  console.log('🔄 Building FlexSearch index from versioned data...');

  try {
    // Use the versioned loading system
    console.log('📥 Loading address index via versioned loader...');
    const addressIndexBundle = await loadAddressIndex();

    // Extract the search strings from the bundle
    const searchStrings = Object.keys(addressIndexBundle.addressData);
    console.log(
      `📦 Loaded ${searchStrings.length} addresses from versioned system`
    );

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

    console.log(
      '✅ FlexSearch index created successfully from Vercel Blob data'
    );

    // Create the data structure for Web Worker
    const indexData = {
      entries,
      metadata: {
        totalEntries: entries.length,
        buildTime: new Date().toISOString(),
        sourceUrl: 'versioned-system',
        sourceType: 'vercel-blob',
        version: '1.0-vercel',
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
      '1. Upload store/flexsearch/flexsearch-index.json.gz to Vercel Blob'
    );
    console.log('2. Update the Web Worker to use the new Vercel Blob URL');
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
