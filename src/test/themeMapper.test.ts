import test from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import {
  DEFAULT_CANDIDATE_THEMES,
  isPathAllowed,
  normalizeConfig,
  resolveNameFromSources,
  selectTheme,
  stableHash
} from "../themeMapper";

test("normalizeConfig falls back to defaults", () => {
  const config = normalizeConfig({});

  assert.equal(config.enabled, true);
  assert.deepEqual(config.candidateThemes, [...DEFAULT_CANDIDATE_THEMES]);
  assert.deepEqual(config.nameSource, ["gitRootName", "pathname"]);
  assert.equal(config.pathname, "folder");
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
