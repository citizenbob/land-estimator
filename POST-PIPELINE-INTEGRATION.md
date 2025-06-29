# 📌 POST-PIPELINE-INTEGRATION.md

## How to integrate the Claude Ingest Pipeline into your Next.js app

This guide explains how the **production-ready ingest pipeline** integrates with the existing Next.js application architecture.

---

## ✅ Pipeline Architecture Overview

### **What the Pipeline Produces**

```
Vercel Blob Storage:
├── cdn/
│   ├── address-index-v1.2.3.json.gz      # Versioned FlexSearch address index
│   ├── parcel-metadata-v1.2.3.json.gz    # Versioned parcel metadata
│   ├── parcel-geometry-v1.2.3.json.gz    # Versioned geometry data
│   └── version-manifest.json              # Version management
└── integration/
    ├── address_index.json                 # Raw processed address data
    ├── parcel_metadata_index.json         # Raw processed parcel data
    └── parcel_geometry_index.json         # Raw processed geometry data
```

### **What the App Consumes**

The Next.js app should consume the **versioned CDN files** via the version manifest system.

---

## 🔧 Current App Integration Points

### **1. Address Search Service**

`/src/services/addressSearch.ts`

**Current Implementation:**

```typescript
// Uses loadAddressIndex() → address-index.json.gz
export async function searchAddresses(
  query: string
): Promise<AddressLookupRecord[]>;
```

**Integration Required:**

- Update to use **versioned CDN URLs**: `address-index-v{version}.json.gz`
- Add version manifest loading to determine current version
- Implement graceful fallback to previous version

### **2. Parcel Metadata Service**

`/src/services/parcelMetadata.ts`

**Current Implementation:**

```typescript
// Uses loadParcelMetadata() → parcel-metadata.json.gz
export async function getParcelMetadata(
  id: string
): Promise<ParcelMetadata | null>;
```

**Integration Required:**

- Update to use **versioned CDN URLs**: `parcel-metadata-v{version}.json.gz`
- Add version awareness and fallback handling

### **3. Universal Bundle Loader**

`/src/lib/universalBundleLoader.ts`

**Current Implementation:**

```typescript
// Loads static .gz files from public directory
gzippedFilename: 'address-index.json.gz';
```

**Integration Required:**

- Add version manifest fetching capability
- Support dynamic CDN URLs based on current version
- Download from CDN in background hydration
- Implement version fallback logic
- Remove any indexes in the /public directory

---

## 🚀 Required Integration Updates

### **Step 1: Version Manifest Service**

Create `/src/services/versionManifest.ts`:

```typescript
interface VersionManifest {
  generated_at: string;
  current: {
    version: string;
    files: {
      address_index: string;
      parcel_metadata: string;
      parcel_geometry: string;
    };
  };
  previous: {
    version: string;
    files: {
      address_index: string;
      parcel_metadata: string;
      parcel_geometry: string;
    };
  } | null;
  available_versions: string[];
}

export async function getVersionManifest(): Promise<VersionManifest> {
  const response = await fetch(
    'https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/version-manifest.json'
  );
  return response.json();
}
```

### **Step 2: Version-Aware Bundle Loader**

Update `/src/lib/universalBundleLoader.ts`:

```typescript
interface VersionedBundleConfig<TData, TOptimizedIndex, TBundle> {
  /** Base filename without version (e.g., 'address-index') */
  baseFilename: string;
  /** Whether to use versioned CDN URLs */
  useVersioning?: boolean;
  // ...existing config
}

export function createVersionedBundleLoader<TData, TOptimizedIndex, TBundle>(
  config: VersionedBundleConfig<TData, TOptimizedIndex, TBundle>
) {
  return {
    async loadBundle(): Promise<TBundle> {
      if (config.useVersioning) {
        const manifest = await getVersionManifest();
        const versionedUrl = manifest.current.files[config.baseFilename];
        // Load from versioned URL with fallback to previous version
      } else {
        // Use existing static file loading
      }
    }
  };
}
```

## ✅ ✅ ✅ **3️⃣ Service Worker for Background Preloading**

### Register `/public/sw.js`

```javascript
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('message', async (event) => {
  if (event.data?.type === 'PRELOAD_VERSIONED_INDEXES') {
    const manifestUrl =
      'https://<your-project>.public.blob.vercel-storage.com/cdn/version-manifest.json';
    const manifest = await fetch(manifestUrl).then((res) => res.json());
    const urls = [
      manifest.current.files.address_index,
      manifest.current.files.parcel_metadata,
      manifest.current.files.parcel_geometry
    ];
    const cache = await caches.open('versioned-index-cache');
    await Promise.all(urls.map((url) => cache.add(url)));
    console.log('[SW] Preloaded:', urls);
  }
});
```

