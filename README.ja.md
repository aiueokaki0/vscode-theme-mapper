# Theme Mapper

Theme Mapper は、現在開いているワークスペースに応じて候補リストからテーマを deterministic に選択する VS Code 拡張です。

## 挙動

- 先頭のワークスペースフォルダを判定対象として使います。
- プロジェクト名はまず `gitRootName` から解決し、失敗した場合は `pathname` に fallback します。
- `workbench.colorTheme` は User スコープに適用します。
- `autoAssign.onlyWhenUnset` が有効な場合、現在の User テーマが Theme Mapper によって以前適用されたものでない限り、明示的なワークスペース設定やユーザー設定を尊重します。

## コマンド

- `Theme Mapper: Reapply Theme`
- `Theme Mapper: Force Reapply Theme`

## 設定

- `autoAssign.enabled`
- `autoAssign.candidateThemes`
- `autoAssign.hashSalt`
- `autoAssign.onlyWhenUnset`
- `autoAssign.nameSource`
- `autoAssign.pathname`
- `autoAssign.includePaths`
- `autoAssign.excludePaths`

## 開発

- 依存のインストール: `bun install`
- コンパイル: `bun run compile`
- テスト実行: `bun run test`
