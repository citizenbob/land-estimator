#!/usr/bin/env bash

# Setup script for git hooks
# Run this once after cloning the repository

set -e

echo "🔧 Setting up git hooks..."

# Configure git to use our custom hooks directory
git config core.hooksPath .githooks

# Make hooks executable
chmod +x .githooks/*

echo "✅ Git hooks configured successfully!"
echo ""
echo "Available hooks:"
echo "  - pre-push: Runs linting, tests, and builds before push"
echo ""
echo "You can skip hooks during development with:"
echo "  SKIP_HOOK=true git push          # Skip all checks"
echo "  SKIP_E2E=true git push           # Skip E2E tests only"
echo "  SKIP_DATA_BUILD=true git push    # Skip data builds only"
echo ""
echo "For emergency pushes (use sparingly):"
echo "  git push --no-verify             # Skip hooks entirely"
