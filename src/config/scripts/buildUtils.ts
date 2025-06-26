import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { formatNumber, formatFileSize } from '@lib/formatUtils';
import { storageAdmin } from '@config/firebaseAdmin';

export { formatNumber, formatFileSize };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
export const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');

/**
 * Fetches a file from Firebase Storage and returns its contents as a buffer.
 */
export async function fetchFileFromStorage(fileName: string): Promise<Buffer> {
  const bucket = storageAdmin.bucket();
  const file = bucket.file(`integration/${fileName}`);
  try {
    const [data] = await file.download();
    return data;
  } catch (error) {
    throw new Error(
      `Failed to fetch ${fileName} from Firebase Storage: ${error}`
    );
  }
}

/**
 * Ensures a directory exists, creating it if necessary.
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Writes a gzipped JSON file to the public directory.
 */
export function writeGzippedJson(
  filename: string,
  data: unknown,
  compressionLevel: number = 9
): { size: number; path: string } {
  ensureDirectoryExists(PUBLIC_DIR);
  const outputPath = path.join(PUBLIC_DIR, filename);
  const jsonString = JSON.stringify(data);
  const gzipped = zlib.gzipSync(jsonString, { level: compressionLevel });
  fs.writeFileSync(outputPath, gzipped);
  const stats = fs.statSync(outputPath);
  return { size: stats.size, path: outputPath };
}

/**
 * Checks if a file exists in the public directory.
 */
export function publicFileExists(filename: string): boolean {
  return fs.existsSync(path.join(PUBLIC_DIR, filename));
}

/**
 * Loads JSON data from Firebase Storage with fallback to local files.
 * @throws {Error} If no data is found in any source.
 */
export async function loadDataWithFallback<T>(
  firebaseFileName: string,
  localFileName: string,
  dataType: string
): Promise<T> {
  try {
    console.log(`📂 Loading ${dataType} from Firebase Storage...`);
    const buffer = await fetchFileFromStorage(firebaseFileName);
    const data = JSON.parse(buffer.toString('utf-8'));
    if (data && (Array.isArray(data) || typeof data === 'object')) {
      const count = Array.isArray(data)
        ? data.length
        : Object.keys(data).length;
      console.log(
        `🔥 Loaded ${formatNumber(count)} ${dataType} records from Firebase Storage`
      );
      return data;
    }
    throw new Error(`Firebase ${dataType} data has unexpected format`);
  } catch (error) {
    console.warn('⚠️ Failed to load from Firebase Storage:', error);
  }
  const compressedPath = path.join(PUBLIC_DIR, `${localFileName}.gz`);
  if (fs.existsSync(compressedPath)) {
    console.log(
      `📂 Loading from existing compressed ${dataType} as fallback...`
    );
    try {
      const compressed = fs.readFileSync(compressedPath);
      const decompressed = zlib.gunzipSync(compressed);
      const data = JSON.parse(decompressed.toString());
      if (data.parcels && Array.isArray(data.parcels)) {
        console.log(
          `📂 Loaded ${formatNumber(data.parcels.length)} ${dataType} records from compressed file`
        );
        return data.parcels;
      }
      if (data.parcelIds && Array.isArray(data.parcelIds)) {
        console.log(
          `📂 Loaded ${formatNumber(data.parcelIds.length)} ${dataType} records from compressed file`
        );
        return data;
      }
      if (Array.isArray(data) || typeof data === 'object') {
        const count = Array.isArray(data)
          ? data.length
          : Object.keys(data).length;
        console.log(
          `📂 Loaded ${formatNumber(count)} ${dataType} records from compressed file`
        );
        return data;
      }
      throw new Error(`Compressed ${dataType} data has unexpected format`);
    } catch (error) {
      console.warn('⚠️ Failed to load from compressed file:', error);
    }
  }
  const rawDataPath = path.join(DATA_DIR, `${localFileName}.json`);
  if (!fs.existsSync(rawDataPath)) {
    throw new Error(`No ${dataType} data found. Missing from:
- Firebase Storage: integration/${firebaseFileName}
- Compressed fallback: ${compressedPath}
- Raw source: ${rawDataPath}

To fix this, run 'python injest_shapes.py' to generate data in Firebase Storage.`);
  }
  console.log(`📂 Loading from raw JSON ${dataType} file...`);
  const dataModule = await import(rawDataPath);
  return dataModule.default || dataModule;
}

/**
 * Logs build completion summary with consistent formatting.
 */
export function logBuildCompletion(
  buildType: string,
  startTime: number,
  recordCount: number,
  outputSize: string,
  additionalInfo?: string
): void {
  const endTime = performance.now();
  const totalTime = Math.round(endTime - startTime);
  console.log(
    `✅ ${buildType} build completed in ${(totalTime / 1000).toFixed(1)}s`
  );
  console.log(`📊 ${formatNumber(recordCount)} records processed`);
  console.log(`💽 Output: ${outputSize} gzipped (production-ready)`);
  if (additionalInfo) {
    console.log(additionalInfo);
  }
}

/**
 * Creates a standardized index structure with metadata.
 */
export function createIndexStructure<T>(
  data: T,
  version: string,
  exportMethod: string,
  recordCount: number
) {
  return {
    ...data,
    timestamp: new Date().toISOString(),
    recordCount,
    version,
    exportMethod
  };
}

/**
 * Batch processing utility with progress logging.
 */
export function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[], batchIndex: number) => R[],
  progressLabel: string = 'Processing'
): R[] {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = processor(batch, Math.floor(i / batchSize));
    results.push(...batchResults);
    const progress = (((i + batch.length) / items.length) * 100).toFixed(0);
    console.log(`   ${progressLabel}: ${progress}% complete`);
  }
  return results;
}
