import { log } from "./log";

/**
 * Helper function to get a stack trace.
 *
 * This will only work if the `--luadebug` launch option is enabled or the Racing+ sandbox is
 * enabled.
 */
export function getTraceback(): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (debug !== undefined) {
    // The --luadebug launch flag is enabled.
    return debug.traceback();
  }

  if (sandboxGetTraceback !== undefined) {
    return sandboxGetTraceback();
  }

  return 'stack traceback:\n(the "--luadebug" flag is not enabled)';
}

/**
 * Players can boot the game with an launch option called "--luadebug", which will enable additional
 * functionality that is considered to be unsafe. For more information about this flag, see the
 * wiki: https://bindingofisaacrebirth.fandom.com/wiki/Launch_Options
 *
 * When this flag is enabled, the global environment will be slightly different. The differences are
 * documented here: https://wofsauge.github.io/IsaacDocs/rep/Globals.html
 *
 * This function uses the `package` global variable as a proxy to determine if the "--luadebug" flag
 * is enabled or not.
 */
export function isLuaDebugEnabled(): boolean {
  // "package" is not always defined like the Lua definitions imply.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return _G.package !== undefined;
}

/**
 * Helper function to print a stack trace to the "log.txt" file, similar to JavaScript's
 * `console.trace` function.
 *
 * This will only work if the `--luadebug` launch option is enabled or the Racing+ sandbox is
 * enabled.
 */
export function traceback(): void {
  const tracebackOutput = getTraceback();
  log(tracebackOutput);
}

function setDebugFunctionsGlobal() {
  // "debug" is not always defined like the Lua definitions imply.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (_G.debug === undefined && sandboxGetTraceback === undefined) {
    return;
  }

  const globals = _G as Record<string, unknown>;

  globals["getTraceback"] = getTraceback;
  globals["traceback"] = traceback;
}

// If the debug functions will provide useful output, make them global by default.
if (isLuaDebugEnabled() || sandboxGetTraceback !== undefined) {
  setDebugFunctionsGlobal();
}
