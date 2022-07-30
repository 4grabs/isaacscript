import {
  ButtonAction,
  InputHook,
  ModCallback,
} from "isaac-typescript-definitions";
import { errorIfFeaturesNotInitialized } from "../featuresInitialized";
import { saveDataManager } from "./saveDataManager/exports";

const FEATURE_NAME = "forgottenSwitch";

const v = {
  run: {
    shouldSwitch: false,
  },
};

export function forgottenSwitchInit(mod: Mod): void {
  saveDataManager(FEATURE_NAME, v);

  mod.AddCallback(
    ModCallback.INPUT_ACTION, // 13
    isActionTriggered,
    InputHook.IS_ACTION_TRIGGERED, // 1
  );
}

// ModCallback.INPUT_ACTION (13)
// InputHook.IS_ACTION_TRIGGERED (1)
function isActionTriggered(
  _entity: Entity | undefined,
  _inputHook: InputHook,
  buttonAction: ButtonAction,
) {
  if (buttonAction === ButtonAction.DROP && v.run.shouldSwitch) {
    v.run.shouldSwitch = false;
    return true;
  }

  return undefined;
}

/**
 * When used on The Forgotten, switches to The Soul. When used on The Soul, switches to The
 * Forgotten. This takes 1 game frame to take effect.
 */
export function forgottenSwitch(): void {
  errorIfFeaturesNotInitialized(FEATURE_NAME);
  v.run.shouldSwitch = true;
}
