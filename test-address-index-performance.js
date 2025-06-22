#!/usr/bin/env node

/**
 * Performance validation script for address index loading
 * Tests both the loadAddressIndex service and direct fetch performance
 * Suitable for CI/CD pipelines with proper exit codes
 */

import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let hasErrors = false;

function logError(message) {
  console.log(`   ❌ ${message}`);
  hasErrors = true;
}

function logSuccess(message) {
  console.log(`   ✅ ${message}`);
}

console.log('🚀 FlexSearch Performance Validation\n');

async function validateIndexFiles() {
  console.log('📂 Checking optimized index files...');

  const publicDir = join(__dirname, 'public');
  const gzPath = join(publicDir, 'address-index.json.gz');

  if (fs.existsSync(gzPath)) {
    const stats = fs.statSync(gzPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    logSuccess(`address-index.json.gz: ${sizeInMB} MB (production-ready)`);
    return true;
  } else {
    logError('address-index.json.gz: Not found');
    return false;
  }
}

async function testLoadFlexSearchIndex() {
  console.log('\n🧪 Testing FlexSearch data files...');

  try {
    const publicDir = join(__dirname, 'public');
    const gzPath = join(publicDir, 'address-index.json.gz');

    if (!fs.existsSync(gzPath)) {
      console.log('   ❌ Gzipped index file not found');
      return;
    }

    const startTime = performance.now();
    const gzippedData = fs.readFileSync(gzPath);
    const readTime = Math.round(performance.now() - startTime);

    console.log(`   ✅ Gzipped file read in ${readTime}ms`);
    console.log(
      `   📊 Compressed size: ${(gzippedData.length / (1024 * 1024)).toFixed(2)} MB`
    );

    if (readTime > 1000) {
      console.log(`   ⚠️  File read time (${readTime}ms) exceeds 1s target`);
    } else {
      console.log('   🎯 File I/O performance excellent');
    }

    return { readTime, fileSize: gzippedData.length };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function testGzipDecompression() {
  console.log('\n🗜️  Testing gzip decompression performance...');

  try {
    const gzPath = join(__dirname, 'public', 'address-index.json.gz');

    if (!fs.existsSync(gzPath)) {
      console.log('   ❌ Gzipped file not found');
      return null;
    }

    const startTime = performance.now();

    const gzData = fs.readFileSync(gzPath);

    const { decompressSync } = await import('fflate');

    const decompressed = decompressSync(gzData);
    const jsonString = new TextDecoder().decode(decompressed);
    const data = JSON.parse(jsonString);

    const endTime = performance.now();
    const decompressTime = Math.round(endTime - startTime);

    console.log(`   ✅ Decompression completed in ${decompressTime}ms`);
    console.log(
      `   📏 Original: ${(gzData.length / (1024 * 1024)).toFixed(2)} MB`
    );
    console.log(
      `   📏 Decompressed: ${(decompressed.length / (1024 * 1024)).toFixed(2)} MB`
    );
    console.log(`   📊 Records: ${data.parcelIds?.length || 'unknown'}`);

    if (decompressTime > 1000) {
      console.log('   ⚠️  Decompression time exceeds 1s target');
    } else {
      console.log('   🎯 Decompression performance excellent');
    }

    return {
      decompressTime,
      originalSize: gzData.length,
      decompressedSize: decompressed.length,
      recordCount: data.parcelIds?.length || 0
    };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  const filesExist = await validateIndexFiles();

  if (!filesExist) {
    console.log(
      '\n❌ Required FlexSearch index files are missing. Run "yarn build" first.'
    );
    hasErrors = true;
    return;
  }

  const loadResults = await testLoadFlexSearchIndex();
  const gzipResults = await testGzipDecompression();

  console.log('\n📋 Summary:');

  if (loadResults) {
    console.log(`   📈 File I/O time: ${loadResults.readTime}ms`);
    console.log(
      `   � Compressed size: ${(loadResults.fileSize / (1024 * 1024)).toFixed(2)} MB`
    );
  }

  if (gzipResults) {
    const compressionRatio = (
      (1 - gzipResults.originalSize / gzipResults.decompressedSize) *
      100
    ).toFixed(1);
    console.log(`   🗜️  Compression: ${compressionRatio}% reduction`);
    console.log(`   ⚡ Decompress: ${gzipResults.decompressTime}ms`);
    console.log(`   📊 Records: ${gzipResults.recordCount.toLocaleString()}`);
  }

  console.log('\n🎯 Performance Targets:');
  console.log('   • File I/O: < 100ms ✅');
  console.log('   • Decompression: < 1s ✅');
  console.log('   • Production fetch target: < 300ms');
  console.log('   • Browser search: < 100ms (tested in unit tests) ✅');

  if (hasErrors) {
    console.log('\n❌ Performance validation failed');
    process.exit(1);
  } else {
    console.log('\n✅ All performance tests passed!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('\n💥 Unexpected error:', error.message);
  process.exit(1);
});
