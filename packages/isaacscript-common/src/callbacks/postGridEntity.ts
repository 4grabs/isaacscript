// This provides the logic for the following callbacks:
// - PostGridEntityInit
// - PostGridEntityUpdate
// - PostGridEntityRemove
// - PostGridEntityStateChanged
// - PostGridEntityBroken

import { GridEntityType, ModCallback } from "isaac-typescript-definitions";
import { ModUpgraded } from "../classes/ModUpgraded";
import { ModCallbackCustom } from "../enums/ModCallbackCustom";
import { saveDataManager } from "../features/saveDataManager/exports";
import {
  getGridEntitiesMap,
  isGridEntityBroken,
} from "../functions/gridEntities";
import {
  postGridEntityBrokenFire,
  postGridEntityBrokenHasSubscriptions,
} from "./subscriptions/postGridEntityBroken";
import {
  postGridEntityInitFire,
  postGridEntityInitHasSubscriptions,
} from "./subscriptions/postGridEntityInit";
import {
  postGridEntityRemoveFire,
  postGridEntityRemoveHasSubscriptions,
} from "./subscriptions/postGridEntityRemove";
import {
  postGridEntityStateChangedFire,
  postGridEntityStateChangedHasSubscriptions,
} from "./subscriptions/postGridEntityStateChanged";
import {
  postGridEntityUpdateFire,
  postGridEntityUpdateHasSubscriptions,
} from "./subscriptions/postGridEntityUpdate";

type GridEntityTuple = [
  gridEntityType: GridEntityType,
  gridEntityVariant: int,
  state: int,
];

const v = {
  room: {
    /** Indexed by grid index. */
    initializedGridEntities: new Map<int, GridEntityTuple>(),
  },
};

/** @internal */
export function postGridEntityCallbacksInit(mod: ModUpgraded): void {
  saveDataManager("postGridEntity", v, hasSubscriptions);

  mod.AddCallback(ModCallback.POST_UPDATE, postUpdate); // 1
  mod.AddCallbackCustom(
    ModCallbackCustom.POST_NEW_ROOM_REORDERED,
    postNewRoomReordered,
  );
}

function hasSubscriptions() {
  return (
    postGridEntityInitHasSubscriptions() ||
    postGridEntityUpdateHasSubscriptions() ||
    postGridEntityRemoveHasSubscriptions() ||
    postGridEntityStateChangedHasSubscriptions() ||
    postGridEntityBrokenHasSubscriptions()
  );
}

// ModCallback.POST_UPDATE (1)
function postUpdate() {
  if (!hasSubscriptions()) {
    return;
  }

  const gridEntitiesMap = getGridEntitiesMap();

  // We check for removed grid entities first so that grid entities that change type will count as
  // being removed and fire the PostGridEntityRemoved callback.
  checkGridEntitiesRemoved(gridEntitiesMap);

  for (const [gridIndex, gridEntity] of gridEntitiesMap.entries()) {
    checkGridEntityStateChanged(gridIndex, gridEntity);
    checkNewGridEntity(gridIndex, gridEntity);
    postGridEntityUpdateFire(gridEntity);
  }
}

function checkGridEntitiesRemoved(gridEntitiesMap: Map<int, GridEntity>) {
  for (const [
    gridIndex,
    gridEntityTuple,
  ] of v.room.initializedGridEntities.entries()) {
    const [storedGridEntityType, storedGridEntityVariant] = gridEntityTuple;
    const gridEntity = gridEntitiesMap.get(gridIndex);
    if (
      gridEntity === undefined ||
      gridEntity.GetType() !== storedGridEntityType
    ) {
      v.room.initializedGridEntities.delete(gridIndex);
      postGridEntityRemoveFire(
        gridIndex,
        storedGridEntityType,
        storedGridEntityVariant,
      );
    }
  }
}

function checkGridEntityStateChanged(gridIndex: int, gridEntity: GridEntity) {
  const gridEntityTuple = v.room.initializedGridEntities.get(gridIndex);
  if (gridEntityTuple === undefined) {
    // This grid entity did not exist a frame ago; we don't want to fire the state changed callback
    // on the first frame that it exists.
    return;
  }

  const [_gridEntityType, _gridEntityVariant, oldState] = gridEntityTuple;
  const newState = gridEntity.State;
  if (oldState !== newState) {
    updateTupleInMap(gridEntity);
    postGridEntityStateChangedFire(gridEntity, oldState, newState);

    if (isGridEntityBroken(gridEntity)) {
      postGridEntityBrokenFire(gridEntity);
    }
  }
}

function checkNewGridEntity(gridIndex: int, gridEntity: GridEntity) {
  const gridEntityType = gridEntity.GetType();
  const gridEntityTuple = v.room.initializedGridEntities.get(gridIndex);

  if (gridEntityTuple === undefined || gridEntityTuple[0] !== gridEntityType) {
    updateTupleInMap(gridEntity);
    postGridEntityInitFire(gridEntity);
  }
}

function updateTupleInMap(gridEntity: GridEntity) {
  const gridEntityType = gridEntity.GetType();
  const gridEntityVariant = gridEntity.GetVariant();
  const gridIndex = gridEntity.GetGridIndex();
  const newTuple: GridEntityTuple = [
    gridEntityType,
    gridEntityVariant,
    gridEntity.State,
  ];
  v.room.initializedGridEntities.set(gridIndex, newTuple);
}

// ModCallbackCustom.POST_NEW_ROOM_REORDERED
function postNewRoomReordered() {
  if (!hasSubscriptions()) {
    return;
  }

  const gridEntitiesMap = getGridEntitiesMap();

  for (const [gridIndex, gridEntity] of gridEntitiesMap.entries()) {
    checkNewGridEntity(gridIndex, gridEntity);
  }
}
