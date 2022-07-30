import { SlotVariant } from "isaac-typescript-definitions";

export type PostSlotInitRegisterParameters = [
  callback: (slot: EntitySlot) => void,
  slotVariant?: SlotVariant,
];

const subscriptions: PostSlotInitRegisterParameters[] = [];

export function postSlotInitHasSubscriptions(): boolean {
  return subscriptions.length > 0;
}

export function postSlotInitRegister(
  ...args: PostSlotInitRegisterParameters
): void {
  subscriptions.push(args);
}

export function postSlotInitFire(slot: EntitySlot): void {
  for (const [callback, slotVariant] of subscriptions) {
    // Handle the optional 2nd callback argument.
    if (slotVariant !== undefined && slotVariant !== slot.Variant) {
      continue;
    }

    callback(slot);
  }
}
