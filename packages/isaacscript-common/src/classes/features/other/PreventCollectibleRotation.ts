import {
  CardType,
  CollectibleType,
  DiceFloorSubType,
  ModCallback,
  PickupVariant,
} from "isaac-typescript-definitions";
import { game } from "../../../core/cachedClasses";
import { Exported } from "../../../decorators";
import { ISCFeature } from "../../../enums/ISCFeature";
import { ModCallbackCustom } from "../../../enums/ModCallbackCustom";
import { setCollectibleSubType } from "../../../functions/collectibles";
import { getEntityID } from "../../../functions/entities";
import { getCollectibles } from "../../../functions/pickupsSpecific";
import { isCollectible } from "../../../functions/pickupVariants";
import { asCollectibleType } from "../../../functions/types";
import { PickupIndex } from "../../../types/PickupIndex";
import { ReadonlySet } from "../../../types/ReadonlySet";
import { Feature } from "../../private/Feature";
import { PickupIndexCreation } from "./PickupIndexCreation";

const ROLL_COLLECTIBLE_TYPES = new ReadonlySet([
  // The `PRE_USE_ITEM` D6 callback is fired for D6, D100, Dice Shard, 4-pip Dice Room, and 6-pip
  // Dice Room.
  CollectibleType.D6, // 105
  CollectibleType.ETERNAL_D6, // 609
  CollectibleType.SPINDOWN_DICE, // 723
]);

const ROLL_FLOOR_DICE_FLOOR_SUB_TYPES = new ReadonlySet([
  DiceFloorSubType.FOUR_PIP,
  DiceFloorSubType.SIX_PIP,
]);

const v = {
  run: {
    trackedCollectibles: new Map<PickupIndex, CollectibleType>(),
    rollGameFrame: null as int | null,
  },
};

export class PreventCollectibleRotation extends Feature {
  /** @internal */
  public override v = v;

  private pickupIndexCreation: PickupIndexCreation;

  /** @internal */
  constructor(pickupIndexCreation: PickupIndexCreation) {
    super();

    this.featuresUsed = [ISCFeature.PICKUP_INDEX_CREATION];

    this.callbacksUsed = [
      // 5
      [
        ModCallback.POST_USE_CARD,
        this.postUseCardSoulOfIsaac,
        [CardType.SOUL_ISAAC],
      ],

      // 23, 105
      [ModCallback.PRE_USE_ITEM, this.preUseItem],
    ];

    this.customCallbacksUsed = [
      [ModCallbackCustom.POST_DICE_ROOM_ACTIVATED, this.postDiceRoomActivated],
      [ModCallbackCustom.POST_PICKUP_CHANGED, this.postPickupChanged],
    ];

    this.pickupIndexCreation = pickupIndexCreation;
  }

  private preUseItem = (
    collectibleType: CollectibleType,
  ): boolean | undefined => {
    if (ROLL_COLLECTIBLE_TYPES.has(collectibleType)) {
      v.run.rollGameFrame = game.GetFrameCount();
    }

    return undefined;
  };

  /**
   * Soul of Isaac causes items to flip. We assume that the player deliberately wants to roll a
   * quest item, so we delete all tracked items in the current room.
   */
  // ModCallback.POST_USE_CARD (5)
  // Card.SOUL_ISAAC (81)
  private postUseCardSoulOfIsaac = () => {
    const collectibles = getCollectibles();
    for (const collectible of collectibles) {
      const pickupIndex = this.pickupIndexCreation.getPickupIndex(collectible);
      v.run.trackedCollectibles.delete(pickupIndex);
    }
  };

  // ModCallbackCustom.POST_DICE_ROOM_ACTIVATED
  private postDiceRoomActivated = (
    _player: EntityPlayer,
    diceFloorSubType: DiceFloorSubType,
  ) => {
    if (ROLL_FLOOR_DICE_FLOOR_SUB_TYPES.has(diceFloorSubType)) {
      v.run.trackedCollectibles.clear();
    }
  };

  // ModCallbackCustom.POST_PICKUP_CHANGED
  private postPickupChanged = (
    pickup: EntityPickup,
    oldVariant: PickupVariant,
    _oldSubType: int,
    newVariant: PickupVariant,
    newSubType: int,
  ) => {
    // We only care about collectibles rotating.
    if (
      oldVariant !== PickupVariant.COLLECTIBLE ||
      newVariant !== PickupVariant.COLLECTIBLE
    ) {
      return;
    }

    // Ignore empty pedestals (i.e. collectibles that have already been taken by the player).
    if (asCollectibleType(newSubType) === CollectibleType.NULL) {
      return;
    }

    const pickupIndex = this.pickupIndexCreation.getPickupIndex(pickup);
    const trackedCollectibleType = v.run.trackedCollectibles.get(pickupIndex);
    if (trackedCollectibleType === undefined) {
      return;
    }

    // It can take a frame after the activation of the D6 for the sub-type to change.
    const gameFrameCount = game.GetFrameCount();
    if (
      v.run.rollGameFrame !== null &&
      (gameFrameCount === v.run.rollGameFrame ||
        gameFrameCount === v.run.rollGameFrame + 1)
    ) {
      v.run.trackedCollectibles.delete(pickupIndex);
      return;
    }

    if (trackedCollectibleType !== asCollectibleType(newSubType)) {
      // This collectible has rotated, so restore it back to the way it was.
      setCollectibleSubType(pickup, trackedCollectibleType);
    }
  };

  /**
   * Helper function to prevent a collectible from being affected by Tainted Isaac's rotation
   * mechanic. (This mechanic also happens from Glitched Crown and Binge Eater.) This is useful
   * because quest items that are manually spawned by mods will be automatically be affected by this
   * mechanic.
   *
   * It is required to pass the intended collectible type to this function since it is possible for
   * collectibles to rotate on the first frame that they are spawned.
   *
   * In order to use this function, you must upgrade your mod with
   * `ISCFeature.PREVENT_COLLECTIBLE_ROTATION`.
   */
  @Exported
  public preventCollectibleRotation(
    collectible: EntityPickup,
    collectibleType: CollectibleType,
  ): void {
    if (!isCollectible(collectible)) {
      const entityID = getEntityID(collectible);
      error(
        `The "preventCollectibleRotate" function was given a non-collectible: ${entityID}`,
      );
    }

    const pickupIndex = this.pickupIndexCreation.getPickupIndex(collectible);
    v.run.trackedCollectibles.set(pickupIndex, collectibleType);

    // The item might have already shifted on the first frame that it spawns, so change it back if
    // necessary.
    if (collectible.SubType !== collectibleType) {
      setCollectibleSubType(collectible, collectibleType);
    }
  }
}
