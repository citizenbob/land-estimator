# Git Hooks Quick Reference 🚀

## 🏃‍♂️ Quick Start

```bash
# After cloning the repo
npm run hooks:setup
# or
./setup-hooks.sh
```

## 🔨 What Runs When

### Pre-commit (Every commit)

- ⚡ ESLint on changed files
- ⚡ Prettier format check
- ⚡ TypeScript compilation

### Pre-push (Before remote push)

- 🧹 Full linting & formatting
- 🧪 Unit tests
- 🏗️ Production build test
- 🎭 E2E tests
- 📊 Data builds (if shapefiles changed)
- 🔍 File integrity checks

## 🚀 Skip Options

```bash
# Development shortcuts
SKIP_E2E=true git push              # Skip slow E2E tests
SKIP_DATA_BUILD=true git push       # Skip data processing
SKIP_HOOK=true git push             # Skip all pre-push checks
SKIP_COMMIT_HOOK=true git commit    # Skip pre-commit checks

# Emergency override (use sparingly!)
git push --no-verify               # Nuclear option
```

## 🎯 Pro Tips

### Fast Development Workflow

```bash
# Quick iterations
SKIP_E2E=true git push

# When working on styling/docs only
SKIP_HOOK=true git push

# Full validation before PR
git push  # Run all checks
```

### Data Development

```bash
# When adding new shapefiles
git add src/data/new_region/shapefiles/
git commit -m "feat: add new region data"
git push  # Automatically rebuilds data

# Skip data build if you know it's not needed
SKIP_DATA_BUILD=true git push
```

### Troubleshooting

```bash
# Fix linting issues
npm run lint:fix

# Fix formatting
npm run format

# Run tests locally
npm run test:run

# Run full validation manually
npm run test:all
```

## 🏆 Quality Gates

| Check       | Pre-commit | Pre-push | Can Skip |
| ----------- | ---------- | -------- | -------- |
| ESLint      | ✅         | ✅       | ❌       |
| Prettier    | ✅         | ✅       | ❌       |
| TypeScript  | ✅         | ✅       | ❌       |
| Unit Tests  | ❌         | ✅       | ❌       |
| Build Test  | ❌         | ✅       | ❌       |
| E2E Tests   | ❌         | ✅       | ✅       |
| Data Builds | ❌         | ✅       | ✅       |

## 🎨 Customization

Edit `.githooks/pre-push` or `.githooks/pre-commit` to modify behavior.

Remember: Hooks prevent deployment issues and maintain code quality! 🛡️
