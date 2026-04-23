import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";
import {
  type AssignmentDetails,
  type ExtensionConfig,
  normalizeConfig,
  resolveNameFromSources,
  selectTheme,
  isPathAllowed
} from "./themeMapper";

const execFileAsync = promisify(execFile);
const MANAGED_THEME_STATE_KEY = "themeMapper.managedTheme";
const LAST_APPLIED_STATE_KEY = "themeMapper.lastApplied";

interface ManagedThemeState {
  theme: string;
}

interface LastAppliedState {
  resolvedName: string;
  resolvedSource: string;
  theme: string;
  workspacePath: string;
}

type ApplyReason = "startup" | "workspaceFoldersChanged" | "configurationChanged" | "command" | "forcedCommand";

interface ThemeInspection {
  key: string;
  defaultValue?: string;
  globalValue?: string;
  workspaceValue?: string;
  workspaceFolderValue?: string;
}

let isApplyingTheme = false;

export function activate(context: vscode.ExtensionContext): void {
  const applyTheme = async (reason: ApplyReason, force = false): Promise<void> => {
    if (isApplyingTheme) {
      return;
    }

    try {
      isApplyingTheme = true;
      await applyMappedTheme(context, reason, force);
    } catch (error) {
      console.error("[theme-mapper] Failed to apply theme.", error);
    } finally {
      isApplyingTheme = false;
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("themeMapper.reapplyTheme", async () => {
      await applyTheme("command", false);
    }),
    vscode.commands.registerCommand("themeMapper.forceReapplyTheme", async () => {
      await applyTheme("forcedCommand", true);
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await applyTheme("workspaceFoldersChanged", false);
    }),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (
        event.affectsConfiguration("autoAssign") ||
        event.affectsConfiguration("workbench.colorTheme")
      ) {
        await applyTheme("configurationChanged", false);
      }
    })
  );

  void applyTheme("startup", false);
}

export function deactivate(): void {
  // No-op.
}

async function applyMappedTheme(
  context: vscode.ExtensionContext,
  reason: ApplyReason,
  force: boolean
): Promise<void> {
  const config = loadConfig();
  if (!config.enabled) {
    return;
  }

  const targetFolder = getPrimaryWorkspaceFolder();
  if (!targetFolder) {
    return;
  }

  const workspacePath = targetFolder.uri.fsPath;
  if (!isPathAllowed(workspacePath, config.includePaths, config.excludePaths)) {
    return;
  }

  const assignment = await resolveAssignment(config, workspacePath);
  if (!assignment) {
    return;
  }

  const currentTheme = getThemeInspection();
  if (!force && shouldSkipForExplicitTheme(context, currentTheme, workspacePath, config.onlyWhenUnset)) {
    return;
  }

  await updateThemeSetting(assignment.theme);
  await context.globalState.update(MANAGED_THEME_STATE_KEY, {
    theme: assignment.theme
  } satisfies ManagedThemeState);
  await context.globalState.update(LAST_APPLIED_STATE_KEY, {
    resolvedName: assignment.name,
    resolvedSource: assignment.source,
    theme: assignment.theme,
    workspacePath
  } satisfies LastAppliedState);

  if (reason === "command" || reason === "forcedCommand") {
    void vscode.window.setStatusBarMessage(
      `Theme Mapper applied "${assignment.theme}" from ${assignment.source}`,
      3000
    );
  }
}

async function resolveAssignment(
  config: ExtensionConfig,
  workspacePath: string
): Promise<(AssignmentDetails & { source: string }) | undefined> {
  const gitRootPath = await tryResolveGitRoot(workspacePath);
  const resolvedName = resolveNameFromSources(config.nameSource, config.pathname, workspacePath, gitRootPath);
  if (!resolvedName) {
    return undefined;
  }

  const assignment = selectTheme(resolvedName.value, config.candidateThemes, config.hashSalt);
  if (!assignment) {
    return undefined;
  }

  return {
    ...assignment,
    source: resolvedName.source
  };
}

function loadConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration();
  return normalizeConfig({
    enabled: config.get<boolean>("autoAssign.enabled"),
    candidateThemes: config.get<string[]>("autoAssign.candidateThemes"),
    hashSalt: config.get<string>("autoAssign.hashSalt"),
    onlyWhenUnset: config.get<boolean>("autoAssign.onlyWhenUnset"),
    nameSource: config.get<ExtensionConfig["nameSource"]>("autoAssign.nameSource"),
    pathname: config.get<ExtensionConfig["pathname"]>("autoAssign.pathname"),
    includePaths: config.get<string[]>("autoAssign.includePaths"),
    excludePaths: config.get<string[]>("autoAssign.excludePaths")
  });
}

function getPrimaryWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }

  return folders[0];
}

function getThemeInspection(): ThemeInspection | undefined {
  return vscode.workspace.getConfiguration("workbench").inspect<string>("colorTheme");
}

function shouldSkipForExplicitTheme(
  context: vscode.ExtensionContext,
  inspection: ThemeInspection | undefined,
  workspacePath: string,
  onlyWhenUnset: boolean
): boolean {
  if (!onlyWhenUnset) {
    return false;
  }

  if (!inspection) {
    return false;
  }

  if (inspection.workspaceFolderValue !== undefined || inspection.workspaceValue !== undefined) {
    return true;
  }

  if (inspection.globalValue === undefined) {
    return false;
  }

  const managed = context.globalState.get<ManagedThemeState>(MANAGED_THEME_STATE_KEY);
  if (!managed) {
    return true;
  }

  return !(
    managed.theme === inspection.globalValue
  );
}

async function updateThemeSetting(themeName: string): Promise<void> {
  await vscode.workspace
    .getConfiguration("workbench")
    .update("colorTheme", themeName, vscode.ConfigurationTarget.Global);
}

async function tryResolveGitRoot(workspacePath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", workspacePath, "rev-parse", "--show-toplevel"], {
      cwd: workspacePath
    });
    const resolved = stdout.trim();
    return resolved.length > 0 ? path.resolve(resolved) : undefined;
  } catch {
    return undefined;
  }
}
