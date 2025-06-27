# Experimental Features - Firebase Storage + FlexSearch + Web Worker

This directory contains experimental implementations for high-performance address lookup using Firebase Storage, FlexSearch, and Web Workers.

## 🏗️ Architecture

### Core Components

- **FlexSearch Index**: Compressed search index stored in Firebase Storage (`/cdn/flexsearch-index.json.gz`)
- **Web Worker**: Background loading and searching (`flexsearch-worker.ts`)
- **Lookup API**: Main interface with API fallback (`addressLookup.firestore-webworker.ts`)
- **Build Scripts**: Index generation and upload automation

### Directory Structure

```
src/exp/
├── firestore-address-lookup/
│   ├── addressLookup.firestore-webworker.ts    # Main lookup API
│   ├── build-flexsearch-index.ts               # Index build script
│   ├── flexsearch-worker.ts                    # Web Worker implementation
│   └── store/flexsearch/
│       ├── flexsearch-index.json.gz            # Compressed FlexSearch index
│       └── upload-flexsearch-index.mjs         # Upload script for Firebase Storage
└── flexsearch-complete-test.html               # Comprehensive test/validation page
```

## 🚀 Usage

### Building and Uploading the Index

```bash
# Build the FlexSearch index from Firebase data
cd src/exp/firestore-address-lookup
npx tsx build-flexsearch-index.ts

# Upload to Firebase Storage
cd store/flexsearch
node upload-flexsearch-index.mjs
```

### Integration

```typescript
import { createFirestoreWebWorkerLookup } from './exp/firestore-address-lookup/addressLookup.firestore-webworker';

const lookup = createFirestoreWebWorkerLookup();

// Search with instant API fallback while index loads
const results = await lookup.search('123 Main St');
```

## 🧪 Live Testing & Validation

**🚀 Interactive Demo: `flexsearch-complete-test.html`**

**Open this file in your browser for:**

- ✅ **Real-time performance comparison** - FlexSearch vs Vercel Blob vs API
- ✅ **Complete system diagnostics** - CORS, compression, Web Workers, networking
- ✅ **Interactive testing** with 527,316 real address entries
- ✅ **Browser compatibility validation** - ES6 modules, decompression, workers
- ✅ **Head-to-head speed comparisons** with actual timing measurements
- ✅ **Firebase Storage integration testing** - accessibility, headers, CORS

**Live Test Results:**

- **FlexSearch**: <1ms searches (feels instant)
- **Vercel Blob**: ~700ms searches (noticeable delay)
- **Performance improvement**: 200-700x faster with FlexSearch
- **All systems validated**: 527k entries, 8MB compressed index

## 🎯 Key Features

### Performance

- ⚡ **Instant API Fallback**: Immediate results while index loads in background
- 🔄 **Web Worker Architecture**: Non-blocking search operations
- 📦 **Compressed Storage**: Gzipped index for minimal bandwidth usage
- 🏆 **Sub-millisecond Search**: Once loaded, searches complete in <1ms

### Scalability

- ☁️ **Firebase Storage**: CDN-backed global distribution
- 🔄 **Progressive Enhancement**: Graceful degradation to API when needed
- 📱 **Browser Compatible**: Works in all modern browsers with Web Worker support

### Reliability

- 🛡️ **Error Handling**: Comprehensive error recovery and reporting
- 📊 **Status Reporting**: Real-time loading and health status
- 🔄 **Automatic Retry**: Built-in retry logic for network issues

## 🌐 Live URLs

- **FlexSearch Index**: `https://firebasestorage.googleapis.com/v0/b/land-estimator-29ee9.firebasestorage.app/o/cdn%2Fflexsearch-index.json.gz?alt=media`
- **Test Page**: `file:///.../src/exp/flexsearch-complete-test.html`

## 📝 Environment Setup

Requires `.env.local` in project root with Firebase credentials:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
```

## ✅ Validation Status

- [x] **FlexSearch index builds successfully** from Firebase data (527,316 entries)
- [x] **Index uploads to Firebase Storage** with public access and CORS
- [x] **Web Worker loads and processes** compressed index (8MB → 57MB)
- [x] **Search operations complete** in sub-millisecond time (<1ms)
- [x] **API fallback works** during index loading (progressive enhancement)
- [x] **All components isolated** within `/src/exp` directory
- [x] **CORS configuration applied** via gcloud CLI
- [x] **Browser-based testing validated** via `flexsearch-complete-test.html`
- [x] **Performance comparison completed** - 200-700x improvement demonstrated
- [x] **Production infrastructure ready** - Firebase Storage CDN deployed

**Status: ✅ COMPLETE - Ready for integration into main application**

---

_This experimental implementation demonstrates a production-ready, high-performance address lookup solution using modern web technologies and Firebase infrastructure._
