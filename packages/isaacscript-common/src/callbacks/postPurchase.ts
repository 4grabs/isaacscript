import { DefaultMap } from "../classes/DefaultMap";
import { ModUpgraded } from "../classes/ModUpgraded";
import { ModCallbackCustom } from "../enums/ModCallbackCustom";
import { saveDataManager } from "../features/saveDataManager/exports";
import { getPickups } from "../functions/entitiesSpecific";
import {
  defaultMapGetPlayer,
  mapSetPlayer,
} from "../functions/playerDataStructures";
import { PlayerIndex } from "../types/PlayerIndex";
import {
  postPurchaseFire,
  postPurchaseHasSubscriptions,
} from "./subscriptions/postPurchase";

const v = {
  room: {
    playersHoldingItemOnLastFrameMap: new DefaultMap<PlayerIndex, boolean>(
      false,
    ),
  },
};

export function postPurchaseInit(mod: ModUpgraded): void {
  saveDataManager("postPurchase", v, hasSubscriptions);

  mod.AddCallbackCustom(
    ModCallbackCustom.POST_PEFFECT_UPDATE_REORDERED,
    postPEffectUpdateReordered,
  );
}

function hasSubscriptions() {
  return postPurchaseHasSubscriptions();
}

// ModCallbackCustom.POST_PEFFECT_UPDATE_REORDERED
function postPEffectUpdateReordered(player: EntityPlayer) {
  if (!hasSubscriptions()) {
    return;
  }

  const isHoldingItem = player.IsHoldingItem();
  const wasHoldingItemOnLastFrame = defaultMapGetPlayer(
    v.room.playersHoldingItemOnLastFrameMap,
    player,
  );
  mapSetPlayer(v.room.playersHoldingItemOnLastFrameMap, player, isHoldingItem);

  if (!wasHoldingItemOnLastFrame && isHoldingItem) {
    playerPickedUpNewItem(player);
  }
}

function playerPickedUpNewItem(player: EntityPlayer) {
  const pickups = getPickups();
  const disappearingPickup = pickups.find(
    (pickup) => !pickup.Exists() && pickup.Price !== 0,
  );
  if (disappearingPickup !== undefined) {
    postPurchaseFire(player, disappearingPickup);
  }
}
