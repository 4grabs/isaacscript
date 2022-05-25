import {
  CollectiblePedestalType,
  CollectibleType,
  EntityType,
  ItemConfigTag,
  ItemConfigTagZero,
  ItemType,
  PickupPrice,
  PickupVariant,
  RoomType,
} from "isaac-typescript-definitions";
import { game, itemConfig } from "../cachedClasses";
import { BLIND_ITEM_PNG_PATH } from "../constants";
import {
  FIRST_COLLECTIBLE_TYPE,
  FIRST_MODDED_COLLECTIBLE_TYPE,
  LAST_COLLECTIBLE_TYPE,
  LAST_VANILLA_COLLECTIBLE_TYPE,
} from "../constantsMax";
import {
  COLLECTIBLE_DESCRIPTION_MAP,
  DEFAULT_COLLECTIBLE_DESCRIPTION,
} from "../maps/collectibleDescriptionMap";
import {
  COLLECTIBLE_NAME_MAP,
  DEFAULT_COLLECTIBLE_NAME,
} from "../maps/collectibleNameMap";
import { SINGLE_USE_ACTIVE_COLLECTIBLE_TYPES_SET } from "../sets/singleUseActiveCollectibleTypesSet";
import { CollectibleIndex } from "../types/CollectibleIndex";
import { getEntityID } from "./entity";
import { isCollectible } from "./pickupVariants";
import { getRoomListIndex } from "./roomData";
import { clearSprite, spriteEquals } from "./sprite";
import { irange } from "./utils";

const COLLECTIBLE_SPRITE_LAYER = 1;
const COLLECTIBLE_SHADOW_LAYER = 4;

// Glitched items start at id 4294967295 (the final 32-bit integer) and increment backwards.
const GLITCHED_ITEM_THRESHOLD = 4000000000;

// The `isBlindCollectible` function needs a reference sprite to work properly.
const questionMarkSprite = initQuestionMarkSprite();

function initQuestionMarkSprite() {
  const sprite = Sprite();
  sprite.Load("gfx/005.100_collectible.anm2", false);
  sprite.ReplaceSpritesheet(1, "gfx/items/collectibles/questionmark.png");
  sprite.LoadGraphics();

  return sprite;
}

export function clearCollectibleSprite(collectible: EntityPickup): void {
  setCollectibleSprite(collectible, undefined);
}

/** Helper function to check if two collectible sprites have the same sprite sheet loaded. */
export function collectibleSpriteEquals(
  sprite1: Sprite,
  sprite2: Sprite,
): boolean {
  // We start at negative 40 texels upwards, as by default we assume a collectible that is sitting
  // on a pedestal. We finish at positive 10 texels downwards, in order to make comparing shop items
  // more accurate.
  const xStart = -1;
  const xFinish = 1;
  const xIncrement = 1;
  const yStart = -40;
  const yFinish = 10;
  const yIncrement = 3;

  return spriteEquals(
    sprite1,
    sprite2,
    COLLECTIBLE_SPRITE_LAYER,
    xStart,
    xFinish,
    xIncrement,
    yStart,
    yFinish,
    yIncrement,
  );
}

/**
 * Helper function to get the in-game description for a collectible. Returns "Unknown" if the
 * provided collectible type was not valid.
 */
export function getCollectibleDescription(
  collectibleType: CollectibleType,
): string {
  // "ItemConfigItem.Description" is bugged with vanilla items on patch v1.7.6, so we use a
  // hard-coded map as a workaround.
  const collectibleDescription =
    COLLECTIBLE_DESCRIPTION_MAP.get(collectibleType);
  if (collectibleDescription !== undefined) {
    return collectibleDescription;
  }

  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  if (itemConfigItem !== undefined) {
    return itemConfigItem.Description;
  }

  return DEFAULT_COLLECTIBLE_DESCRIPTION;
}

/**
 * Helper function to get the heart cost that a collectible item would be if it were being offered
 * in a Devil Room deal. Returns 0 if passed CollectibleType.NULL.
 */
