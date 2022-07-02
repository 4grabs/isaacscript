import {
  AngelRoomSubType,
  BossID,
  Dimension,
  Direction,
  DoorSlot,
  DungeonSubType,
  GridRoom,
  HomeRoomSubType,
  ItemPoolType,
  MinibossID,
  RoomDescriptorFlag,
  RoomShape,
  RoomTransitionAnim,
  RoomType,
  SoundEffect,
  StageID,
} from "isaac-typescript-definitions";
import { game, sfxManager } from "../cachedClasses";
import {
  LEVEL_GRID_ROW_WIDTH,
  MAX_LEVEL_GRID_INDEX,
  NUM_DIMENSIONS,
} from "../constants";
import { ROOM_SHAPE_TO_DOOR_SLOTS_TO_GRID_INDEX_DELTA } from "../objects/roomShapeToDoorSlotsToGridIndexDelta";
import { ROOM_TYPE_NAMES } from "../objects/roomTypeNames";
import { MINE_SHAFT_ROOM_SUB_TYPE_SET } from "../sets/mineShaftRoomSubTypesSet";
import {
  closeAllDoors,
  getDoors,
  isHiddenSecretRoomDoor,
  openDoorFast,
} from "./doors";
import { getEntities } from "./entity";
import { hasFlag } from "./flag";
import {
  getEntityPositions,
  getEntityVelocities,
  setEntityPositions,
  setEntityVelocities,
} from "./positionVelocity";
import {
  getRoomAllowedDoors,
  getRoomData,
  getRoomDescriptor,
  getRoomDescriptorReadOnly,
  getRoomGridIndex,
  getRoomName,
  getRoomShape,
  getRoomStageID,
  getRoomSubType,
} from "./roomData";
import { getGridIndexDelta } from "./roomShape";
import { erange, irange } from "./utils";

/**
 * Helper function for quickly switching to a new room without playing a particular animation. Use
 * this helper function over invoking the `Game.ChangeRoom` method directly to ensure that you do
 * not forget to set the `LeaveDoor` property and to prevent crashing on invalid room grid indexes.
 */
export function changeRoom(roomGridIndex: int): void {
  const level = game.GetLevel();

  const roomData = getRoomData(roomGridIndex);
  if (roomData === undefined) {
    error(
      `Failed to change the room to grid index ${roomGridIndex} because that room does not exist.`,
    );
  }

  // LeaveDoor must be set before every `Game.ChangeRoom` invocation or else the function can send
  // you to the wrong room.
  level.LeaveDoor = DoorSlot.NO_DOOR_SLOT;

  game.ChangeRoom(roomGridIndex);
}

/**
 * Helper function to get an array with every valid `Dimension` (not including `Dimension.CURRENT`).
 */
export function getAllDimensions(): Dimension[] {
  return erange(NUM_DIMENSIONS) as Dimension[];
}

export function getAllRoomGridIndexes(): int[] {
  const rooms = getRooms();
  return rooms.map((roomDescriptor) => roomDescriptor.SafeGridIndex);
}

/**
 * Helper function to get the current dimension. Most of the time, this will be `Dimension.MAIN`,
 * but it can change if e.g. the player is in the mirror world of Downpour/Dross.
 */
export function getDimension(): Dimension {
  const level = game.GetLevel();
  const roomGridIndex = getRoomGridIndex();
  const roomDescription = level.GetRoomByIdx(roomGridIndex, Dimension.CURRENT);
  const currentRoomHash = GetPtrHash(roomDescription);

  for (const dimension of getAllDimensions()) {
    const dimensionRoomDescription = level.GetRoomByIdx(
      roomGridIndex,
      dimension,
    );
    const dimensionRoomHash = GetPtrHash(dimensionRoomDescription);

    if (dimensionRoomHash === currentRoomHash) {
      return dimension;
    }
  }

  return error("Failed to get the current dimension.");
}

/**
 * Helper function to get the number of rooms that are currently on the floor layout. This does not
 * include off-grid rooms, like the Devil Room.
 */
export function getNumRooms(): int {
  const rooms = getRooms();
  return rooms.length;
}

/**
 * Helper function to get an array of all of the safe grid indexes for rooms that match the
 * specified room type.
 *
 * This function only searches through rooms in the current dimension.
 *
 * This function is variadic, meaning that you can specify N arguments to get the combined grid
 * indexes for N room types.
 */
