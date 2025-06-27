# Firebase Storage + FlexSearch + Web Worker Address Lookup

**Goal:**  
High-performance address lookup using FlexSearch index loaded via Web Worker from Firebase Storage, with instant API fallback.

## 🏗️ Architecture

```
User Input → addressLookup.firestore-webworker.ts
                ↓
            Web Worker ready?
                ↓                    ↓
            YES: FlexSearch      NO: API fallback
            (<1ms)              (200-500ms)
                ↓
            flexsearch-worker.ts
                ↓
            FlexSearch Index (Firebase Storage CDN)
```

## 📁 Files

### Core Implementation

- `addressLookup.firestore-webworker.ts` - Main lookup API with progressive enhancement
- `flexsearch-worker.ts` - Web Worker for background index loading and searching
- `build-flexsearch-index.ts` - Build script: converts Firebase data to FlexSearch index

### Data & Deployment

- `store/flexsearch/flexsearch-index.json.gz` - Compressed index (8MB) for Firebase Storage
- `store/flexsearch/upload-flexsearch-index.mjs` - Deployment script for Firebase Storage

## 🚀 Quick Start

### 1. Build the FlexSearch Index

```bash
cd src/exp/firestore-address-lookup
npx tsx build-flexsearch-index.ts
```

### 2. Deploy to Firebase Storage

```bash
cd store/flexsearch
node upload-flexsearch-index.mjs
```

### 3. Integration

```typescript
import { createFirestoreWebWorkerLookup } from './exp/firestore-address-lookup/addressLookup.firestore-webworker';

const lookup = createFirestoreWebWorkerLookup();
const results = await lookup.search('123 Main St');
```

## 🎯 Performance

- **Cold Start**: API fallback (200-500ms) - no delay for users
- **Warm State**: FlexSearch (<1ms) - 200-500x faster than API
- **Index Size**: 8MB compressed, loads in 10-30 seconds background
- **Capacity**: 527,316 address entries with sub-millisecond search

## 🧪 Testing & Validation

**Live Demo:** Open `../flexsearch-complete-test.html` in your browser for:

- Real-time performance comparison vs Vercel Blob
- Complete system validation and diagnostics
- Interactive performance testing with actual data
- Head-to-head speed comparisons

## 🌐 Live Infrastructure

- **Index URL**: `https://firebasestorage.googleapis.com/v0/b/land-estimator-29ee9.firebasestorage.app/o/cdn%2Fflexsearch-index.json.gz?alt=media`
- **CORS**: Configured for browser access from any origin
- **CDN**: Global Firebase Storage distribution