export function getCollectibleDevilHeartPrice(
  collectibleType: CollectibleType,
  player: EntityPlayer,
): PickupPrice {
  const maxHearts = player.GetMaxHearts();

  if (collectibleType === CollectibleType.NULL) {
    return 0;
  }

  if (maxHearts === 0) {
    return PickupPrice.THREE_SOUL_HEARTS;
  }

  const defaultPickupPrice = PickupPrice.ONE_HEART;
  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  if (itemConfigItem === undefined) {
    return defaultPickupPrice;
  }

  const twoHeartPrice =
    maxHearts === 2
      ? PickupPrice.ONE_HEART_AND_TWO_SOUL_HEARTS
      : PickupPrice.TWO_HEARTS;

  return itemConfigItem.DevilPrice === 2
    ? twoHeartPrice
    : PickupPrice.ONE_HEART;
}

/**
 * Helper function to get the path to a collectible's sprite. Returns the path to the question mark
 * sprite (i.e. from Curse of the Blind) if the provided collectible type was not valid.
 */
export function getCollectibleGfxFilename(
  collectibleType: CollectibleType,
): string {
  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  if (itemConfigItem === undefined) {
    return BLIND_ITEM_PNG_PATH;
  }

  return itemConfigItem.GfxFileName;
}

/**
 * Mods often have to track variables relating to a collectible. Finding an index for these kinds of
 * data structures is difficult, since collectibles are respawned every time a player re-enters a
 * room, so the `PtrHash` will change. Instead, we use a 4-tuple of the room list index, the grid
 * index of the collectible in the room, the collectible's SubType, and the collectible's InitSeed.
 *
 * Collectibles that are shifted by Tainted Isaac's mechanic will have unique collectible indexes
 * because the SubType is different. (The collectible entities share the same InitSeed.)
 *
 * Collectibles that are rolled (with e.g. a D6) will have unique collectible indexes because the
 * SubType and InitSeed are different. If you want to track collectibles independently of any
 * rerolls, then you can use the `PtrHash` as an index instead. (The `PtrHash` will not persist
 * between rooms, however.)
 *
 * Note that:
 * - The grid index is a necessary part of the collectible index because Diplopia and Crooked Penny
 *   can cause two or more collectibles with the same SubType and InitSeed to exist in the same
 *   room.
 * - This index will fail in the case where the player uses Diplopia or a successful Crooked Penny
 *   seven or more times in the same room, since that will cause two or more collectibles with the
 *   same grid index, SubType, and InitSeed to exist.
 * - The SubType is a necessary part of the collectible index because Tainted Isaac will
 *   continuously cause collectibles to morph into new sub-types with the same InitSeed.
 * - Using a collectible's position as part of the index is problematic, since players can push a
 *   pedestal. (Even using the grid index does not solve this problem, since it is possible in
 *   certain cases for collectibles to be spawned at a position that is not aligned with the grid,
 *   and the pedestal pushed to an adjacent tile, but this case should be extremely rare.)
 * - Mega Chests spawn two collectibles on the exact same position. However, both of them will have
 *   different InitSeeds, so this is not a problem for this indexing scheme.
 * - The indexing scheme used is different for collectibles that are inside of a Treasure Room, in
 *   order to handle the case of the player seeing the same collectible again in a post-Ascent
 *   Treasure Room. A 5-tuple of stage, stage type, grid index, SubType, and InitSeed is used in
 *   this case. (Using the room list index or the room grid index is not suitable for this purpose,
 *   since both of these values can change in the post-Ascent Treasure Room.) Even though there can
 *   be two Treasure Rooms on an XL floor, both Treasure Rooms should not have collectibles with the
 *   same grid index, Subtype, and InitSeed.
 */
