# Theme Mapper

Theme Mapper は、現在開いているワークスペースに応じて候補リストからテーマを deterministic に選択する VS Code 拡張です。

## 挙動

- 先頭のワークスペースフォルダを判定対象として使います。
- プロジェクト名はまず `gitRootName` から解決し、失敗した場合は `pathname` に fallback します。
- `workbench.colorTheme` は workspace 設定に適用します。
- 単一フォルダではワークスペースフォルダ設定に、保存済みマルチルートでは workspace ファイルに書き込みます。
- `autoAssign.onlyWhenUnset` が有効な場合、現在の Workspace テーマが Theme Mapper によって以前適用されたものでない限り、明示的な Workspace テーマ設定を尊重します。

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

`autoAssign.*` の設定は、複数ワークスペースで同じルールを使い回せるように User 設定へ置く想定です。

## トラブルシュート

- テーマが変わらない場合は、その workspace に明示的な `workbench.colorTheme` が入っていないか確認してください。
- 他の拡張もテーマを変更している場合は、その拡張の自動テーマ変更機能を無効化してください。
- 適用やスキップの理由を見たい場合は `Theme Mapper` の Output Channel を確認してください。

## 開発

- 依存のインストール: `bun install`
- コンパイル: `bun run compile`
- テスト実行: `bun run test`
