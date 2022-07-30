import { ModCallback } from "isaac-typescript-definitions";
import { DefaultMap } from "../classes/DefaultMap";
import { saveDataManager } from "../features/saveDataManager/exports";
import {
  postPickupStateChangedFire,
  postPickupStateChangedHasSubscriptions,
} from "./subscriptions/postPickupStateChanged";

const v = {
  run: {
    pickupStateMap: new DefaultMap<PtrHash, int, [int]>((state) => state),
  },
};

export function postPickupStateChangedInit(mod: Mod): void {
  saveDataManager("postPickupStateChanged", v, hasSubscriptions);

  mod.AddCallback(ModCallback.POST_PICKUP_UPDATE, postPickupUpdate); // 35
}

function hasSubscriptions() {
  return postPickupStateChangedHasSubscriptions();
}

// ModCallback.POST_PICKUP_UPDATE (35)
function postPickupUpdate(pickup: EntityPickup) {
  if (!hasSubscriptions()) {
    return;
  }

  const ptrHash = GetPtrHash(pickup);
  const previousState = v.run.pickupStateMap.getAndSetDefault(
    ptrHash,
    pickup.State,
  );
  const currentState = pickup.State;
  v.run.pickupStateMap.set(ptrHash, currentState);

  if (previousState !== currentState) {
    postPickupStateChangedFire(pickup, previousState, currentState);
  }
}
