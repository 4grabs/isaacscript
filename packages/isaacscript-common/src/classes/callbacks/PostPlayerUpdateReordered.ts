import { ISCFeature } from "../../enums/ISCFeature";
import { ModCallbackCustom } from "../../enums/ModCallbackCustom";
import { shouldFirePlayer } from "../../shouldFire";
import { CustomCallback } from "../private/CustomCallback";

export class PostPlayerUpdateReordered extends CustomCallback<ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED> {
  constructor() {
    super();

    this.featuresUsed = [ISCFeature.PLAYER_REORDERED_CALLBACKS];
  }

  protected override shouldFire = shouldFirePlayer;
}
