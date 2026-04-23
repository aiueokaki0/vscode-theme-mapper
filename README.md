# Theme Mapper

Theme Mapper is a VS Code extension that deterministically selects a theme from a candidate list based on the current workspace.

## Behavior

- Uses the first workspace folder as the assignment target.
- Resolves a project name from `gitRootName` first, then falls back to `pathname`.
- Builds the candidate pool by filtering installed themes by `autoAssign.candidateMode` (kind filter), then by the `autoAssign.candidateThemes` regex patterns.
- Picks a theme deterministically via `hash(projectName + hashSalt) % candidates.length`.
- Applies `workbench.colorTheme` to workspace settings.
- Writes to the workspace folder settings for single-folder windows, and to the workspace file for saved multi-root workspaces.
- Respects explicit workspace theme choices when `autoAssign.onlyWhenUnset` is enabled, unless the current workspace theme was previously applied by Theme Mapper.

## Commands

- `Theme Mapper: Reapply Theme` — re-runs assignment with current settings. Honors `autoAssign.onlyWhenUnset`.
- `Theme Mapper: Force Reapply Theme` — re-runs assignment and overwrites the workspace theme even when `autoAssign.onlyWhenUnset` would otherwise skip it.

## Configuration

- `autoAssign.enabled` — master switch for automatic assignment.
- `autoAssign.candidateMode` — `all` | `light` | `dark`. Kind filter applied to installed themes before regex matching.
- `autoAssign.candidateThemes` — array of JavaScript `RegExp` source strings that further filter the kind-filtered theme labels. Leave empty to keep every theme selected by `candidateMode`. Use `^` / `$` for exact matches.
- `autoAssign.hashSalt` — optional salt to reshuffle the deterministic mapping without renaming projects.
- `autoAssign.onlyWhenUnset` — when `true` (default), do not overwrite an explicit workspace theme unless it was previously applied by Theme Mapper.
- `autoAssign.nameSource` — priority-ordered list of `gitRootName` / `pathname` used to resolve the project name.
- `autoAssign.pathname` — `folder` (basename) or `directory` (full path) when `pathname` is used as a name source.
- `autoAssign.includePaths` — if non-empty, only apply when the target workspace path is under one of these paths.
- `autoAssign.excludePaths` — skip when the target workspace path is under one of these paths.

`autoAssign.*` settings are intended to live in User settings so the same rules can be reused across workspaces.

## Troubleshooting

- If a theme does not change, check whether the workspace already has an explicit `workbench.colorTheme`.
- If another extension also changes themes, disable its auto-assign behavior to avoid conflicts.
- Use the `Theme Mapper` output channel when you need to inspect apply and skip events.

## Development

- Install dependencies with `bun install`
- Compile with `bun run compile`
- Run tests with `bun run test`
