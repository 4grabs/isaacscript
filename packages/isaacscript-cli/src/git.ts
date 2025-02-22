import chalk from "chalk";
import commandExists from "command-exists";
import { error, parseSemanticVersion } from "isaacscript-common-ts";
import path from "node:path";
import yaml from "yaml";
import { HOME_DIR, PROJECT_NAME } from "./constants.js";
import { execShell, execShellString } from "./exec.js";
import { fileExists, readFile } from "./file.js";
import { GitHubCLIHostsYAML } from "./interfaces/GitHubCLIHostsYAML.js";
import { getInputString, getInputYesNo } from "./prompt.js";
import { getVersionOfThisPackage } from "./version.js";

// Versions prior to this do not work properly with: `git branch --move --force main`
const REQUIRED_GIT_MAJOR_VERSION = 2;
const REQUIRED_GIT_MINOR_VERSION = 30;

export async function promptGitHubRepoOrGitRemoteURL(
  projectName: string,
  noGit: boolean,
  yes: boolean,
  dev: boolean,
  verbose: boolean,
): Promise<string | undefined> {
  if (noGit || dev) {
    return undefined;
  }

  // Hard-code certain project names as never causing a Git repository to be initialized.
  if (projectName.startsWith("test") || projectName === "foo") {
    return undefined;
  }

  // We do not need to prompt the user if they do not have Git installed.
  if (!commandExists.sync("git")) {
    console.log(
      'Git does not seem to be installed. (The "git" command is not in the path.) Skipping Git-related things.',
    );
    return undefined;
  }

  validateNewGitVersion(verbose);

  const gitHubUsername = getGitHubUsername(verbose);
  if (gitHubUsername !== undefined) {
    const { exitStatus } = execShell(
      "gh",
      ["repo", "view", projectName],
      verbose,
      true,
    );
    const gitHubRepoExists = exitStatus === 0;
    const url = `https://github.com/${gitHubUsername}/${projectName}`;

    if (gitHubRepoExists) {
      console.log(
        `Detected an existing GitHub repository at: ${chalk.green(url)}`,
      );
      const guessedRemoteURL = getGitRemoteURL(projectName, gitHubUsername);

      if (yes) {
        console.log(
          `Using a Git remote URL of: ${chalk.green(guessedRemoteURL)}`,
        );
        return guessedRemoteURL;
      }

      const shouldUseGuessedURL = await getInputYesNo(
        `Do you want to use a Git remote URL of: ${chalk.green(
          guessedRemoteURL,
        )}`,
      );
      if (shouldUseGuessedURL) {
        return guessedRemoteURL;
      }

      // Assume that since they do not want to connect this project to the existing GitHub
      // repository, they do not want to initialize a remote Git URL at all.
      return undefined;
    }

    if (yes) {
      execShell("gh", ["repo", "create", projectName, "--public"]);
      console.log(`Created a new GitHub repository at: ${chalk.green(url)}`);
      return getGitRemoteURL(projectName, gitHubUsername);
    }

    const createNewGitHubRepo = await getInputYesNo(
      `Would you like to create a new GitHub repository at: ${chalk.green(
        url,
      )}`,
    );
    if (createNewGitHubRepo) {
      execShell("gh", ["repo", "create", projectName, "--public"]);
      console.log("Successfully created a new GitHub repository.");
      return getGitRemoteURL(projectName, gitHubUsername);
    }

    // Assume that since they do not want to create a new GitHub repository, they do not want to
    // initialize a remote Git URL at all.
    return undefined;
  }

  const gitRemoteURL =
    await getInputString(`Paste in the remote Git URL for your project.
For example, if you have an SSH key, it would be something like:
${chalk.green("git@github.com:Alice/green-candle.git")}
If you don't have an SSH key, it would be something like:
${chalk.green("https://github.com/Alice/green-candle.git")}
If you don't want to initialize a Git repository for this project, press enter to skip.
`);

  return gitRemoteURL === "" ? undefined : gitRemoteURL;
}

