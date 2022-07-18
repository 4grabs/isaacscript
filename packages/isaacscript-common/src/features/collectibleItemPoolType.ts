// The item pool type of a collectible is not stored on the collectible. Thus, we scan for incoming
// item pool types in the PreGetCollectible callback, and then assume that the next spawned
// collectible has this item pool type.

import {
  ItemPoolType,
  ModCallback,
  PickupVariant,
} from "isaac-typescript-definitions";
import { game } from "../cachedClasses";
import { errorIfFeaturesNotInitialized } from "../featuresInitialized";
import { getEntityID } from "../functions/entities";
import { isCollectible } from "../functions/pickupVariants";
import { getRoomItemPoolType } from "../functions/rooms";
import { saveDataManager } from "./saveDataManager/exports";

const FEATURE_NAME = "collectibleItemPoolType";

const v = {
  run: {
    collectibleItemPoolTypeMap: new Map<PtrHash, ItemPoolType>(),
  },
};

/** @internal */
export function collectibleItemPoolTypeInit(mod: Mod): void {
  saveDataManager(FEATURE_NAME, v);

  mod.AddCallback(
    ModCallback.POST_PICKUP_INIT,
    postPickupInitCollectible,
    PickupVariant.COLLECTIBLE,
  ); // 34
}

// ModCallback.POST_PICKUP_INIT (34)
// PickupVariant.COLLECTIBLE (100)
function postPickupInitCollectible(pickup: EntityPickup) {
  const itemPool = game.GetItemPool();
  const ptrHash = GetPtrHash(pickup);
  const lastItemPoolType = itemPool.GetLastPool();

  v.run.collectibleItemPoolTypeMap.set(ptrHash, lastItemPoolType);
}

/**
 * Helper function to get the item pool type that a given collectible came from. Since there is no
 * native method in the API to get this, we listen in the PreGetCollectible callback for item pool
 * types, and then assume that the next spawned collectible will match.
 */
export function getCollectibleItemPoolType(
  collectible: EntityPickup,
): ItemPoolType {
  errorIfFeaturesNotInitialized(FEATURE_NAME);

  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "getCollectibleItemPoolType" function was given a non-collectible: ${entityID}`,
    );
  }

  const ptrHash = GetPtrHash(collectible);
  const itemPoolType = v.run.collectibleItemPoolTypeMap.get(ptrHash);
  return itemPoolType === undefined ? getRoomItemPoolType() : itemPoolType;
}