export function getRoomGridIndexesForType(...roomTypes: RoomType[]): int[] {
  const roomTypesSet = new Set<RoomType>([...roomTypes]);

  const rooms = getRooms();
  const matchingRooms = rooms.filter(
    (roomDescriptor) =>
      roomDescriptor.Data !== undefined &&
      roomTypesSet.has(roomDescriptor.Data.Type),
  );

  return matchingRooms.map((roomDescriptor) => roomDescriptor.SafeGridIndex);
}

/**
 * Helper function to get the item pool type for the current room. For example, this returns
 * `ItemPoolType.ItemPoolType.POOL_ANGEL` if you are in an Angel Room.
 */
export function getRoomItemPoolType(): ItemPoolType {
  const itemPool = game.GetItemPool();
  const room = game.GetRoom();
  const roomType = room.GetType();
  const roomSeed = room.GetSpawnSeed();

  return itemPool.GetPoolForRoom(roomType, roomSeed);
}

/**
 * Helper function to get the grid indexes of all the rooms connected to the given room index.
 *
 * @param roomGridIndex Optional. Default is the current room index.
 */
export function getRoomNeighbors(roomGridIndex?: int): int[] {
  const roomDescriptor = getRoomDescriptor(roomGridIndex);

  if (
    roomDescriptor.SafeGridIndex < 0 ||
    roomDescriptor.SafeGridIndex > MAX_LEVEL_GRID_INDEX
  ) {
    return [];
  }

  const roomData = roomDescriptor.Data;
  if (roomData === undefined) {
    return [];
  }

  const roomShape = roomData.Shape;
  const gridIndexDeltas = getRoomShapeNeighborGridIndexDeltas(roomShape);
  const gridIndexes = gridIndexDeltas.map(
    (gridIndexDelta) => roomDescriptor.SafeGridIndex + gridIndexDelta,
  );
  return gridIndexes.filter((gridIndex) => roomExists(gridIndex));
}

export function getRoomShapeNeighborGridIndexDeltas(
  roomShape: RoomShape,
): int[] {
  return [...ROOM_SHAPE_TO_DOOR_SLOTS_TO_GRID_INDEX_DELTA[roomShape].values()];
}

/**
 * Helper function to get the proper name of a room type.
 *
 * For example, `RoomType.TREASURE` will return "Treasure Room".
 */
export function getRoomTypeName(roomType: RoomType): string {
  return ROOM_TYPE_NAMES[roomType];
}

/**
 * Helper function to get the room descriptor for every room on the level. Uses the `Level.GetRooms`
 * method to accomplish this. Rooms without data are assumed to be non-existent and are not added to
 * the list.
 *
 * @param includeExtraDimensionalRooms Optional. On some floors (e.g. Downpour 2, Mines 2),
 *                                 extra-dimensional rooms are automatically be generated and can be
 *                                 seen when you iterate over the `RoomList`. Default is false.
 */
export function getRooms(
  includeExtraDimensionalRooms = false,
): RoomDescriptor[] {
  const level = game.GetLevel();
  const roomList = level.GetRooms();

  const roomsMap = new Map<int, RoomDescriptor>();
  if (includeExtraDimensionalRooms) {
    for (let i = 0; i < roomList.Size; i++) {
      const roomDescriptor = roomList.Get(i);
      if (roomDescriptor !== undefined && roomDescriptor.Data !== undefined) {
        roomsMap.set(roomDescriptor.ListIndex, roomDescriptor);
      }
    }
  } else {
    for (const roomGridIndex of irange(MAX_LEVEL_GRID_INDEX)) {
      const roomDescriptor = level.GetRoomByIdx(roomGridIndex);
      if (roomDescriptor.Data !== undefined) {
        roomsMap.set(roomDescriptor.ListIndex, roomDescriptor);
      }
    }
  }

  return [...roomsMap.values()];
}

/**
 * Helper function to get the room descriptor for every room on the level in a specific dimension.
 * Uses the `Level.GetRooms` method to accomplish this. Rooms without data are assumed to be
 * non-existent and are not added to the list.
 *
 * @returns A map of room ListIndex to RoomDescriptor.
 */
export function getRoomsOfDimension(dimension: Dimension): RoomDescriptor[] {
  const level = game.GetLevel();

  const roomsMap = new Map<int, RoomDescriptor>();
  for (const roomGridIndex of irange(MAX_LEVEL_GRID_INDEX)) {
    const roomDescriptor = level.GetRoomByIdx(roomGridIndex, dimension);
    if (roomDescriptor.Data !== undefined) {
      roomsMap.set(roomDescriptor.ListIndex, roomDescriptor);
    }
  }

  return [...roomsMap.values()];
}

