export const CUSTOM_STAGE_FEATURE_NAME = "customStage";

export const ISAACSCRIPT_CUSTOM_STAGE_GFX_PATH = "gfx/isaacscript-custom-stage";

/** Corresponds to "resources/gfx/ui/ui_streak.anm2". */
export enum UIStreakAnimation {
  NONE,
  TEXT,
  TEXT_STAY,
}

/** Corresponds to "resources/gfx/ui/ui_streak.anm2". */
export const UI_STREAK_ANIMATION_END_FRAMES: {
  readonly [key in UIStreakAnimation]: int;
} = {
  [UIStreakAnimation.NONE]: 0,
  [UIStreakAnimation.TEXT]: 69,
  [UIStreakAnimation.TEXT_STAY]: 1,
} as const;
