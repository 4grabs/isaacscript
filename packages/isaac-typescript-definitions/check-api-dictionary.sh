#!/bin/bash

set -euo pipefail # Exit on errors and undefined variables.

# Get the directory of this script:
# https://stackoverflow.com/questions/59895/getting-the-source-directory-of-a-bash-script-from-within
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

REPO_ROOT="$DIR/../.."

CSPELL_CONFIG_PATH="$REPO_ROOT/cspell.json"
if ! test -f "$CSPELL_CONFIG_PATH"; then
  echo "CSpell configuration file not found: $CSPELL_CONFIG_PATH"
  exit 1
fi

# Make a list of every misspelled word without any custom dictionaries.
# We need to move the configuration path temporarily or else the cspell command won't work properly.
CSPELL_CONFIG_WITHOUT_IMPORT=$(python -c "import json; from pathlib import Path; config_text = Path('../../cspell.json').read_text(); config = json.loads(config_text); del config['import']; new_config = json.dumps(config); print(new_config); ")
CSPELL_CONFIG_PATH_TEMP="$REPO_ROOT/cspell-temp.json"
mv "$CSPELL_CONFIG_PATH" "$CSPELL_CONFIG_PATH_TEMP"
echo "$CSPELL_CONFIG_WITHOUT_IMPORT" > "$CSPELL_CONFIG_PATH"
MISSPELLED_WORDS_PATH="/tmp/misspelled-words.txt"
npx cspell --no-progress --no-summary --unique --words-only . | sort --ignore-case --unique > "$MISSPELLED_WORDS_PATH"
mv "$CSPELL_CONFIG_PATH_TEMP" "$CSPELL_CONFIG_PATH"

DICTIONARY_NAME="api.txt"
TXT_PATH="$DIR/../isaacscript-spell/dictionaries/isaac/$DICTIONARY_NAME"
DICTIONARY_WORDS=$(cat "$TXT_PATH" | grep . | grep -v "^#")
echo "Checking for every word in: $TXT_PATH"

ONE_OR_MORE_FAILURES=0
for LINE in $DICTIONARY_WORDS; do
  LINE_TRIMMED=$(echo "$LINE" | xargs)

  if ! grep "$LINE_TRIMMED" "$MISSPELLED_WORDS_PATH" --ignore-case --quiet; then
    echo "The following word in \"$DICTIONARY_NAME\" is not being used: $LINE_TRIMMED"
    ONE_OR_MORE_FAILURES=1
  fi
done

rm -f "$MISSPELLED_WORDS_PATH"

if [ $ONE_OR_MORE_FAILURES -ne "0" ]; then
  echo "Dictionary check failed."
  exit 1
fi

echo "Dictionary is valid."