export function getCollectibleIndex(
  collectible: EntityPickup,
): CollectibleIndex {
  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "getCollectibleIndex" function was given a non-collectible: ${entityID}`,
    );
  }

  const level = game.GetLevel();
  const stage = level.GetStage();
  const stageType = level.GetStageType();
  const room = game.GetRoom();
  const roomType = room.GetType();
  const gridIndex = room.GetGridIndex(collectible.Position);
  const roomListIndex = getRoomListIndex();

  // Handle the special case of being in a Treasure Room.
  if (roomType === RoomType.TREASURE) {
    return `${stage},${stageType},${gridIndex},${collectible.SubType},${collectible.InitSeed}` as CollectibleIndex;
  }

  return `${roomListIndex},${gridIndex},${collectible.SubType},${collectible.InitSeed}` as CollectibleIndex;
}

/**
 * Helper function to get the initial amount of charges that a collectible has. Returns 0 if the
 * provided collectible type was not valid.
 */
export function getCollectibleInitCharge(
  collectibleType: CollectibleType,
): int {
  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  if (itemConfigItem === undefined) {
    return 0;
  }

  return itemConfigItem.InitCharge;
}

/**
 * Helper function to get the `ItemType` of a collectible. Returns `ItemType.ITEM_NULL` if the
 * provided collectible type was not valid.
 */
export function getCollectibleItemType(
  collectibleType: CollectibleType,
): ItemType {
  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  if (itemConfigItem === undefined) {
    return ItemType.NULL;
  }

  return itemConfigItem.Type;
}

/**
 * Helper function to get the maximum amount of charges that a collectible has. Returns 0 if the
 * provided collectible type was not valid.
 */
export function getCollectibleMaxCharges(
  collectibleType: CollectibleType,
): int {
  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  if (itemConfigItem === undefined) {
    return 0;
  }

  return itemConfigItem.MaxCharges;
}

/**
 * Helper function to get the name of a collectible. Returns "Unknown" if the provided collectible
 * type is not valid.
 *
 * For example:
 *
 * ```ts
 * const collectibleType = CollectibleType.SAD_ONION;
 * const collectibleName = getCollectibleName(collectibleType); // collectibleName is "Sad Onion"
 * ```
 */
export function getCollectibleName(collectibleType: CollectibleType): string {
  // "ItemConfigItem.Name" is bugged with vanilla items on patch v1.7.6, so we use a hard-coded map
  // as a workaround.
  const collectibleName = COLLECTIBLE_NAME_MAP.get(collectibleType);
  if (collectibleName !== undefined) {
    return collectibleName;
  }

  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  if (itemConfigItem !== undefined) {
    return itemConfigItem.Name;
  }

  return DEFAULT_COLLECTIBLE_NAME;
}

export function getCollectiblePedestalType(
  collectible: EntityPickup,
): CollectiblePedestalType {
  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "getCollectiblePedestalType" function was given a non-collectible: ${entityID}`,
    );
  }

  const sprite = collectible.GetSprite();
  return sprite.GetOverlayFrame();
}

/**
 * Helper function to get the path to a collectible's quality. Returns 0 if the provided collectible
 * type was not valid.
 */
export function getCollectibleQuality(collectibleType: CollectibleType): int {
  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  if (itemConfigItem === undefined) {
    return 0;
  }

  return itemConfigItem.Quality;
}

/**
 * Helper function to get the tags of a collectible (which is the composition of zero or more
 * `ItemConfigTag`). Returns 0 if the provided collectible type is not valid.
 *
 * For example:
 *
 * ```ts
 * const collectibleType = CollectibleType.SAD_ONION;
 * const itemConfigTags = getCollectibleTags(collectibleType); // itemConfigTags is "18350080"
 * ```
 */
export function getCollectibleTags(
  collectibleType: CollectibleType,
): BitFlags<ItemConfigTag> {
  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  return itemConfigItem === undefined ? ItemConfigTagZero : itemConfigItem.Tags;
}

/**
 * Helper function to get an array that represents the range from the first collectible type to the
 * last collectible type. This will include integers that do not represent any valid collectible
 * types.
 *
 * This function is only useful when building collectible type objects. For most purposes, you
 * should use the `getCollectibleSet` helper function instead.
 */
export function getCollectibleTypeRange(): CollectibleType[] {
  return irange(
    FIRST_COLLECTIBLE_TYPE,
    LAST_COLLECTIBLE_TYPE,
  ) as CollectibleType[];
}

/**
 * Helper function to get an array that represents the all modded collectible types.
 *
 * This function is only useful when building collectible type objects. For most purposes, you
 * should use the `getModdedCollectibleSet` helper function instead.
 *
 * Returns an empty array if there are no modded collectible types.
 *
 * (This function is named differently from the `getVanillaCollectibleTypeRange` function because
 * all modded collectible types are contiguous. Thus, each value represents a real
 * `CollectibleType`.)
 */
