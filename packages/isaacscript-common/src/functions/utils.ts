import { RenderMode } from "isaac-typescript-definitions";
import { game } from "../cachedClasses";

const HEX_STRING_LENGTH = 6;

/**
 * Helper function to get type safety on a switch statement.
 *
 * Very useful to be future-safe against people adding values to a type or an enum.
 *
 * For example:
 *
 * ```ts
 * enum Situation {
 *   ONE,
 *   TWO,
 *   THREE,
 *   // FOUR, // If we uncomment this line, the program will no longer compile
 * }
 *
 * function handleSituation(situation: Situation) {
 *   switch (situation) {
 *     case Situation.ONE: {
 *       return 41;
 *     }
 *
 *     case Situation.TWO: {
 *       return 68;
 *     }
 *
 *     case Situation.THREE: {
 *       return 12;
 *     }
 *
 *     default: {
 *       return ensureAllCases(situation);
 *     }
 *   }
 * }
 * ```
 */
export const ensureAllCases = (obj: never): never => obj;

/**
 * Helper function to return an array with the elements from start to end. It is inclusive at the
 * start and exclusive at the end. (The "e" stands for exclusive.)
 *
 * For example, `erange(1, 3)` will return `[1, 2]`.
 *
 * If only one argument is specified, then it will assume that the start is 0.
 */
export function erange(start: int, end?: int): int[] {
  if (end === undefined) {
    end = start;
    start = 0;
  }

  const array: int[] = [];
  for (let i = start; i < end; i++) {
    array.push(i);
  }

  return array;
}

/**
 * Helper function to log what is happening in functions that recursively move through nested data
 * structures.
 */
export function getTraversalDescription(
  key: unknown,
  traversalDescription: string,
): string {
  if (traversalDescription !== "") {
    traversalDescription += " --> ";
  }

  traversalDescription += tostring(key);

  return traversalDescription;
}

/**
 * Converts a hex string like "#33aa33" to a KColor object.
 *
 * @param hexString A hex string like "#ffffff" or "ffffff". (The "#" character is optional.)
 */
export function hexToKColor(hexString: string, alpha: float): KColor {
  hexString = hexString.replace("#", "");
  if (hexString.length !== HEX_STRING_LENGTH) {
    error(`Hex strings must be of length ${HEX_STRING_LENGTH}.`);
  }

  const rString = hexString.substr(0, 2);
  const R = tonumber(`0x${rString}`);
  if (R === undefined) {
    error(`Failed to convert \`0x${rString}\` to a number.`);
  }

  const gString = hexString.substr(2, 2);
  const G = tonumber(`0x${gString}`);
  if (G === undefined) {
    error(`Failed to convert \`0x${gString}\` to a number.`);
  }

  const bString = hexString.substr(4, 2);
  const B = tonumber(`0x${bString}`);
  if (B === undefined) {
    error(`Failed to convert \`0x${bString}\` to a number.`);
  }

  // KColor values should be between 0 and 1.
  const base = 255;
  return KColor(R / base, G / base, B / base, alpha);
}

/**
 * Helper function to return an array with the elements from start to end, inclusive. (The "i"
 * stands for inclusive.)
 *
 * For example, `irange(1, 3)` will return `[1, 2, 3]`.
 *
 * If only one argument is specified, then it will assume that the start is 0.
 */
export function irange(start: int, end?: int): int[] {
  if (end === undefined) {
    end = start;
    start = 0;
  }

  const array: int[] = [];
  for (let i = start; i <= end; i++) {
    array.push(i);
  }

  return array;
}

/** Helper function to detect if a variable is a boolean, number, or string. */
export function isPrimitive(variable: unknown): boolean {
  const type = typeof variable;
  return type === "boolean" || type === "number" || type === "string";
}

/**
 * Since this is a UI element, we do not want to draw it in water reflections. `renderOffset` will
 * be a non-zero value in reflections.
 */
export function isReflectionRender(): boolean {
  const room = game.GetRoom();
  const renderMode = room.GetRenderMode();
  return renderMode === RenderMode.WATER_REFLECT;
}

/**
 * Helper function to print something to the in-game console. Use this instead of invoking the
 * `Isaac.ConsoleOutput` method directly because it will automatically insert a newline at the end
 * of the message (which `Isaac.ConsoleOutput` does not do by default).
 */
export function printConsole(msg: string): void {
  Isaac.ConsoleOutput(`${msg}\n`);
}

/** Helper function to print whether something was enabled or disabled to the in-game console. */
export function printEnabled(enabled: boolean, description: string): void {
  const enabledText = enabled ? "Enabled" : "Disabled";
  printConsole(`${enabledText} ${description}.`);
}

/**
 * Helper function to repeat code N times. This is faster to type and cleaner than using a for loop.
 *
 * For example:
 *
 * ```ts
 * const player = Isaac.GetPlayer();
 * repeat(10, () => {
 *   player.AddCollectible(CollectibleType.STEVEN);
 * });
 * ```
 *
 * The repeated function is passed the index of the iteration, if needed:
 *
 * ```ts
 * repeat(3, (i) => {
 *   print(i); // Prints "0", "1", "2"
 * });
 * ```
 */
export function repeat(n: int, func: (i: int) => void): void {
  for (let i = 0; i < n; i++) {
    func(i);
  }
}

/**
 * Helper function to signify that the enclosing code block is not yet complete. Using this function
 * is similar to writing a "TODO" comment, but it has the benefit of preventing ESLint errors due to
 * early returns.
 *
 * When you see this function, it simply means that the programmer intends to add in more code to
 * this spot later.
 *
 * This function does not actually do anything. (It is an "empty" function.)
 */
export function todo(): void {}

/**
 * Helper function to sort a two-dimensional array by the first element.
 *
 * For example:
 *
 * ```ts
 * const myArray = [[1, 2], [2, 3], [3, 4]];
 * myArray.sort(twoDimensionalSort);
 * ```
 *
 * From:
 * https://stackoverflow.com/questions/16096872/how-to-sort-2-dimensional-array-by-column-value
 */
export function twoDimensionalSort<T>(a: T[], b: T[]): -1 | 0 | 1 {
  if (a[0] === undefined || b[0] === undefined) {
    error(
      "Failed to two-dimensional sort since the first element of the array was undefined.",
    );
  }

  if (a[0] === b[0]) {
    return 0;
  }

  return a[0] < b[0] ? -1 : 1;
}
