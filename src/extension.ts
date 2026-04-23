import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";
import {
  type AssignmentDetails,
  type ExtensionConfig,
  type InstalledTheme,
  type UiTheme,
  normalizeConfig,
  resolveCandidates,
  resolveNameFromSources,
  selectTheme,
  isPathAllowed
} from "./themeMapper";

const execFileAsync = promisify(execFile);
const MANAGED_THEME_STATE_KEY = "themeMapper.managedTheme";
const LAST_APPLIED_STATE_KEY = "themeMapper.lastApplied";
const outputChannel = vscode.window.createOutputChannel("Theme Mapper");

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
  context.subscriptions.push(outputChannel);

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
      if (event.affectsConfiguration("autoAssign")) {
        await applyTheme("configurationChanged", false);
      }

      if (!isApplyingTheme && event.affectsConfiguration("workbench.colorTheme")) {
        await clearManagedThemeState(context);
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
    log(`Skipped apply for ${workspacePath} because the workspace theme is explicitly set.`);
    return;
  }

  const updated = await updateThemeSetting(targetFolder, assignment.theme, force);
  if (!updated) {
    log(`Skipped apply for ${workspacePath} because the multi-root workspace is not saved yet.`);
    return;
  }

  log(
    `Applied "${assignment.theme}" for ${workspacePath} using ${assignment.source}="${assignment.name}" (${reason}).`
  );
  await context.workspaceState.update(MANAGED_THEME_STATE_KEY, {
    theme: assignment.theme
  } satisfies ManagedThemeState);
  await context.workspaceState.update(LAST_APPLIED_STATE_KEY, {
    resolvedName: assignment.name,
    resolvedSource: assignment.source,
    theme: assignment.theme,
    workspacePath
  } satisfies LastAppliedState);

  if (reason === "command" || reason === "forcedCommand") {
    outputChannel.show(true);
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

  const candidates = resolveCandidates(config.candidateMode, config.candidateThemes, getInstalledThemes());
  const assignment = selectTheme(resolvedName.value, candidates, config.hashSalt);
  if (!assignment) {
    return undefined;
  }

  return {
    ...assignment,
    source: resolvedName.source
  };
}

function getInstalledThemes(): InstalledTheme[] {
  const themes: InstalledTheme[] = [];

  for (const extension of vscode.extensions.all) {
    const contributed = extension.packageJSON?.contributes?.themes;
    if (!Array.isArray(contributed)) {
      continue;
    }

    for (const entry of contributed) {
      const label = typeof entry?.label === "string" ? entry.label.trim() : "";
      const uiTheme = entry?.uiTheme;
      if (label.length === 0 || !isUiTheme(uiTheme)) {
        continue;
      }

      themes.push({ label, uiTheme });
    }
  }

  return themes;
}

function isUiTheme(value: unknown): value is UiTheme {
  return value === "vs" || value === "vs-dark" || value === "hc-black" || value === "hc-light";
}

function loadConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration();
  return normalizeConfig({
    enabled: config.get<boolean>("autoAssign.enabled"),
    candidateMode: config.get<ExtensionConfig["candidateMode"]>("autoAssign.candidateMode"),
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
  _workspacePath: string,
  onlyWhenUnset: boolean
): boolean {
  if (!onlyWhenUnset) {
    return false;
  }

  if (!inspection) {
    return false;
  }

  const configuredTheme = inspection.workspaceFolderValue ?? inspection.workspaceValue;
  if (configuredTheme === undefined) {
    return false;
  }

  const managed = context.workspaceState.get<ManagedThemeState>(MANAGED_THEME_STATE_KEY);
  if (!managed) {
    return true;
  }

  return managed.theme !== configuredTheme;
}

async function updateThemeSetting(
  targetFolder: vscode.WorkspaceFolder,
  themeName: string
): Promise<boolean> {
  const configuration = vscode.workspace.getConfiguration("workbench", targetFolder.uri);
  const target = getThemeConfigurationTarget();
  if (!target) {
    return false;
  }

  await configuration.update("colorTheme", themeName, target);
  return true;
}

function getThemeConfigurationTarget(): vscode.ConfigurationTarget | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 1 && !vscode.workspace.workspaceFile) {
    return undefined;
  }

  return vscode.workspace.workspaceFile
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.WorkspaceFolder;
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

function log(message: string): void {
  outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
}

async function clearManagedThemeState(context: vscode.ExtensionContext): Promise<void> {
  await context.workspaceState.update(MANAGED_THEME_STATE_KEY, undefined);
}