function validateNewGitVersion(verbose: boolean) {
  const { stdout } = execShellString("git --version", verbose);

  const outputPrefix = "git version ";
  if (!stdout.startsWith(outputPrefix)) {
    error(
      `Failed to parse the output from the "git --version" command: ${stdout}`,
    );
  }

  const gitVersion = stdout.slice(outputPrefix.length);
  const semanticVersion = parseSemanticVersion(gitVersion);
  if (semanticVersion === undefined) {
    error(`Failed to parse the Git version: ${gitVersion}`);
  }

  const { majorVersion, minorVersion } = semanticVersion;
  if (
    majorVersion >= REQUIRED_GIT_MAJOR_VERSION &&
    minorVersion >= REQUIRED_GIT_MINOR_VERSION
  ) {
    return;
  }

  console.error(`Your Git version is: ${chalk.red(gitVersion)}`);
  console.error(
    `${PROJECT_NAME} requires a Git version of ${chalk.red(
      `${REQUIRED_GIT_MAJOR_VERSION}.${REQUIRED_GIT_MINOR_VERSION}.0`,
    )} or greater.`,
  );
  console.error(
    `Please upgrade your version of Git before using ${PROJECT_NAME}.`,
  );
  process.exit(1);
}

export function getGitHubUsername(verbose: boolean): string | undefined {
  // If the GitHub CLI is installed, we can derive the user's GitHub username.
  if (!commandExists.sync("gh")) {
    return undefined;
  }

  const githubCLIHostsPath = getGithubCLIHostsPath();
  if (githubCLIHostsPath === undefined) {
    return undefined;
  }

  if (!fileExists(githubCLIHostsPath, verbose)) {
    return undefined;
  }

  const configYAMLRaw = readFile(githubCLIHostsPath, verbose);
  const configYAML = yaml.parse(configYAMLRaw) as GitHubCLIHostsYAML;

  const githubCom = configYAML["github.com"];
  if (githubCom === undefined) {
    return undefined;
  }

  const { user } = githubCom;
  if (user === undefined || user === "") {
    return undefined;
  }

  return user;
}

function getGithubCLIHostsPath(): string | undefined {
  if (process.platform === "win32") {
    const appData = process.env["APPDATA"];
    if (appData === undefined || appData === "") {
      return undefined;
    }

    return path.join(appData, "GitHub CLI", "hosts.yml");
  }

  // The location is the same on both macOS and Linux.
  return path.join(HOME_DIR, ".config", "gh", "hosts.yml");
}

function getGitRemoteURL(projectName: string, gitHubUsername: string) {
  return `git@github.com:${gitHubUsername}/${projectName}.git`;
}

export function initGitRepository(
  projectPath: string,
  gitRemoteURL: string | undefined,
  verbose: boolean,
): void {
  if (!commandExists.sync("git")) {
    return;
  }

  if (gitRemoteURL === undefined) {
    return;
  }

  execShellString(
    "git init --initial-branch=main",
    verbose,
    false,
    projectPath,
  );

  if (isGitNameAndEmailConfigured(verbose)) {
    execShellString("git add --all", verbose, false, projectPath);
    const version = getVersionOfThisPackage(verbose);
    const commitMessage = `chore: add files from ${PROJECT_NAME} ${version} template`;
    execShell(
      "git",
      ["commit", "--message", commitMessage],
      verbose,
      false,
      projectPath,
    );
  }

  execShell(
    "git",
    ["remote", "add", "origin", gitRemoteURL],
    verbose,
    false,
    projectPath,
  );
}

function isGitNameAndEmailConfigured(verbose: boolean) {
  const nameExitStatus = execShellString(
    "git config --global user.name",
    verbose,
    true,
  ).exitStatus;

  const emailExitStatus = execShellString(
    "git config --global user.email",
    verbose,
    true,
  ).exitStatus;

  return nameExitStatus === 0 && emailExitStatus === 0;
}

export function isGitRepository(verbose: boolean): boolean {
  const { exitStatus } = execShellString(
    "git rev-parse --is-inside-work-tree",
    verbose,
    true,
  );
  return exitStatus === 0;
}

export function isGitClean(verbose: boolean): boolean {
  const { stdout } = execShellString("git status --porcelain", verbose);
  return stdout.length === 0;
}

export function gitCommitAllAndPush(message: string, verbose: boolean): void {
  execShellString("git add --all", verbose);
  execShell("git", ["commit", "--message", message], verbose);
  execShellString("git push", verbose);
  console.log(
    `Committed and pushed to the git repository with a message of: ${message}`,
  );
}

export function getReleaseGitCommitMessage(version: string): string {
  return `chore: release ${version}`;
}