/**
 * Helper function to determine if the current room shape is equal to `RoomShape.1x2` or
 * `RoomShape.2x1`.
 */
export function in2x1Room(): boolean {
  const room = game.GetRoom();
  const roomShape = room.GetRoomShape();

  return roomShape === RoomShape.SHAPE_1x2 || roomShape === RoomShape.SHAPE_2x1;
}

export function inAngelShop(): boolean {
  const room = game.GetRoom();
  const roomType = room.GetType();
  const roomSubType = getRoomSubType();

  // eslint-disable-next-line isaacscript/strict-enums
  return roomType === RoomType.ANGEL && roomSubType === AngelRoomSubType.SHOP;
}

export function inBeastRoom(): boolean {
  const room = game.GetRoom();
  const roomType = room.GetType();
  const roomSubType = getRoomSubType();

  return (
    // eslint-disable-next-line isaacscript/strict-enums
    roomType === RoomType.DUNGEON && roomSubType === DungeonSubType.BEAST_ROOM
  );
}

/**
 * Helper function to check if the current room is a boss room for a particular boss. This will only
 * work for bosses that have dedicated boss rooms in the "00.special rooms.stb" file.
 */
export function inBossRoomOf(bossID: BossID): boolean {
  const room = game.GetRoom();
  const roomType = room.GetType();
  const roomStageID = getRoomStageID();
  const roomSubType = getRoomSubType();

  return (
    roomType === RoomType.BOSS &&
    roomStageID === StageID.SPECIAL_ROOMS &&
    roomSubType === bossID // eslint-disable-line isaacscript/strict-enums
  );
}

/**
 * Helper function for determining whether the current room is a crawl space. Use this function over
 * comparing to `RoomType.DUNGEON` or `GridRoom.DUNGEON_IDX` since there is a special case of the
 * player being in a boss fight that take place in a dungeon.
 */
export function inCrawlSpace(): boolean {
  const room = game.GetRoom();
  const roomType = room.GetType();
  const roomSubType = getRoomSubType();

  // eslint-disable-next-line isaacscript/strict-enums
  return roomType === RoomType.DUNGEON && roomSubType === DungeonSubType.NORMAL;
}

/**
 * We cannot use the standard code in the `inDimension` function for this purpose since it is bugged
 * with the Death Certificate area.
 */
export function inDeathCertificateArea(): boolean {
  const roomStageID = getRoomStageID();
  const roomSubType = getRoomSubType();

  return (
    roomStageID === StageID.HOME &&
    // eslint-disable-next-line isaacscript/strict-enums
    (roomSubType === HomeRoomSubType.DEATH_CERTIFICATE_ENTRANCE ||
      // eslint-disable-next-line isaacscript/strict-enums
      roomSubType === HomeRoomSubType.DEATH_CERTIFICATE_ITEMS)
  );
}

/**
 * Helper function to detect if the current room is a Treasure Room created when entering with a
 * Devil's Crown trinket. Under the hood, this checks for the `RoomDescriptorFlag.DEVIL_TREASURE`
 * flag.
 */
export function inDevilsCrownTreasureRoom(): boolean {
  const roomDescriptor = getRoomDescriptorReadOnly();
  return hasFlag(roomDescriptor.Flags, RoomDescriptorFlag.DEVIL_TREASURE);
}

export function inDimension(dimension: Dimension): boolean {
  return dimension === getDimension();
}

export function inDoubleTrouble(): boolean {
  const room = game.GetRoom();
  const roomType = room.GetType();
  const roomName = getRoomName();

  return roomType === RoomType.BOSS && roomName.includes("Double Trouble");
}

export function inGenesisRoom(): boolean {
  const roomGridIndex = getRoomGridIndex();

  // eslint-disable-next-line isaacscript/strict-enums
  return roomGridIndex === GridRoom.GENESIS;
}

/** Helper function to determine if the current room shape is one of the four L room shapes. */
export function inLRoom(): boolean {
  const room = game.GetRoom();
  const roomShape = room.GetRoomShape();

  return (
    roomShape === RoomShape.LTL ||
    roomShape === RoomShape.LTR ||
    roomShape === RoomShape.LBL ||
    roomShape === RoomShape.LBR
  );
}

export function inMegaSatanRoom(): boolean {
  const roomGridIndex = getRoomGridIndex();

  // eslint-disable-next-line isaacscript/strict-enums
  return roomGridIndex === GridRoom.MEGA_SATAN;
}

/**
 * Helper function to determine if the current room is part of the Repentance "escape sequence" in
 * the Mines/Ashpit.
 */
