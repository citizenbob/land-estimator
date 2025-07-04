#!/usr/bin/env tsx

/**
 * Debug Script for Static File Loading
 * Tests the exact same loading logic that failed in the browser
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules, we need to get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

async function debugStaticLoading() {
  console.log('🏗️ Project root:', projectRoot);
  console.log(
    '🔍 Debug: Testing Static File Loading (Real Node.js Environment)'
  );
  console.log(
    '=================================================================='
  );

  // Test 1: File System Check
  console.log('\n1. 📁 File System Check');
  console.log('------------------------');

  const publicDir = path.join(projectRoot, 'public', 'search');
  console.log('📂 Public search directory:', publicDir);

  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    console.log('✅ Files found:', files);

    // Check each file size and content
    files.forEach((file) => {
      const filePath = path.join(publicDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   📄 ${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    });

    // Check latest.json content
    const latestPath = path.join(publicDir, 'latest.json');
    if (fs.existsSync(latestPath)) {
      const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
      console.log('✅ latest.json content:', latest);

      // Check if referenced files exist
      if (latest.files) {
        latest.files.forEach((file: string) => {
          const filePath = path.join(publicDir, file);
          const exists = fs.existsSync(filePath);
          console.log(`   ${exists ? '✅' : '❌'} Referenced file: ${file}`);
        });
      }
    } else {
      console.log('❌ latest.json not found');
    }
  } else {
    console.log('❌ Public search directory not found');
    return;
  }

  // Test 2: Direct File Content Analysis
  console.log('\n2. 📊 Direct File Content Analysis');
  console.log('----------------------------------');

  let latest: { files?: string[] } | null = null;
  try {
    const latestPath = path.join(publicDir, 'latest.json');
    latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));

    if (latest && latest.files && latest.files[0]) {
      const lookupPath = path.join(publicDir, latest.files[0]);
      const lookupData = JSON.parse(fs.readFileSync(lookupPath, 'utf8'));

      console.log('📋 Lookup file analysis:', {
        hasParcelIds: !!lookupData.parcelIds,
        parcelCount: lookupData.parcelIds?.length || 0,
        hasSearchStrings: !!lookupData.searchStrings,
        searchStringCount: lookupData.searchStrings?.length || 0,
        hasAddressData: !!lookupData.addressData,
        addressDataKeys: lookupData.addressData
          ? Object.keys(lookupData.addressData).length
          : 0,
        sampleData: {
          firstParcel: lookupData.parcelIds?.[0],
          firstSearchString: lookupData.searchStrings?.[0],
          firstAddress: lookupData.addressData?.[lookupData.parcelIds?.[0]]
        }
      });

      // Test FlexSearch data structure
      if (
        lookupData.parcelIds &&
        lookupData.searchStrings &&
        lookupData.addressData
      ) {
        console.log('\n🔍 Testing FlexSearch Data Structure...');

        // Validate data consistency
        const parcelCount = lookupData.parcelIds.length;
        const searchStringCount = lookupData.searchStrings.length;
        const addressDataCount = Object.keys(lookupData.addressData).length;

        console.log('📊 Data consistency check:', {
          parcelCount,
          searchStringCount,
          addressDataCount,
          isConsistent:
            parcelCount === searchStringCount &&
            parcelCount === addressDataCount
        });

        // Sample a few entries
        console.log('\n📋 Sample entries:');
        for (let i = 0; i < Math.min(5, parcelCount); i++) {
          const parcelId = lookupData.parcelIds[i];
          const searchString = lookupData.searchStrings[i];
          const address = lookupData.addressData[parcelId];
          console.log(
            `   ${i + 1}. ${parcelId} → "${searchString}" → "${address}"`
          );
        }
      }
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.log('❌ Error analyzing file content:', err.message);
  }

  // Test 3: URL Testing (without browser environment simulation)
  console.log('\n3. 🌐 Static File URL Testing');
  console.log('------------------------------');

  // Test URLs that should work in the browser
  const testUrls = [
    '/search/latest.json',
    latest?.files?.[0] ? `/search/${latest.files[0]}` : null,
    latest?.files?.[1] ? `/search/${latest.files[1]}` : null
  ].filter(Boolean);

  console.log('📋 URLs that should be accessible in browser:');
  testUrls.forEach((url) => {
    console.log(`   🔗 http://localhost:3000${url}`);
  });

  // Test 4: Next.js Static File Serving Check
  console.log('\n4. 📂 Next.js Static File Configuration');
  console.log('----------------------------------------');

  // Check if files are in the right place for Next.js
  const nextPublicPath = path.join(projectRoot, 'public');
  const nextSearchPath = path.join(nextPublicPath, 'search');

  console.log('📁 Next.js public directory structure:');
  console.log(`   📂 ${path.relative(projectRoot, nextPublicPath)}/`);

  if (fs.existsSync(nextSearchPath)) {
    const searchFiles = fs.readdirSync(nextSearchPath);
    searchFiles.forEach((file) => {
      const filePath = path.join(nextSearchPath, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`     📄 search/${file} (${size}MB)`);
    });
  }

  console.log('\n✅ Debug analysis complete!');
  console.log('🎯 Next steps:');
  console.log('   1. Start dev server: yarn dev');
  console.log('   2. Test URLs in browser:');
  testUrls.forEach((url) => {
    console.log(`      curl http://localhost:3000${url}`);
  });
  console.log('   3. Check browser console for static loading errors');
}

// Run the debug script if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  debugStaticLoading().catch(console.error);
}
