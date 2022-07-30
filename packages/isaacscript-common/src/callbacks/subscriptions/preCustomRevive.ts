import { PlayerType, PlayerVariant } from "isaac-typescript-definitions";

export type PreCustomReviveRegisterParameters = [
  callback: (player: EntityPlayer) => int | undefined,
  playerVariant?: PlayerVariant,
  character?: PlayerType,
];

const subscriptions: PreCustomReviveRegisterParameters[] = [];

export function preCustomReviveHasSubscriptions(): boolean {
  return subscriptions.length > 0;
}

export function preCustomReviveRegister(
  ...args: PreCustomReviveRegisterParameters
): void {
  subscriptions.push(args);
}

export function preCustomReviveFire(player: EntityPlayer): int | undefined {
  const character = player.GetPlayerType();

  for (const [callback, playerVariant, callbackCharacter] of subscriptions) {
    // Handle the optional 2nd callback argument.
    if (playerVariant !== undefined && playerVariant !== player.Variant) {
      continue;
    }

    // Handle the optional 3rd callback argument.
    if (callbackCharacter !== undefined && callbackCharacter !== character) {
      continue;
    }

    const revivalType = callback(player);

    if (revivalType !== undefined) {
      return revivalType;
    }
  }

  return undefined;
}
