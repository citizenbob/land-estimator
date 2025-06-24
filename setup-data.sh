#!/bin/bash
# setup-data.sh: Clone the land-estimator-data LFS repo and symlink it to src/data

set -e

DATA_REPO_URL="<git@github.com:your-org/land-estimator-data.git>"
DATA_REPO_DIR="../land-estimator-data"
SYMLINK_PATH="src/data"

if [ -d "$SYMLINK_PATH" ] || [ -L "$SYMLINK_PATH" ]; then
  echo "Removing existing $SYMLINK_PATH..."
  rm -rf "$SYMLINK_PATH"
fi

if [ ! -d "$DATA_REPO_DIR" ]; then
  echo "Cloning data repo to $DATA_REPO_DIR..."
  git clone "$DATA_REPO_URL" "$DATA_REPO_DIR"
  cd "$DATA_REPO_DIR"
  git lfs pull
  cd -
else
  echo "Data repo already exists at $DATA_REPO_DIR. Pulling latest..."
  cd "$DATA_REPO_DIR"
  git pull
  git lfs pull
  cd -
fi

echo "Creating symlink: $SYMLINK_PATH -> $DATA_REPO_DIR"
ln -s "$DATA_REPO_DIR" "$SYMLINK_PATH"

echo "Done! src/data is now symlinked to the LFS data repo."
