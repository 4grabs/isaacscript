import { MatchingCallbackCustom } from "../../../types/private/MatchingCallbackCustom";
import {
  CustomCallback,
  FireArgs,
  OptionalArgs,
} from "../../private/CustomCallback";

type CallbackSignatureRevive = (player: EntityPlayer, revivalType: int) => void;
type ModCallbackCustomRevive = MatchingCallbackCustom<CallbackSignatureRevive>;

export class CustomCallbackRevive<
  T extends ModCallbackCustomRevive,
> extends CustomCallback<T> {
  // eslint-disable-next-line class-methods-use-this
  protected override shouldFire(
    fireArgs: FireArgs<T>,
    optionalArgs: OptionalArgs<T>,
  ): boolean {
    const [callbackRevivalType] = optionalArgs;
    if (callbackRevivalType === undefined) {
      return true;
    }

    const [_player, revivalType] = fireArgs;
    return revivalType === callbackRevivalType;
  }
}