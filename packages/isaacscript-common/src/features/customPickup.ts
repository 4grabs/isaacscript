import {
  EffectVariant,
  EntityType,
  ModCallback,
  PickupVariant,
} from "isaac-typescript-definitions";
import { errorIfFeaturesNotInitialized } from "../featuresInitialized";
import {
  getEntityID,
  getEntityIDFromConstituents,
} from "../functions/entities";
import { spawnEffect } from "../functions/entitiesSpecific";

const FEATURE_NAME = "customPickup";

interface CustomPickupFunctions {
  collectFunc: (player: EntityPlayer) => void;
  collisionFunc: (player: EntityPlayer) => boolean;
}

/**
 * Normally, we would make a custom entity to represent a fading-away pickup, but we don't want to
 * interfere with the "entities2.xml" file in end-user mods. Thus, we must select a vanilla effect
 * to masquerade as a backdrop effect.
 *
 * We arbitrarily choose a ladder for this purpose because it will not automatically despawn after
 * time passes, like most other effects.
 */
const PICKUP_EFFECT_VARIANT = EffectVariant.LADDER;
const PICKUP_EFFECT_SUB_TYPE = 103;

/** Indexed by entity ID. */
const customPickupFunctionsMap = new Map<string, CustomPickupFunctions>();

export function customPickupInit(mod: Mod): void {
  mod.AddCallback(ModCallback.PRE_PICKUP_COLLISION, prePickupCollision); // 38
  mod.AddCallback(
    ModCallback.POST_EFFECT_RENDER,
    postEffectRenderPickupEffect,
    PICKUP_EFFECT_VARIANT,
  ); // 56
}

// ModCallback.PRE_PICKUP_COLLISION (38)
function prePickupCollision(
  pickup: EntityPickup,
  collider: Entity,
): boolean | undefined {
  const entityID = getEntityID(pickup);
  const customPickupFunctions = customPickupFunctionsMap.get(entityID);
  if (customPickupFunctions === undefined) {
    return undefined;
  }

  const player = collider.ToPlayer();
  if (player === undefined) {
    return undefined;
  }

  const shouldPickup = customPickupFunctions.collisionFunc(player);
  if (!shouldPickup) {
    return undefined;
  }

  pickup.Remove();

  const pickupSprite = pickup.GetSprite();
  const fileName = pickupSprite.GetFilename();

  const effect = spawnEffect(
    PICKUP_EFFECT_VARIANT,
    PICKUP_EFFECT_SUB_TYPE,
    pickup.Position,
  );
  const effectSprite = effect.GetSprite();
  effectSprite.Load(fileName, true);
  effectSprite.Play("Collect", true);

  customPickupFunctions.collectFunc(player);

  return undefined;
}

// ModCallback.POST_EFFECT_RENDER (56)
// PICKUP_EFFECT_VARIANT
function postEffectRenderPickupEffect(effect: EntityEffect) {
  if (effect.SubType !== PICKUP_EFFECT_SUB_TYPE) {
    return;
  }

  const sprite = effect.GetSprite();
  if (sprite.IsFinished("Collect")) {
    effect.Remove();
  }
}

/**
 * Helper function to register a custom pickup with the IsaacScript standard library. Use this
 * feature for custom pickups that are intended to be picked up by the player, like keys and bombs.
 *
 * When IsaacScript detects that a player should be collecting the custom pickup, then the pickup
 * will be immediately removed, and an effect showing the pickup's respective `Collect` animation
 * will be spawned. (This emulates how a normal vanilla pickup would work.)
 *
 * Note that when you specify your custom pickup in the "entities2.xml" file, it should have a type
 * of "5" and be associated with an anm2 file that has a "Collect" animation.
 *
 * @param pickupVariantCustom The variant for the corresponding custom pickup.
 * @param subType The sub-type for the corresponding custom pickup.
 * @param collectFunc The function to run when the player collects this pickup.
 * @param collisionFunc Optional. The function to run when a player collides with the pickup.
 *                      Default is a function that always returns true, meaning that the player will
 *                      always immediately collect the pickup when they collide with it. Specify
 *                      this function if your pickup should only be able to be collected under
 *                      certain conditions.
 */
export function registerCustomPickup(
  pickupVariantCustom: PickupVariant,
  subType: int,
  collectFunc: (player: EntityPlayer) => void,
  collisionFunc: (player: EntityPlayer) => boolean = () => true,
): void {
  errorIfFeaturesNotInitialized(FEATURE_NAME);

  const entityID = getEntityIDFromConstituents(
    EntityType.PICKUP,
    pickupVariantCustom,
    subType,
  );
  const customPickupFunctions: CustomPickupFunctions = {
    collectFunc,
    collisionFunc,
  };
  customPickupFunctionsMap.set(entityID, customPickupFunctions);
}
