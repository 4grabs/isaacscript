#!/bin/bash

set -e # Exit on any errors

# Get the directory of this script:
# https://stackoverflow.com/questions/59895/getting-the-source-directory-of-a-bash-script-from-within
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Get the name of the repository:
# https://stackoverflow.com/questions/23162299/how-to-get-the-last-part-of-dirname-in-bash/23162553
REPO_NAME="$(basename "$DIR")"

SECONDS=0

cd "$DIR"

REPO_ROOT="$DIR/../.."
OUT_DIR="$REPO_ROOT/dist/packages/$REPO_NAME"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp $DIR/*.md "$OUT_DIR/" # Globs don't work in quotes
cp "$DIR/LICENSE" "$OUT_DIR/"
cp "$DIR/package.json" "$OUT_DIR/"

echo "Successfully built in $SECONDS seconds."
