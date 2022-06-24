// Keep specific items from being affected by the Glitched Crown, Binge Eater, and the Tainted Isaac
// switching mechanic.

import {
  Card,
  CollectibleType,
  ModCallback,
  PickupVariant,
} from "isaac-typescript-definitions";
import { game } from "../cachedClasses";
import { errorIfFeaturesNotInitialized } from "../featuresInitialized";
import { setCollectibleSubType } from "../functions/collectibles";
import { getEntityID } from "../functions/entity";
import { isCollectible } from "../functions/pickupVariants";
import { saveDataManager } from "./saveDataManager/exports";

const FEATURE_NAME = "prevent collectible rotation";

const v = {
  room: {
    /**
     * Index is a string containing the grid index and the InitSeed of the collectible.
     * (e.g. "12,1123579202")
     *
     * (We cannot simply use the InitSeed of the collectible because Diplopia can cause multiple
     * collectibles in the room to have the same InitSeed. However, no two collectibles should ever
     * be on the same grid index.)
     *
     * (We cannot use PtrHash as an index because that stays the same when the item is rolled.)
     */
    trackedCollectibles: new Map<string, CollectibleType>(),
  },
};

/** @internal */
export function preventCollectibleRotationInit(mod: Mod): void {
  saveDataManager("preventCollectibleRotation", v);

  mod.AddCallback(
    ModCallback.POST_USE_CARD,
    useCardSoulOfIsaac,
    Card.SOUL_ISAAC,
  ); // 5

  mod.AddCallback(
    ModCallback.POST_PICKUP_UPDATE,
    postPickupUpdateCollectible,
    PickupVariant.COLLECTIBLE,
  ); // 35
}

// ModCallback.POST_USE_CARD (5)
// Card.SOUL_ISAAC (81)
function useCardSoulOfIsaac() {
  // Soul of Isaac causes items to flip. Delete all tracked items (assuming that the player
  // deliberately wants to roll a quest item).
  v.room.trackedCollectibles.clear();
}

// ModCallback.POST_PICKUP_UPDATE (35)
// PickupVariant.COLLECTIBLE (100)
function postPickupUpdateCollectible(pickup: EntityPickup) {
  const collectible = pickup as EntityPickupCollectible;

  // Ignore empty pedestals (i.e. items that have already been taken by the player).
  if (collectible.SubType === CollectibleType.NULL) {
    return;
  }

  const index = getMapIndex(collectible);
  const trackedCollectibleType = v.room.trackedCollectibles.get(index);
  if (
    trackedCollectibleType !== undefined &&
    collectible.SubType !== trackedCollectibleType
  ) {
    // This item has switched, so restore it back to the way it was.
    setCollectibleSubType(collectible, trackedCollectibleType);
  }
}

/**
 * Helper function to prevent a collectible from being affected by Tainted Isaac's rotation
 * mechanic. (This mechanic also happens from Glitched Crown and Binge Eater.) This is useful
 * because quest items that are manually spawned by mods will be automatically be affected by this
 * mechanic.
 *
 * It is required to pass the intended collectible type to this function since it is possible for
 * collectibles to rotate on the first frame that they are spawned.
 */
export function preventCollectibleRotation(
  collectible: EntityPickup,
  collectibleType: CollectibleType,
): void {
  errorIfFeaturesNotInitialized(FEATURE_NAME);

  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "preventCollectibleRotate" function was given a non-collectible: ${entityID}`,
    );
  }

  const index = getMapIndex(collectible);
  v.room.trackedCollectibles.set(index, collectibleType);

  // The item might have already shifted on the first frame that it spawns, so change it back if
  // necessary.
  postPickupUpdateCollectible(collectible);
}

function getMapIndex(collectible: EntityPickup) {
  const room = game.GetRoom();
  const gridIndex = room.GetGridIndex(collectible.Position);
  return `${gridIndex},${collectible.InitSeed}`;
}
