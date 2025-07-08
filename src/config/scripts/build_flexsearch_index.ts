import FlexSearch from 'flexsearch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const projectRoot = path.resolve(__dirname, '../../..');
const tempRawDir = path.join(projectRoot, 'src', 'data', 'tmp');
const publicSearchDir = path.join(projectRoot, 'public', 'search');

if (!fs.existsSync(publicSearchDir)) {
  fs.mkdirSync(publicSearchDir, { recursive: true });
}

const addressIndexPath = path.join(tempRawDir, 'address-index.json');
const lookupPath = path.join(publicSearchDir, 'lookup.json');
const metadataPath = path.join(publicSearchDir, 'metadata.json');
const latestPath = path.join(publicSearchDir, 'latest.json');

// Function to build FlexSearch index
function buildFlexSearchIndex() {
  const addressIndex: Array<{ id: string; address: string }> = JSON.parse(
    fs.readFileSync(addressIndexPath, 'utf-8')
  );

  const index = new FlexSearch.Index({
    tokenize: 'forward',
    cache: 100,
    resolution: 3
  });

  addressIndex.forEach(({ id, address }) => {
    index.add(id, address);
  });

  // Using type assertion to bypass the TypeScript error - FlexSearch actually supports export() without args
  const exportedIndex = (index as unknown as { export(): unknown }).export();

  fs.writeFileSync(lookupPath, JSON.stringify(exportedIndex));
  fs.writeFileSync(metadataPath, JSON.stringify(addressIndex));
  fs.writeFileSync(
    latestPath,
    JSON.stringify({ lookup: 'lookup.json', metadata: 'metadata.json' })
  );

  console.log(`✅ FlexSearch index built and saved to ${publicSearchDir}`);
}

buildFlexSearchIndex();