export function getModdedCollectibleTypes(): CollectibleType[] {
  if (LAST_VANILLA_COLLECTIBLE_TYPE === LAST_COLLECTIBLE_TYPE) {
    return [];
  }

  return irange(
    FIRST_MODDED_COLLECTIBLE_TYPE,
    LAST_COLLECTIBLE_TYPE,
  ) as CollectibleType[];
}

/**
 * Helper function to get an array that represents the range from the first collectible type to the
 * last vanilla collectible type. This will include integers that do not represent any valid
 * collectible types.
 *
 * This function is only useful when building collectible type objects. For most purposes, you
 * should use the `getVanillaCollectibleSet` helper function instead.
 */
export function getVanillaCollectibleTypeRange(): CollectibleType[] {
  return irange(
    FIRST_COLLECTIBLE_TYPE,
    LAST_VANILLA_COLLECTIBLE_TYPE,
  ) as CollectibleType[];
}

/** Returns true if the item type in the item config is equal to `ItemType.ITEM_ACTIVE`. */
export function isActiveCollectible(collectibleType: CollectibleType): boolean {
  const itemType = getCollectibleItemType(collectibleType);
  return itemType === ItemType.ACTIVE;
}

/** Returns true if the collectible has a red question mark sprite. */
export function isBlindCollectible(collectible: EntityPickup): boolean {
  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "isBlindCollectible" function was given a non-collectible: ${entityID}`,
    );
  }

  const sprite = collectible.GetSprite();
  const animation = sprite.GetAnimation();
  const frame = sprite.GetFrame();

  questionMarkSprite.SetFrame(animation, frame);
  return collectibleSpriteEquals(sprite, questionMarkSprite);
}

/**
 * Returns whether or not the given collectible is a "glitched" item. All items are replaced by
 * glitched items once a player has TMTRAINER. However, glitched items can also "naturally" appear
 * in secret rooms and I AM ERROR rooms if the "Corrupted Data" achievement is unlocked.
 */
export function isGlitchedCollectible(pickup: EntityPickup): boolean {
  return (
    pickup.Variant === PickupVariant.COLLECTIBLE &&
    pickup.SubType > GLITCHED_ITEM_THRESHOLD
  );
}

/**
 * Returns true if the collectible has the "Hidden" attribute in the item config.
 *
 * Hidden collectibles will not show up in any pools and Eden will not start with them.
 */
export function isHiddenCollectible(collectibleType: CollectibleType): boolean {
  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  return itemConfigItem !== undefined && itemConfigItem.Hidden;
}

/**
 * Returns true if the item type in the item config is equal to `ItemType.ITEM_PASSIVE` or
 * `ItemType.ITEM_FAMILIAR`.
 */
export function isPassiveCollectible(
  collectibleType: CollectibleType,
): boolean {
  const itemType = getCollectibleItemType(collectibleType);
  return itemType === ItemType.PASSIVE || itemType === ItemType.FAMILIAR;
}

/**
 * Helper function to determine if a particular collectible will disappear from the player's
 * inventory upon use. Note that this will not work will modded items, as there is no way to
 * dynamically know if a modded item will disappear.
 */
export function isSingleUseCollectible(
  collectibleType: CollectibleType,
): boolean {
  return SINGLE_USE_ACTIVE_COLLECTIBLE_TYPES_SET.has(collectibleType);
}

export function isValidCollectibleType(
  collectibleType: CollectibleType,
): boolean {
  const itemConfigItem = itemConfig.GetCollectible(collectibleType);
  return itemConfigItem !== undefined;
}

/**
 * Helper function to put a message in the log.txt file to let the Rebirth Item Tracker know that it
 * should remove an item.
 *
 * The "item tracker" in this function does not refer to the in-game item tracker, but rather to the
 * Python program located at: https://github.com/Rchardon/RebirthItemTracker
 */
export function removeCollectibleFromItemTracker(
  collectibleType: CollectibleType,
): void {
  const collectibleName = getCollectibleName(collectibleType);

  // This cannot use the "log" function since the prefix will prevent the Rebirth Item Tracker from
  // recognizing the message.
  Isaac.DebugString(
    `Removing collectible ${collectibleType} (${collectibleName}) on player 0 (Player)`,
  );
}

/**
 * Helper function to remove all pickup delay on a collectible. By default, collectibles have a 20
 * frame delay before they can be picked up by a player.
 */
export function removeCollectiblePickupDelay(collectible: EntityPickup): void {
  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "removeCollectiblePickupDelay" function was given a non-collectible: ${entityID}`,
    );
  }

  collectible.Wait = 0;
}