export function inMineShaft(): boolean {
  const roomStageID = getRoomStageID();
  const roomSubType = getRoomSubType();

  return (
    (roomStageID === StageID.MINES || roomStageID === StageID.ASHPIT) &&
    // eslint-disable-next-line isaacscript/strict-enums
    MINE_SHAFT_ROOM_SUB_TYPE_SET.has(roomSubType)
  );
}

/**
 * Helper function to check if the current room is a miniboss room for a particular miniboss. This
 * will only work for mini-bosses that have dedicated boss rooms in the "00.special rooms.stb" file.
 */
export function inMinibossRoomOf(minibossID: MinibossID): boolean {
  const room = game.GetRoom();
  const roomType = room.GetType();
  const roomStageID = getRoomStageID();
  const roomSubType = getRoomSubType();

  return (
    roomType === RoomType.MINI_BOSS &&
    roomStageID === StageID.SPECIAL_ROOMS &&
    roomSubType === minibossID // eslint-disable-line isaacscript/strict-enums
  );
}

/**
 * Helper function for checking if the room is a secret shop (from the Member Card collectible).
 *
 * Secret shops are simply copies of normal shops, but with the backdrop of a secret room. In other
 * words, they will have the same room type, room variant, and room sub-type of a normal shop. Thus,
 * the only way to detect them is by using the grid index.
 */
export function inSecretShop(): boolean {
  const roomGridIndex = getRoomGridIndex();

  // eslint-disable-next-line isaacscript/strict-enums
  return roomGridIndex === GridRoom.SECRET_SHOP;
}

/**
 * Helper function to determine whether or not the current room is the starting room of a floor. It
 * only returns true for the starting room of the primary dimension (meaning that being in the
 * starting room of the mirror world does not count).
 */
export function inStartingRoom(): boolean {
  const level = game.GetLevel();
  const startingRoomGridIndex = level.GetStartingRoomIndex();
  const roomGridIndex = getRoomGridIndex();

  return roomGridIndex === startingRoomGridIndex && inDimension(Dimension.MAIN);
}

/**
 * Helper function to loop through every room on the floor and see if it has been cleared.
 *
 * This function will only check rooms in the current dimension.
 *
 * @param onlyCheckRoomTypes Optional. A whitelist of room types. If specified, room types not in
 *                           the array will be ignored. If not specified, then all rooms will be
 *                           checked. Undefined by default.
 */
export function isAllRoomsClear(onlyCheckRoomTypes?: RoomType[]): boolean {
  const roomTypeWhitelist =
    onlyCheckRoomTypes === undefined ? null : new Set(onlyCheckRoomTypes);
  const rooms = getRooms();
  const matchingRooms =
    roomTypeWhitelist === null
      ? rooms
      : rooms.filter(
          (roomDescriptor) =>
            roomDescriptor.Data !== undefined &&
            roomTypeWhitelist.has(roomDescriptor.Data.Type),
        );

  return matchingRooms.every((roomDescriptor) => roomDescriptor.Clear);
}

export function isDoorSlotValidAtGridIndex(
  doorSlot: DoorSlot,
  roomGridIndex: int,
): boolean {
  const allowedDoors = getRoomAllowedDoors(roomGridIndex);
  return allowedDoors.has(doorSlot);
}

export function isDoorSlotValidAtGridIndexForRedRoom(
  doorSlot: DoorSlot,
  roomGridIndex: int,
): boolean {
  const doorSlotValidAtGridIndex = isDoorSlotValidAtGridIndex(
    doorSlot,
    roomGridIndex,
  );
  if (!doorSlotValidAtGridIndex) {
    return false;
  }

  const roomShape = getRoomShape(roomGridIndex);
  if (roomShape === undefined) {
    return false;
  }

  const delta = getGridIndexDelta(roomShape, doorSlot);
  if (delta === undefined) {
    return false;
  }

  const redRoomGridIndex = roomGridIndex + delta;
  return (
    !roomExists(redRoomGridIndex) &&
    redRoomGridIndex >= 0 &&
    redRoomGridIndex <= MAX_LEVEL_GRID_INDEX
  );
}

/**
 * Helper function to detect if the provided room was created by the Red Key item. Under the hood,
 * this checks for the `RoomDescriptorFlag.FLAG_RED_ROOM` flag.
 *
 * @param roomGridIndex Optional. Default is the current room index.
 */
export function isRedKeyRoom(roomGridIndex?: int): boolean {
  const roomDescriptor = getRoomDescriptor(roomGridIndex);
  return hasFlag(roomDescriptor.Flags, RoomDescriptorFlag.RED_ROOM);
}

