import { Direction } from "isaac-typescript-definitions";
import { VectorZero } from "../constants";

export const DIRECTION_TO_VECTOR: {
  readonly [key in Direction]: Readonly<Vector>;
} = {
  [Direction.NO_DIRECTION]: VectorZero, // -1
  [Direction.LEFT]: Vector(-1, 0), // 0
  [Direction.UP]: Vector(0, -1), // 1
  [Direction.RIGHT]: Vector(1, 0), // 2
  [Direction.DOWN]: Vector(0, 1), // 3
} as const;
