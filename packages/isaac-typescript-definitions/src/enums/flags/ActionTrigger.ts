const ActionTriggerInternal = {
  /** 1 << -1 */
  NONE: 0,

  /** 1 << 0 */
  BOMB_PLACED: 1 << 0,

  /** 1 << 1 */
  MOVED: 1 << 1,

  /** 1 << 2 */
  SHOOTING: 1 << 2,

  /** 1 << 3 */
  CARD_PILL_USED: 1 << 3,

  /** 1 << 4 */
  ITEM_ACTIVATED: 1 << 4,

  /** 1 << 5 */
  ITEMS_DROPPED: 1 << 5,
} as const;

type ActionTriggerValue = number & {
  readonly __bitFlagBrand: void;
  readonly __actionTriggerBrand: void; // eslint-disable-line isaacscript/member-ordering
};
type ActionTriggerType = {
  [K in keyof typeof ActionTriggerInternal]: ActionTriggerValue;
};

export const ActionTrigger = ActionTriggerInternal as ActionTriggerType;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ActionTrigger = ActionTriggerType[keyof ActionTriggerType];

export const ActionTriggerZero = 0 as BitFlags<ActionTrigger>;
