# Theme Mapper

Theme Mapper is a VS Code extension that deterministically selects a theme from a candidate list based on the current workspace.

## Behavior

- Uses the first workspace folder as the assignment target.
- Resolves a project name from `gitRootName` first, then falls back to `pathname`.
- Applies `workbench.colorTheme` to workspace settings.
- Writes to the workspace folder settings for single-folder windows, and to the workspace file for saved multi-root workspaces.
- Respects explicit workspace theme choices when `autoAssign.onlyWhenUnset` is enabled, unless the current workspace theme was previously applied by Theme Mapper.

## Commands

- `Theme Mapper: Reapply Theme`
- `Theme Mapper: Force Reapply Theme`

## Configuration

- `autoAssign.enabled`
- `autoAssign.candidateThemes`
- `autoAssign.hashSalt`
- `autoAssign.onlyWhenUnset`
- `autoAssign.nameSource`
- `autoAssign.pathname`
- `autoAssign.includePaths`
- `autoAssign.excludePaths`

`autoAssign.*` settings are intended to live in User settings so the same rules can be reused across workspaces.

## Troubleshooting

- If a theme does not change, check whether the workspace already has an explicit `workbench.colorTheme`.
- If another extension also changes themes, disable its auto-assign behavior to avoid conflicts.
- Use the `Theme Mapper` output channel when you need to inspect apply and skip events.

## Development

- Install dependencies with `bun install`
- Compile with `bun run compile`
- Run tests with `bun run test`
