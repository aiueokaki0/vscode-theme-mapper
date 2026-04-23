import test from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import {
  DEFAULT_CANDIDATE_THEMES,
  isPathAllowed,
  normalizeConfig,
  resolveCandidates,
  resolveNameFromSources,
  selectTheme,
  stableHash,
  type InstalledTheme
} from "../themeMapper";

test("normalizeConfig falls back to defaults", () => {
  const config = normalizeConfig({});

  assert.equal(config.enabled, true);
  assert.equal(config.candidateMode, "all");
  assert.deepEqual(config.candidateThemes, [...DEFAULT_CANDIDATE_THEMES]);
  assert.deepEqual(config.nameSource, ["gitRootName", "pathname"]);
  assert.equal(config.pathname, "folder");
});

test("normalizeConfig preserves an explicitly empty candidate list", () => {
  const config = normalizeConfig({
    candidateThemes: []
  });

  assert.deepEqual(config.candidateThemes, []);
});

test("normalizeConfig accepts valid candidateMode values and falls back on invalid", () => {
  for (const mode of ["all", "light", "dark"] as const) {
    assert.equal(normalizeConfig({ candidateMode: mode }).candidateMode, mode);
  }

  // @ts-expect-error testing invalid runtime input
  assert.equal(normalizeConfig({ candidateMode: "bogus" }).candidateMode, "all");
});

const INSTALLED_THEMES: InstalledTheme[] = [
  { label: "Light Modern", uiTheme: "vs" },
  { label: "Light+", uiTheme: "vs" },
  { label: "Dark Modern", uiTheme: "vs-dark" },
  { label: "Dark+", uiTheme: "vs-dark" },
  { label: "HC Light", uiTheme: "hc-light" },
  { label: "HC Dark", uiTheme: "hc-black" }
];

test("resolveCandidates returns every installed theme for mode=all", () => {
  assert.deepEqual(resolveCandidates("all", [], INSTALLED_THEMES), [
    "Light Modern",
    "Light+",
    "Dark Modern",
    "Dark+",
    "HC Light",
    "HC Dark"
  ]);
});

test("resolveCandidates filters to pure light themes and excludes HC", () => {
  assert.deepEqual(resolveCandidates("light", [], INSTALLED_THEMES), ["Light Modern", "Light+"]);
});

test("resolveCandidates filters to pure dark themes and excludes HC", () => {
  assert.deepEqual(resolveCandidates("dark", [], INSTALLED_THEMES), ["Dark Modern", "Dark+"]);
});

test("resolveCandidates applies regex patterns on top of kind filter", () => {
  const withNoctis: InstalledTheme[] = [
    ...INSTALLED_THEMES,
    { label: "Noctis Lux", uiTheme: "vs" },
    { label: "Noctis", uiTheme: "vs-dark" }
  ];

  assert.deepEqual(resolveCandidates("light", ["^Noctis"], withNoctis), ["Noctis Lux"]);
  assert.deepEqual(resolveCandidates("dark", ["^Noctis"], withNoctis), ["Noctis"]);
  assert.deepEqual(resolveCandidates("all", ["^Noctis"], withNoctis), ["Noctis Lux", "Noctis"]);
});

test("resolveCandidates supports multiple regex patterns (OR)", () => {
  assert.deepEqual(
    resolveCandidates("all", ["^Light Modern$", "^Dark\\+$"], INSTALLED_THEMES),
    ["Light Modern", "Dark+"]
  );
});

test("resolveCandidates returns empty when patterns match nothing", () => {
  assert.deepEqual(resolveCandidates("all", ["^nonexistent$"], INSTALLED_THEMES), []);
});

test("resolveCandidates skips invalid regex patterns", () => {
  assert.deepEqual(
    resolveCandidates("all", ["[unclosed", "^Light Modern$"], INSTALLED_THEMES),
    ["Light Modern"]
  );
});

test("git root name is preferred when available", () => {
  const resolved = resolveNameFromSources(
    ["gitRootName", "pathname"],
    "folder",
    "/Users/example/work/project-a",
    "/Users/example/src/repo-root"
  );

  assert.deepEqual(resolved, {
    value: "repo-root",
    source: "gitRootName"
  });
});

test("pathname folder fallback uses basename", () => {
  const resolved = resolveNameFromSources(
    ["gitRootName", "pathname"],
    "folder",
    "/Users/example/work/project-a"
  );

  assert.deepEqual(resolved, {
    value: "project-a",
    source: "pathname"
  });
});

test("pathname directory mode uses full path", () => {
  const target = path.resolve("/Users/example/work/project-a");
  const resolved = resolveNameFromSources(["pathname"], "directory", target);

  assert.deepEqual(resolved, {
    value: target,
    source: "pathname"
  });
});

test("stable hash is deterministic", () => {
  assert.equal(stableHash("alpha"), stableHash("alpha"));
  assert.notEqual(stableHash("alpha"), stableHash("beta"));
});

test("theme selection is stable for the same name and salt", () => {
  const themes = ["A", "B", "C"];
  const first = selectTheme("repo-name", themes, "salt");
  const second = selectTheme("repo-name", themes, "salt");

  assert.deepEqual(first, second);
  assert.ok(first);
  assert.ok(second);
  assert.match(first.theme, /^[ABC]$/);
});

test("empty candidates produce no assignment", () => {
  assert.equal(selectTheme("repo-name", [], ""), undefined);
});

test("include and exclude path filters are respected", () => {
  const target = path.resolve("/Users/example/work/repo");

  assert.equal(isPathAllowed(target, ["/Users/example/work"], []), true);
  assert.equal(isPathAllowed(target, ["/Users/example/other"], []), false);
  assert.equal(isPathAllowed(target, [], ["/Users/example/work"]), false);
});
