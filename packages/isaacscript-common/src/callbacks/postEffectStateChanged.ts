import { ModCallback } from "isaac-typescript-definitions";
import { DefaultMap } from "../classes/DefaultMap";
import { saveDataManager } from "../features/saveDataManager/exports";
import {
  postEffectStateChangedFire,
  postEffectStateChangedHasSubscriptions,
} from "./subscriptions/postEffectStateChanged";

const v = {
  run: {
    stateMap: new DefaultMap<PtrHash, int, [int]>((state) => state),
  },
};

export function postEffectStateChangedInit(mod: Mod): void {
  saveDataManager("postEffectStateChanged", v, hasSubscriptions);

  mod.AddCallback(ModCallback.POST_EFFECT_UPDATE, postEffectUpdate); // 55
}

function hasSubscriptions() {
  return postEffectStateChangedHasSubscriptions();
}

// ModCallback.POST_EFFECT_UPDATE (55)
function postEffectUpdate(effect: EntityEffect) {
  if (!hasSubscriptions()) {
    return;
  }

  const ptrHash = GetPtrHash(effect);
  const previousState = v.run.stateMap.getAndSetDefault(ptrHash, effect.State);
  const currentState = effect.State;
  v.run.stateMap.set(ptrHash, currentState);

  if (previousState !== currentState) {
    postEffectStateChangedFire(effect, previousState, currentState);
  }
}
