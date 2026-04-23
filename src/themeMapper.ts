import * as path from "node:path";

export const DEFAULT_CANDIDATE_THEMES = [
  "Default Light Modern",
  "Default Dark Modern",
  "Default High Contrast Light",
  "Default High Contrast"
] as const;

export type NameSource = "gitRootName" | "pathname";
export type PathnameMode = "folder" | "directory";

export interface ExtensionConfig {
  enabled: boolean;
  candidateThemes: string[];
  hashSalt: string;
  onlyWhenUnset: boolean;
  nameSource: NameSource[];
  pathname: PathnameMode;
  includePaths: string[];
  excludePaths: string[];
}

export interface ResolvedName {
  value: string;
  source: NameSource;
}

export interface AssignmentDetails {
  name: string;
  theme: string;
  index: number;
  hash: number;
}

export function normalizeConfig(input: Partial<ExtensionConfig>): ExtensionConfig {
  const nameSource = Array.isArray(input.nameSource)
    ? input.nameSource.filter(isNameSource)
    : [];

  return {
    enabled: input.enabled ?? true,
    candidateThemes: sanitizeStringArray(input.candidateThemes, [...DEFAULT_CANDIDATE_THEMES]),
    hashSalt: input.hashSalt ?? "",
    onlyWhenUnset: input.onlyWhenUnset ?? true,
    nameSource: nameSource.length > 0 ? nameSource : ["gitRootName", "pathname"],
    pathname: input.pathname === "directory" ? "directory" : "folder",
    includePaths: sanitizeStringArray(input.includePaths, []),
    excludePaths: sanitizeStringArray(input.excludePaths, [])
  };
}

export function resolveNameFromSources(
  sources: NameSource[],
  pathnameMode: PathnameMode,
  targetPath: string,
  gitRootPath?: string
): ResolvedName | undefined {
  for (const source of sources) {
    if (source === "gitRootName") {
      if (!gitRootPath) {
        continue;
      }

      const name = path.basename(gitRootPath);
      if (name) {
        return { value: name, source };
      }
    }

    if (source === "pathname") {
      const value = pathnameMode === "directory" ? targetPath : path.basename(targetPath);
      if (value) {
        return { value, source };
      }
    }
  }

  return undefined;
}

export function selectTheme(name: string, candidateThemes: string[], hashSalt: string): AssignmentDetails | undefined {
  const themes = candidateThemes.filter((theme) => theme.trim().length > 0);
  if (themes.length === 0) {
    return undefined;
  }

  const hash = stableHash(`${name}${hashSalt}`);
  const index = hash % themes.length;

  return {
    name,
    theme: themes[index],
    index,
    hash
  };
}

export function stableHash(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

export function isPathAllowed(targetPath: string, includePaths: string[], excludePaths: string[]): boolean {
  const normalizedTarget = normalizeFsPath(targetPath);
  const normalizedIncludes = includePaths.map(normalizeFsPath).filter(Boolean);
  const normalizedExcludes = excludePaths.map(normalizeFsPath).filter(Boolean);

  if (normalizedIncludes.length > 0 && !normalizedIncludes.some((candidate) => pathContains(candidate, normalizedTarget))) {
    return false;
  }

  if (normalizedExcludes.some((candidate) => pathContains(candidate, normalizedTarget))) {
    return false;
  }

  return true;
}

function sanitizeStringArray(value: string[] | undefined, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const next = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return next.length > 0 || fallback.length === 0 ? next : [...fallback];
}

function isNameSource(value: string): value is NameSource {
  return value === "gitRootName" || value === "pathname";
}

function normalizeFsPath(value: string): string {
  const normalized = path.resolve(value).replace(/[\\/]+$/, "");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function pathContains(basePath: string, targetPath: string): boolean {
  return targetPath === basePath || targetPath.startsWith(`${basePath}${path.sep}`);
}
