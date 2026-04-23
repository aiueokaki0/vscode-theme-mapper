# Theme Mapper

Theme Mapper is a VS Code extension that deterministically selects a theme from a candidate list based on the current workspace.

## Behavior

- Uses the first workspace folder as the assignment target.
- Resolves a project name from `gitRootName` first, then falls back to `pathname`.
- Applies `workbench.colorTheme` at the User scope.
- Respects explicit workspace or user choices when `autoAssign.onlyWhenUnset` is enabled, unless the current user theme was previously applied by Theme Mapper.

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

## Development

- Install dependencies with `bun install`
- Compile with `bun run compile`
- Run tests with `bun run test`