/**
 * Helper function to set a collectible sprite to a question mark (i.e. how collectibles look when
 * the player has Curse of the Blind).
 */
export function setCollectibleBlind(collectible: EntityPickup): void {
  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "setCollectibleBlind" function was given a non-collectible: ${entityID}`,
    );
  }

  setCollectibleSprite(collectible, BLIND_ITEM_PNG_PATH);
}

/**
 * Helper function to remove the collectible from a collectible pedestal and make it appear as if a
 * player has already taken the item. This is accomplished by changing the sub-type to
 * `CollectibleType.NULL` and then setting the sprite to an empty/missing PNG file.
 *
 * For more information, see the documentation for the "clearSprite" helper function.
 */
export function setCollectibleEmpty(collectible: EntityPickup): void {
  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "setCollectibleEmpty" function was given a non-collectible: ${entityID}`,
    );
  }

  collectible.SubType = CollectibleType.NULL;
  clearCollectibleSprite(collectible);
}

// cspell:ignore thesadonion
/**
 * Helper function to change the sprite of a collectible pedestal entity.
 *
 * For more information about removing the collectible sprite, see the documentation for the
 * "clearSprite" helper function.
 *
 * @param collectible The collectible whose sprite you want to modify.
 * @param pngPath Equal to either the spritesheet path to load (e.g.
 *                "gfx/items/collectibles/collectibles_001_thesadonion.png") or undefined. If
 *                undefined, the sprite will be removed, making it appear like the collectible has
 *                already been taken by the player.
 */
export function setCollectibleSprite(
  collectible: EntityPickup,
  pngPath: string | undefined,
): void {
  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "setCollectibleSprite" function was given a non-collectible: ${entityID}`,
    );
  }

  const sprite = collectible.GetSprite();
  if (pngPath === undefined) {
    clearSprite(sprite, COLLECTIBLE_SPRITE_LAYER, COLLECTIBLE_SHADOW_LAYER);
  } else {
    sprite.ReplaceSpritesheet(COLLECTIBLE_SPRITE_LAYER, pngPath);
    sprite.LoadGraphics();
  }
}

/**
 * Helper function to change the collectible on a pedestal. Simply updating the `SubType` property
 * is not sufficient because the sprite will not change.
 */
export function setCollectibleSubType(
  collectible: EntityPickup,
  newCollectibleType: CollectibleType,
): void {
  if (!isCollectible(collectible)) {
    const entityID = getEntityID(collectible);
    error(
      `The "setCollectibleSubType" function was given a non-collectible: ${entityID}`,
    );
  }

  // You cannot morph a pedestal to "CollectibleType.NULL"; it would instead create a new random
  // collectible item.
  if (newCollectibleType === CollectibleType.NULL) {
    setCollectibleEmpty(collectible);
    return;
  }

  // The naive way to change a collectible's sub-type is to set it directly. However, doing this
  // will not update the sprite. Manually updating the sprite works in most situations, but does not
  // work when the pedestal is empty. Instead, we can simply morph the collectible, which seems to
  // work in all situations.
  collectible.Morph(
    EntityType.PICKUP,
    PickupVariant.COLLECTIBLE,
    newCollectibleType,
    true,
    true,
    true,
  );
}

/**
 * Helper function to put a message in the log.txt file to let the Rebirth Item Tracker know that
 * the build has been rerolled.
 */
export function setCollectiblesRerolledForItemTracker(): void {
  // This cannot use the "log" function since the prefix will prevent the Rebirth Item Tracker from
  // recognizing the message. The number here does not matter since the tracker does not check for a
  // specific number.
  Isaac.DebugString("Added 3 Collectibles");
}
