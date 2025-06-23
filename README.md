# Landscape Estimator 🌍🤖

**AI-powered land area estimates.**

## 🚀 What is this?

Landscape Estimator is a tool that uses **AI, GIS data, and aerial imagery** to estimate land areas for landscaping and property management. It combines:  
✅ **Public GIS data** for property sizes  
✅ **Aerial analysis** for estimating lawn areas  
✅ **User-assisted polygon tracing** for corrections  
✅ **Next.js + TypeScript** for modern web performance

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

## 📦 Large Files & Git LFS

This project uses **Git LFS (Large File Storage)** to handle essential compressed data files required for the application to function. The application only uses optimized `.gz` files - no raw data fallbacks.

### What's stored in LFS:

- `public/address-index.json.gz` (6MB) - Optimized address search index
- `public/parcel-metadata.json.gz` (36MB) - Optimized parcel lookup data

### What's excluded (too large, not essential):

- Raw GIS shapefiles (`.shp`, `.dbf` files)
- Raw JSON source data files (`parcel_metadata.json`, etc.)
- Processed intermediate data files
- Geometry indices and other derived data
- These files are generated locally during development but not committed

### Setting up Git LFS:

1. **Install Git LFS** (if not already installed):

```sh
# macOS
brew install git-lfs

# Ubuntu/Debian
sudo apt install git-lfs

# Windows
# Download from https://git-lfs.github.io/
```

2. **Initialize LFS in your clone**:

```sh
git lfs install
git lfs pull
```

3. **Build missing data files** (if needed):

```sh
yarn build:address-index
yarn build:parcel-index
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
