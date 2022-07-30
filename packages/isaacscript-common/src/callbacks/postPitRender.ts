import { ModCallback } from "isaac-typescript-definitions";
import { getPits } from "../functions/gridEntitiesSpecific";
import {
  postPitRenderFire,
  postPitRenderHasSubscriptions,
} from "./subscriptions/postPitRender";

export function postPitRenderInit(mod: Mod): void {
  mod.AddCallback(ModCallback.POST_RENDER, postRender); // 2
}

function hasSubscriptions() {
  return postPitRenderHasSubscriptions();
}

// ModCallback.POST_RENDER (2)
function postRender() {
  if (!hasSubscriptions()) {
    return;
  }

  for (const pit of getPits()) {
    postPitRenderFire(pit);
  }
}