### Register SW in `_app.tsx`

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.active?.postMessage({ type: 'PRELOAD_VERSIONED_INDEXES' });
    });
  }
}, []);
```

✅ When a user visits, the SW pulls the version manifest and preloads all index files in the background.

---

## 🗂️ Services: Example Usage

**Address Search Service:**

```typescript
const addressIndexLoader = createVersionedBundleLoader({
  baseFilename: 'address-index',
  useVersioning: true
  // ...existing config
});
```

**Parcel Metadata Service:**

```typescript
const parcelBundleLoader = createVersionedBundleLoader({
  baseFilename: 'parcel-metadata',
  useVersioning: true
  // ...existing config
});
```

### **Step 4: API Route Updates**

**Address Lookup API** `/src/app/api/lookup/route.ts`:

```typescript
export async function GET(req: Request) {
  // No changes needed - services handle versioning automatically
  const results = await searchAddresses(query);
  return Response.json(results);
}
```

**Parcel Metadata API** `/src/app/api/parcel-metadata/[id]/route.ts`:

```typescript
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // No changes needed - services handle versioning automatically
  const metadata = await getParcelMetadata(params.id);
  return Response.json(metadata);
}
```

---

## 🔄 Data Flow Integration

### **Current Flow:**

```
User Input → useAddressLookup → /api/lookup → addressSearch → Static .gz files
                               ↓
              Suggestion Select → /api/parcel-metadata → parcelMetadata → Static .gz files
```

### **Updated Flow:**

```
## 🔄 Updated Lookup Flow

```

User Input → useAddressLookup → /api/lookup → addressSearch
↓
Service Worker → Preloads versioned index files
↓
Lookup API → Reads from cache first, fallback to CDN

```

✅ Fast search experience even for large indexes!

```

### **Fallback Flow:**

```
Version Manifest → Current Version (v1.2.3) → FAIL
                                             ↓
                   Previous Version (v1.2.2) → SUCCESS
```

---

## 🧪 Testing Integration

1. Visit your site → Open DevTools → `Application → Cache → Cache Storage`\
   You should see `versioned-index-cache` populated.

2. Kill your network → Search still works from cache.

### **1. Version Manifest Availability**

```bash
curl https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/version-manifest.json
```

### **2. Versioned File Access**

```bash
# Test current version files exist
curl -I https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/address-index-v1.2.3.json.gz
curl -I https://lchevt1wkhcax7cz.public.blob.vercel-storage.com/cdn/parcel-metadata-v1.2.3.json.gz
```

### **3. App Integration Test**

```typescript
// Test version manifest loading
const manifest = await getVersionManifest();
console.log('Current version:', manifest.current.version);

// Test versioned bundle loading
const addressBundle = await loadAddressIndex();
console.log('Address bundle loaded:', addressBundle.parcelIds.length);
```

---

## 📊 Pipeline → App Data Contract

### **Address Index Structure**

```typescript
interface AddressIndex {
  parcelIds: string[]; // Array of parcel IDs
  searchStrings: string[]; // Searchable address strings
  timestamp: string; // Build timestamp
  recordCount: number; // Total addresses
  version: string; // Pipeline version
  exportMethod: string; // "flexsearch_builder"
}
```

### **Parcel Metadata Structure**

```typescript
interface ParcelMetadataIndex {
  parcels: ParcelMetadata[]; // Array of parcel data
  metadata: {
    total_parcels: number; // Total parcel count
    build_time: string; // ISO timestamp
    source: string; // "ingest_pipeline_unified"
    version: string; // "1.0"
  };
}
```

### **Version Manifest Structure**

```typescript
interface VersionManifest {
  generated_at: string; // ISO timestamp
  current: {
    version: string; // "1.2.3" (from package.json)
    files: {
      address_index: string; // Full CDN URL
      parcel_metadata: string; // Full CDN URL
      parcel_geometry: string; // Full CDN URL
    };
  };
  previous: {
    version: string; // Previous version for fallback
    files: {
      /* same structure */
    };
  } | null;
  available_versions: string[]; // All available versions
}
```

---

## 🔀 Migration Strategy

### **Phase 1: Add Version Awareness (Non-Breaking)**

1. Create version manifest service
2. Update bundle loaders to support versioning (with feature flag)
3. Test with existing static files

### **Phase 2: Enable Versioned Loading (Gradual)**

1. Enable versioning for address search service
2. Monitor performance and error rates
3. Enable versioning for parcel metadata service

### **Phase 3: Remove Static File Dependencies (Cleanup)**

1. Remove static .gz files from `public/` directory
2. Update build scripts to only generate for local development
3. Fully rely on versioned CDN files

---

## ⚡ Performance Considerations

### **Caching Strategy**

- **Version Manifest**: Cache for 5 minutes (frequent updates during development)
- **Index Files**: Cache for 24 hours (immutable once versioned)
- **Fallback Behavior**: Previous version cache for 7 days

### **Error Handling**

- **Network Failures**: Graceful degradation to cached versions
- **Version Mismatches**: Automatic fallback to previous version
- **Corrupted Data**: Clear cache and retry with fallback version

### **Monitoring**

- Track version manifest fetch success/failure rates
- Monitor index file load times by version
- Alert on fallback version usage spikes

---

## 🎯 Success Criteria

**✅ Integration Complete When:**

## 📊 Success Criteria

✅ Version manifest loads under 200ms\
✅ Indexes are preloaded in the background\
✅ Lookup APIs read from SW cache first\
✅ Zero reliance on `/public` files\
✅ Graceful fallback to previous version\
✅ High offline resilience for repeat users

**📊 Performance Targets:**

- Version manifest load: < 200ms
- Index file load: < 2s (with compression)
- Fallback activation: < 500ms additional latency
- Cache hit rate: > 90% for index files
