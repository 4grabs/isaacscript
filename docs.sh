#!/bin/bash

set -e # Exit on any errors

# Get the directory of this script
# https://stackoverflow.com/questions/59895/getting-the-source-directory-of-a-bash-script-from-within
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

SECONDS=0

DOCS_DIR="$DIR/docs"
rm -rf "$DOCS_DIR"
npx typedoc \
  --out "$DOCS_DIR" \
  --readme "$DIR/website-root.md" \
  --entryPoints "$DIR/src/index.ts" \
  --entryPoints "$DIR/src/cachedClasses.ts" \
  --entryPoints "$DIR/src/challenges.ts" \
  --entryPoints "$DIR/src/constants.ts" \
  --entryPoints "$DIR/src/constantsMax.ts" \
  --entryPoints "$DIR/src/features/debugDisplay.ts" \
  --entryPoints "$DIR/src/features/deployJSONRoom.ts" \
  --entryPoints "$DIR/src/features/direction.ts" \
  --entryPoints "$DIR/src/features/disableInputs.ts" \
  --entryPoints "$DIR/src/features/disableSound.ts" \
  --entryPoints "$DIR/src/features/characterHealthConversion.ts" \
  --entryPoints "$DIR/src/features/characterStats.ts" \
  --entryPoints "$DIR/src/features/fadeInRemover.ts" \
  --entryPoints "$DIR/src/features/fastReset.ts" \
  --entryPoints "$DIR/src/features/extraConsoleCommands/init.ts" \
  --entryPoints "$DIR/src/features/extraConsoleCommands/commands.ts" \
  --entryPoints "$DIR/src/features/forgottenSwitch.ts" \
  --entryPoints "$DIR/src/features/getCollectibleItemPoolType.ts" \
  --entryPoints "$DIR/src/features/isPonyActive.ts" \
  --entryPoints "$DIR/src/features/playerInventory.ts" \
  --entryPoints "$DIR/src/features/preventCollectibleRotate.ts" \
  --entryPoints "$DIR/src/features/runInNFrames.ts" \
  --entryPoints "$DIR/src/features/saveDataManager/exports.ts" \
  --entryPoints "$DIR/src/features/sirenHelpers.ts" \
  --entryPoints "$DIR/src/features/taintedLazarusPlayers.ts" \
  --entryPoints "$DIR/src/functions/array.ts" \
  --entryPoints "$DIR/src/functions/benchmark.ts" \
  --entryPoints "$DIR/src/functions/bitwise.ts" \
  --entryPoints "$DIR/src/functions/boss.ts" \
  --entryPoints "$DIR/src/functions/cacheFlag.ts" \
  --entryPoints "$DIR/src/functions/cards.ts" \
  --entryPoints "$DIR/src/functions/character.ts" \
  --entryPoints "$DIR/src/functions/charge.ts" \
  --entryPoints "$DIR/src/functions/chargeBar.ts" \
  --entryPoints "$DIR/src/functions/collectibles.ts" \
  --entryPoints "$DIR/src/functions/collectibleCacheFlag.ts" \
  --entryPoints "$DIR/src/functions/collectibleSet.ts" \
  --entryPoints "$DIR/src/functions/collectibleTag.ts" \
  --entryPoints "$DIR/src/functions/color.ts" \
  --entryPoints "$DIR/src/functions/debug.ts" \
  --entryPoints "$DIR/src/functions/deepCopy.ts" \
  --entryPoints "$DIR/src/functions/doors.ts" \
  --entryPoints "$DIR/src/functions/easing.ts" \
  --entryPoints "$DIR/src/functions/entity.ts" \
  --entryPoints "$DIR/src/functions/entitySpecific.ts" \
  --entryPoints "$DIR/src/functions/entityTypes.ts" \
  --entryPoints "$DIR/src/functions/enums.ts" \
  --entryPoints "$DIR/src/functions/familiars.ts" \
  --entryPoints "$DIR/src/functions/flag.ts" \
  --entryPoints "$DIR/src/functions/flying.ts" \
  --entryPoints "$DIR/src/functions/globals.ts" \
  --entryPoints "$DIR/src/functions/gridEntity.ts" \
  --entryPoints "$DIR/src/functions/gridEntitySpecific.ts" \
  --entryPoints "$DIR/src/functions/input.ts" \
  --entryPoints "$DIR/src/functions/isaacAPIClass.ts" \
  --entryPoints "$DIR/src/functions/jsonHelpers.ts" \
  --entryPoints "$DIR/src/functions/kColor.ts" \
  --entryPoints "$DIR/src/functions/language.ts" \
  --entryPoints "$DIR/src/functions/level.ts" \
  --entryPoints "$DIR/src/functions/log.ts" \
  --entryPoints "$DIR/src/functions/map.ts" \
  --entryPoints "$DIR/src/functions/math.ts" \
  --entryPoints "$DIR/src/functions/npc.ts" \
  --entryPoints "$DIR/src/functions/pickups.ts" \
  --entryPoints "$DIR/src/functions/pickupVariants.ts" \
  --entryPoints "$DIR/src/functions/player.ts" \
  --entryPoints "$DIR/src/functions/playerIndex.ts" \
  --entryPoints "$DIR/src/functions/playerDataStructures.ts" \
  --entryPoints "$DIR/src/functions/playerHealth.ts" \
  --entryPoints "$DIR/src/functions/pills.ts" \
  --entryPoints "$DIR/src/functions/pocketItems.ts" \
  --entryPoints "$DIR/src/functions/position.ts" \
  --entryPoints "$DIR/src/functions/random.ts" \
  --entryPoints "$DIR/src/functions/revive.ts" \
  --entryPoints "$DIR/src/functions/rng.ts" \
  --entryPoints "$DIR/src/functions/rooms.ts" \
  --entryPoints "$DIR/src/functions/roomData.ts" \
  --entryPoints "$DIR/src/functions/roomGrid.ts" \
  --entryPoints "$DIR/src/functions/roomShape.ts" \
  --entryPoints "$DIR/src/functions/run.ts" \
  --entryPoints "$DIR/src/functions/seeds.ts" \
  --entryPoints "$DIR/src/functions/serialization.ts" \
  --entryPoints "$DIR/src/functions/set.ts" \
  --entryPoints "$DIR/src/functions/sound.ts" \
  --entryPoints "$DIR/src/functions/spawnCollectible.ts" \
  --entryPoints "$DIR/src/functions/sprite.ts" \
  --entryPoints "$DIR/src/functions/stage.ts" \
  --entryPoints "$DIR/src/functions/string.ts" \
  --entryPoints "$DIR/src/functions/table.ts" \
  --entryPoints "$DIR/src/functions/tears.ts" \
  --entryPoints "$DIR/src/functions/transformations.ts" \
  --entryPoints "$DIR/src/functions/trinkets.ts" \
  --entryPoints "$DIR/src/functions/trinketCacheFlag.ts" \
  --entryPoints "$DIR/src/functions/trinketGive.ts" \
  --entryPoints "$DIR/src/functions/tstlClass.ts" \
  --entryPoints "$DIR/src/functions/ui.ts" \
  --entryPoints "$DIR/src/functions/utils.ts" \
  --entryPoints "$DIR/src/functions/vector.ts" \
  --entryPoints "$DIR/src/maps/cardMap.ts" \
  --entryPoints "$DIR/src/maps/characterMap.ts" \
  --entryPoints "$DIR/src/maps/pillEffectMap.ts" \
  --entryPoints "$DIR/src/maps/roomTypeMap.ts" \
  --entryPoints "$DIR/src/types/DefaultMap.ts" \
  --entryPoints "$DIR/src/upgradeMod.ts" \

echo "Successfully created docs in $SECONDS seconds."
