import { DefaultMap } from "../classes/DefaultMap";
import { ModUpgraded } from "../classes/ModUpgraded";
import { HealthType } from "../enums/HealthType";
import { ModCallbackCustom } from "../enums/ModCallbackCustom";
import { saveDataManager } from "../features/saveDataManager/exports";
import { getEnumValues } from "../functions/enums";
import { getPlayerHealthType } from "../functions/playerHealth";
import { getPlayerIndex } from "../functions/playerIndex";
import { PlayerIndex } from "../types/PlayerIndex";
import {
  postPlayerChangeHealthFire,
  postPlayerChangeHealthHasSubscriptions,
} from "./subscriptions/postPlayerChangeHealth";

const v = {
  run: {
    playersHealthMap: new DefaultMap<PlayerIndex, Map<HealthType, int>>(
      () => new Map(),
    ),
  },
};

/** @internal */
export function postPlayerChangeHealthInit(mod: ModUpgraded): void {
  saveDataManager("postPlayerChangeHealth", v, hasSubscriptions);

  mod.AddCallbackCustom(
    ModCallbackCustom.POST_PEFFECT_UPDATE_REORDERED,
    postPEffectUpdateReordered,
  );
}

function hasSubscriptions() {
  return postPlayerChangeHealthHasSubscriptions();
}

// ModCallbackCustom.POST_PEFFECT_UPDATE_REORDERED
function postPEffectUpdateReordered(player: EntityPlayer) {
  if (!hasSubscriptions()) {
    return;
  }

  // We call the "getPlayerIndex" function with the "differentiateForgottenAndSoul" argument. If we
  // don't differentiate between The Forgotten and The Soul, the callback will fire every time the
  // player switches between the two.
  const playerIndex = getPlayerIndex(player, true);
  const playerHealthMap = v.run.playersHealthMap.getAndSetDefault(playerIndex);

  for (const healthType of getEnumValues(HealthType)) {
    const storedHealthValue = playerHealthMap.get(healthType);
    const currentHealthValue = getPlayerHealthType(player, healthType);
    playerHealthMap.set(healthType, currentHealthValue);

    if (
      storedHealthValue !== undefined &&
      storedHealthValue !== currentHealthValue
    ) {
      const difference = currentHealthValue - storedHealthValue;
      postPlayerChangeHealthFire(player, healthType, difference);
    }
  }
}
