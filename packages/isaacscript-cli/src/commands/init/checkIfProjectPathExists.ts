import chalk from "chalk";
import { error } from "isaacscript-common-ts";
import { CWD } from "../../constants.js";
import { deleteFileOrDirectory, fileExists, isDir } from "../../file.js";
import { getInputYesNo } from "../../prompt.js";

export async function checkIfProjectPathExists(
  projectPath: string,
  yes: boolean,
  verbose: boolean,
): Promise<void> {
  if (projectPath === CWD || !fileExists(projectPath, verbose)) {
    return;
  }

  const fileType = isDir(projectPath, verbose) ? "directory" : "file";

  if (yes) {
    deleteFileOrDirectory(projectPath, verbose);
    console.log(`Deleted ${fileType}: ${chalk.green(projectPath)}`);
    return;
  }

  console.log(
    `A ${fileType} already exists with a name of: ${chalk.green(projectPath)}`,
  );
  const shouldDelete = await getInputYesNo("Do you want me to delete it?");

  if (!shouldDelete) {
    error("Ok then. Goodbye.");
  }

  deleteFileOrDirectory(projectPath, verbose);
}
