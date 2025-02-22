import moment from "moment";
import { Config } from "./classes/Config.js";
import { CURRENT_DIRECTORY_NAME } from "./constants.js";

export function getModTargetDirectoryName(config: Config): string {
  return config.customTargetModDirectoryName === undefined
    ? CURRENT_DIRECTORY_NAME
    : config.customTargetModDirectoryName;
}

export function getTime(): string {
  return moment().format("h:mm:ss A"); // e.g. "1:23:45 AM"
}
