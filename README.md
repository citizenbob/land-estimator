# Landscape Estimator 🌍🤖

**AI-powered land area estimates.**

## 🚀 What is this?

Landscape Estimator is an AI-powered tool for generating accurate land area estimates.

## 📦 Data Architecture & Build Process

This project uses a cloud-native data architecture with Firebase Storage for optimal performance and deployment reliability.

### How Data Flows:

1. **Raw GIS Data Ingestion**: Python scripts process shapefiles and upload processed data to Firebase Storage
2. **Build-Time Index Generation**: During deployment, build scripts fetch processed data from Firebase Storage and generate optimized index files
3. **Static Asset Serving**: Generated index files are placed in `public/` for fast static serving

This project uses a **cloud-native data architecture** with Firebase Storage to handle large GIS datasets efficiently.

### How It Works:

1. **Data Ingestion:** Python scripts process raw GIS shapefiles and upload to Firebase Storage
2. **Build-Time Generation:** TypeScript build scripts fetch processed data and generate optimized index files
3. **Production Deployment:** Vercel runs the build sequence, creating compressed `.gz` files in the `public/` directory
4. **Ultra-Compression:** Dual-output system generates both regular and ultra-compressed files (73.7% compression ratio)

### Build Process:

```bash
# What happens during deployment:
yarn build:address-index    # Fetches data from Firebase, generates 6MB address index
yarn build:parcel-index     # Fetches data from Firebase, generates 32MB + 22MB ultra files
next build                  # Includes all generated files in static build
```

### For Development:

- **No large files in Git:** Repository stays lean and fast
- **Fresh data:** Build scripts always fetch latest processed data from Firebase Storage
- **Environment variables:** Add Firebase credentials to `.env.local` for local development
- **Fallback mechanism:** Build scripts gracefully fall back to local files if Firebase is unavailable

### Firebase Storage Structure:

```
firebase-storage-bucket/
├── integration/
│   ├── address_index.json      # Processed address data
│   └── parcel_metadata.json    # Processed parcel data
└── parcel-source/
    └── *.geojson              # Raw GIS data files
```

## 🔧 How It Works

1. **Enter an Address** → We pull public land area data.
2. **AI Analyzes Aerial Data** → If data is missing, we estimate from images.
3. **User Refines the Estimate** → Adjust land area with a simple UI.

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript
- **Backend:** GIS APIs, AI/ML models (TBD)
- **Mapping:** Google Maps API / Leaflet.js

## 🔽 Installation

```sh
git clone https://github.com/citizenbob/land-estimator.git
cd landscape-estimator
yarn install

# Set up git hooks (recommended)
./setup-hooks.sh

yarn dev
```

## 🔒 Git Hooks & Quality Control

This project includes comprehensive git hooks to ensure code quality and prevent deployment issues:

### Pre-commit Hook (Fast feedback)

Runs on every commit:

- ✅ ESLint on staged files
- ✅ Prettier formatting check
- ✅ TypeScript compilation check

### Pre-push Hook (Comprehensive validation)

Runs before pushing to remote:

- ✅ Full linting and formatting
- ✅ TypeScript compilation
- ✅ Unit tests
- ✅ Production build test
- ✅ E2E tests (if dev server available)
- ✅ Data builds (if shapefiles changed)
- ✅ File integrity checks

### Hook Management

```sh
# Initial setup (run once after cloning)
./setup-hooks.sh

# Skip hooks during development
SKIP_E2E=true git push              # Skip E2E tests only
SKIP_DATA_BUILD=true git push       # Skip data builds only
SKIP_HOOK=true git push             # Skip all pre-push checks

# Skip pre-commit checks
SKIP_COMMIT_HOOK=true git commit -m "message"

# Emergency override (use sparingly)
git push --no-verify               # Skip all hooks
```

**Why use hooks?**

- 🚫 Prevents broken deployments
- 🧹 Maintains consistent code quality
- 🔍 Catches issues early in development
- 📊 Ensures data files are properly built
- 🎯 Reduces CI/CD failures

## 🐙 Git Hooks Quick Reference

```bash
# one-time setup
npm run hooks:setup
# or
./setup-hooks.sh
```

**What Runs**

- **Pre-commit** (every git commit):
  - ESLint on staged files
  - Prettier format check
  - TypeScript compilation
- **Pre-push** (every git push):
  - Full lint + format
  - Unit tests
  - Production build test
  - E2E tests
  - Data builds (if shapefiles changed)
  - File integrity checks

**Skip Options**

````bash
# Dev shortcuts
SKIP_E2E=true git push           # skip slow E2E
SKIP_DATA_BUILD=true git push    # skip data builds
SKIP_HOOK=true git push          # skip all checks
SKIP_COMMIT_HOOK=true git commit # skip pre-commit only

# Emergency override (use sparingly!)
git push --no-verify

## 📦 Large Files & Git LFS

To keep the main repo lean, all raw GIS/shapefile data lives in a separate Git LFS–backed repo, which you symlink into `src/data`. The main repo’s `.gitignore` excludes `src/data`, so you never accidentally commit huge raw files.

### Local Development Setup:

The build process will automatically generate the required data files when you run:

```bash
# Generates all required index files from Firebase Storage
yarn build:address-index
yarn build:parcel-index

# Or run the full build process
yarn build
````

### Accessing Parcel Source Data:

1. **Clone the Data Repo**

````bash
# alongside your main repo
git clone git@github.com:<your-org>/land-estimator-data.git ../land-estimator-data
cd ../land-estimator-data
```
git lfs pull
````

2. **Symlink into the Main Project**

```bash
cd path/to/land-estimator
ln -s ../land-estimator-data src/data
```

3. **Initialize LFS in your clone**:

```sh
git lfs install
git lfs pull
```

### For contributors:

- LFS files are automatically handled when you clone/pull
- When you push changes to LFS-tracked files, they'll be uploaded to LFS storage
- The build process will regenerate these files during deployment

## 🤝 Contributing

We’re building this **in public**—contributions, feedback, and issues are welcome!  
1️⃣ [Contributor's Guide](./CONTRIBUTING.md)  
2️⃣ [Open an Issue](https://github.com/citizenbob/land-estimator/issues/new)
3️⃣ [Submit a PR](https://github.com/citizenbob/land-estimator/pulls)
4️⃣ [Join discussions](https://github.com/citizenbob/land-estimator/discussions)

## 📜 License & Contributions

This project is publicly viewable for transparency and discussion but is **not open-source**.

- **You MAY:** View the code, provide feedback, and contribute ideas.
- **You MAY NOT:** Copy, modify, or redistribute this code without explicit permission.
- **All contributions are owned by Good Citizens Corporation.**

This project is licensed under the **Business Source License 1.1 (BUSL-1.1)**.

For details, see the [LICENSE](./LICENSE) file.
