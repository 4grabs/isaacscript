import path from "node:path";
import { Config } from "../../classes/Config.js";
import {
  DISABLE_IT_FILE,
  MAIN_LUA,
  WATCHER_MOD_NAME,
  WATCHER_MOD_SOURCE_PATH,
} from "../../constants.js";
import {
  copyFile,
  deleteFileOrDirectory,
  fileExists,
  readFile,
  writeFile,
} from "../../file.js";

export function copyWatcherMod(config: Config, verbose: boolean): void {
  // Check to see if this mod was disabled.
  const watcherModPath = path.join(config.modsDirectory, WATCHER_MOD_NAME);
  const disableItPath = path.join(watcherModPath, DISABLE_IT_FILE);
  const watcherModDisabled = fileExists(disableItPath, verbose);

  // Delete and re-copy the watcher mod every time IsaacScript starts. This ensures that it is
  // always the latest version.
  if (fileExists(watcherModPath, verbose)) {
    deleteFileOrDirectory(watcherModPath, verbose);
  }

  copyFile(WATCHER_MOD_SOURCE_PATH, watcherModPath, verbose);

  if (watcherModDisabled) {
    // Since we deleted the directory, the "disable.it" file was deleted. Restore it.
    writeFile(disableItPath, "", verbose);
  }

  // By default, the IsaacScript watcher mod automatically restarts the game, so we only need to
  // disable it if the config option is explicitly set to false.
  if (config.enableIsaacScriptWatcherAutoRestart === false) {
    disableIsaacScriptWatcherAutomaticRestart(watcherModPath, verbose);
  }

  // If we copied a new version of the watcher mod into place, but the user currently has the game
  // open, then the old version will stay loaded. However, if the watcher mod reloads itself, the
  // game will crash, so there is no automated solution for this.
}

function disableIsaacScriptWatcherAutomaticRestart(
  watcherModPath: string,
  verbose: boolean,
) {
  const mainLuaPath = path.join(watcherModPath, MAIN_LUA);
  const mainLua = readFile(mainLuaPath, verbose);

  const modifiedMainLua = mainLua.replace(
    "local RESTART_GAME_ON_RECOMPILATION = true",
    "local RESTART_GAME_ON_RECOMPILATION = false",
  );

  writeFile(mainLuaPath, modifiedMainLua, verbose);
}