/**
 * Helper function to determine if the provided room is part of the floor layout. For example, Devil
 * Rooms and the Mega Satan room are not considered to be inside the map.
 *
 * @param roomGridIndex Optional. Default is the current room index.
 */
export function isRoomInsideMap(roomGridIndex?: int): boolean {
  if (roomGridIndex === undefined) {
    roomGridIndex = getRoomGridIndex();
  }

  return roomGridIndex >= 0;
}

/** Helper function to check if a room exists at the given room grid index. */
export function roomExists(roomGridIndex: int): boolean {
  const roomData = getRoomData(roomGridIndex);
  return roomData !== undefined;
}

/**
 * Helper function to get the coordinates of a given grid index. The floor is represented by a 13x13
 * grid. For example, since the starting room is in the center, the starting room grid index of 84
 * be equal to coordinates of (?, ?).
 */
export function roomGridIndexToXY(roomGridIndex: int): [x: int, y: int] {
  const x = roomGridIndex % LEVEL_GRID_ROW_WIDTH;
  const y = Math.floor(roomGridIndex / LEVEL_GRID_ROW_WIDTH);

  return [x, y];
}

/**
 * If the `Room.Update` method is called in a PostNewRoom callback, then some entities will slide
 * around (such as the player). Since those entity velocities are already at zero, setting them to
 * zero will have no effect. Thus, a generic solution is to record all of the entity
 * positions/velocities before updating the room, and then restore those positions/velocities.
 */
export function roomUpdateSafe(): void {
  const room = game.GetRoom();
  const entities = getEntities();

  const entityPositions = getEntityPositions(entities);
  const entityVelocities = getEntityVelocities(entities);

  room.Update();

  setEntityPositions(entityPositions, entities);
  setEntityVelocities(entityVelocities, entities);
}

/**
 * Helper function to convert an uncleared room to a cleared room in the PostNewRoom callback. This
 * is useful because if enemies are removed in this callback, a room drop will be awarded and the
 * doors will start closed and then open.
 */
export function setRoomCleared(): void {
  const room = game.GetRoom();
  const roomClear = room.IsClear();

  // If the room is already cleared, we don't have to do anything.
  if (roomClear) {
    return;
  }

  room.SetClear(true);

  for (const door of getDoors()) {
    if (isHiddenSecretRoomDoor(door)) {
      continue;
    }

    // We don't use the `EntityDoor.Open` method since that will cause the door to play an
    // animation.
    openDoorFast(door);

    // If this is a mini-boss room, then the door would be barred in addition to being closed.
    // Ensure that the bar is not visible.
    door.ExtraVisible = false;
  }

  sfxManager.Stop(SoundEffect.DOOR_HEAVY_OPEN);

  // If the room contained Mom's Hands, then a screen shake will be queued. Override it with a 0
  // frame shake.
  game.ShakeScreen(0);
}

/**
 * Helper function to emulate what happens when you bomb an Angel Statue or push a Reward Plate that
 * spawns an NPC.
 */
export function setRoomUncleared(): void {
  const room = game.GetRoom();

  room.SetClear(false);
  closeAllDoors();
}

/**
 * Helper function to change the current room. It can be used for both teleportation and "normal"
 * room transitions, depending on what is passed for the `direction` and `roomTransitionAnim`
 * arguments. Use this function instead of invoking the `Game.StartRoomTransition` method directly
 * so that you do not forget to set `Level.LeaveDoor` property and to prevent crashing on invalid
 * room grid indexes.
 *
 * @param roomGridIndex The room grid index of the destination room.
 * @param direction Optional. Default is `Direction.NO_DIRECTION`.
 * @param roomTransitionAnim Optional. Default is `RoomTransitionAnim.TELEPORT`.
 */
export function teleport(
  roomGridIndex: int,
  direction = Direction.NO_DIRECTION,
  roomTransitionAnim = RoomTransitionAnim.TELEPORT,
): void {
  const level = game.GetLevel();

  const roomData = getRoomData(roomGridIndex);
  if (roomData === undefined) {
    error(
      `Failed to change the room to grid index ${roomGridIndex} because that room does not exist.`,
    );
  }

  // This must be set before every `Game.StartRoomTransition` method invocation or else the function
  // can send you to the wrong room.
  level.LeaveDoor = DoorSlot.NO_DOOR_SLOT;

  game.StartRoomTransition(roomGridIndex, direction, roomTransitionAnim);
}
