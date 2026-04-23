# Theme Mapper

Theme Mapper は、現在開いているワークスペースに応じて候補リストからテーマを deterministic に選択する VS Code 拡張です。

## 挙動

- 先頭のワークスペースフォルダを判定対象として使います。
- プロジェクト名はまず `gitRootName` から解決し、失敗した場合は `pathname` に fallback します。
- 候補プールは、まず `autoAssign.candidateMode` でインストール済みテーマを種別フィルタし、その結果に対して `autoAssign.candidateThemes` の正規表現でさらに絞り込みます。
- `hash(projectName + hashSalt) % candidates.length` で deterministic にテーマを決定します。
- `workbench.colorTheme` は workspace 設定に適用します。
- 単一フォルダではワークスペースフォルダ設定に、保存済みマルチルートでは workspace ファイルに書き込みます。
- `autoAssign.onlyWhenUnset` が有効な場合、現在の Workspace テーマが Theme Mapper によって以前適用されたものでない限り、明示的な Workspace テーマ設定を尊重します。

## コマンド

- `Theme Mapper: Reapply Theme` — 現在の設定で再割り当てを実行します。`autoAssign.onlyWhenUnset` を尊重します。
- `Theme Mapper: Force Reapply Theme` — 再割り当てを実行し、`autoAssign.onlyWhenUnset` によって通常はスキップされる場合でも Workspace テーマを上書きします。

## 設定

- `autoAssign.enabled` — 自動割り当ての有効/無効。
- `autoAssign.candidateMode` — `all` | `light` | `dark`。正規表現マッチングの前にインストール済みテーマへ適用する種別フィルタ。
- `autoAssign.candidateThemes` — 種別フィルタ後のテーマラベルをさらに絞り込む JavaScript `RegExp` ソース文字列の配列。空にすると `candidateMode` で選ばれた全テーマが候補になります。完全一致させたい場合は `^` と `$` でアンカーしてください。
- `autoAssign.hashSalt` — プロジェクト名を変えずに deterministic な割り当てをシャッフルしたい場合に使う任意文字列。
- `autoAssign.onlyWhenUnset` — `true`（既定）のとき、明示的な Workspace テーマ設定は Theme Mapper が以前適用したものでない限り上書きしません。
- `autoAssign.nameSource` — プロジェクト名解決に使う `gitRootName` / `pathname` を優先度順に並べた配列。
- `autoAssign.pathname` — `pathname` を name source に使うときの解決方法。`folder`（basename）または `directory`（フルパス）。
- `autoAssign.includePaths` — 空でない場合、ターゲットのワークスペースパスがいずれかの配下にあるときだけ適用します。
- `autoAssign.excludePaths` — ターゲットのワークスペースパスがいずれかの配下にある場合はスキップします。

`autoAssign.*` の設定は、複数ワークスペースで同じルールを使い回せるように User 設定へ置く想定です。

## トラブルシュート

- テーマが変わらない場合は、その workspace に明示的な `workbench.colorTheme` が入っていないか確認してください。
- 他の拡張もテーマを変更している場合は、その拡張の自動テーマ変更機能を無効化してください。
- 適用やスキップの理由を見たい場合は `Theme Mapper` の Output Channel を確認してください。

## 開発

- 依存のインストール: `bun install`
- コンパイル: `bun run compile`
- テスト実行: `bun run test`
