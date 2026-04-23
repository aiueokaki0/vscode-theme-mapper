# Requirement

## Overview

VS Code で開いているワークスペースごとに、ルールベースで自動的にテーマを切り替える拡張を別リポジトリとして作成する。

この拡張は `noctis-light-plus` 本体とは分離する。初期ユースケースは `Noctis Light` 系テーマの自動切り替えだが、候補テーマはユーザーが自由に変更できるようにする。

## Goal

- リポジトリごとに見た目を安定して変えられること
- 新しく作成したリポジトリにも追加設定なしで自動対応できること
- 候補テーマをユーザー設定で簡単に差し替えられること
- 明示的に固定したワークスペーステーマを勝手に壊さないこと

## Non-Goal

- テーマ自体を提供すること
- 特定テーマ拡張に強く依存すること
- 高度なプロジェクト分類や言語判定を行うこと
- チーム共有前提で `.vscode/settings.json` を必ず書き換えること

## Primary Use Case

- ユーザーが任意のフォルダを VS Code で開く
- 拡張が開いているワークスペースからプロジェクト名またはリポジトリ名を決定する
- その名前をハッシュ化し、候補テーマ配列の長さで `mod` を取る
- 決まった index のテーマを自動適用する
- 同じプロジェクトは毎回同じテーマになる

## Functional Requirements

### 1. Automatic Theme Assignment

- VS Code でワークスペースを開いたときに自動でテーマ判定を行う
- ワークスペースの切り替えやフォルダ変更時にも再評価できる
- 手動再適用コマンドを提供する

### 2. Project Name Resolution

- `workspaceRoot` の指定を必須にしない
- デフォルトでは、今開いているフォルダまたは Git ルートからプロジェクト名を解決する
- 可能なら Git ルート名を優先し、取得できない場合は開いているフォルダ名を使う
- どこにあるフォルダを開いても動作可能にする

### 3. Deterministic Mapping

- プロジェクト名を入力にした deterministic なハッシュを使う
- `hash(projectName + salt) % candidateThemes.length` のような方式でテーマを決定する
- 同じ入力に対して毎回同じテーマを返す

### 4. User-Editable Theme Candidates

- 候補テーマ一覧はユーザー設定で変更可能にする
- 初期値は `Noctis Light` 系の候補セットを想定する
- 実装上は任意のインストール済みテーマ名の配列を受け付ける
- 候補が 0 件のときは何もしない

### 5. Respect Existing Explicit Settings

- 既にワークスペースで `workbench.colorTheme` が明示設定されている場合は、既定では上書きしない
- 必要なら強制再適用コマンドで上書きできる設計を検討する

## Configuration Requirements

以下のような設定項目を持てること。

- `autoAssign.enabled`
  自動切り替えの有効/無効
- `autoAssign.candidateThemes`
  候補テーマ文字列の配列
- `autoAssign.hashSalt`
  割り当てを再シャッフルするための任意文字列
- `autoAssign.onlyWhenUnset`
  既存のワークスペーステーマ設定がある場合は上書きしない

以下は optional とする。

- `autoAssign.nameSource`
  `gitRootName` / `folderName` のような解決方法切り替え
- `autoAssign.includePaths`
  特定パス配下でのみ有効化したい場合の絞り込み
- `autoAssign.excludePaths`
  特定パス配下では無効化したい場合の除外

## Behavior Requirements

- 適用対象外のワークスペースでは何もしない
- 候補テーマ配列が空なら何もしない
- 単一フォルダワークスペースで自然に動作する
- マルチルートワークスペースでは、どのフォルダを基準にするか明確なルールを持つ
- テーマ適用に失敗してもエディタ利用を阻害しない

## UX Requirements

- 初期設定なしでもある程度自然に動くこと
- 設定名が直感的であること
- 手動で再適用できるコマンドがあること
- なぜそのテーマが選ばれたかを説明しやすいルールであること

## Technical Design Considerations

### A. Theme Persistence Strategy

以下のどちらでテーマを反映するかを設計判断する必要がある。

- `.vscode/settings.json` に `workbench.colorTheme` を保存する
- VS Code API を通じて設定を更新する

検討観点:

- リポジトリを汚すかどうか
- 複数ウィンドウ利用時の整合性
- ユーザーが手動設定したテーマとの共存
- 拡張停止時やアンインストール時の影響

### B. Name Resolution Strategy

候補:

- 開いているフォルダ名をそのまま使う
- Git ルート名を使う

検討観点:

- monorepo をサブフォルダで開いた場合の扱い
- Git 管理されていないフォルダへの適用
- 同名フォルダが別パスに存在する場合の衝突

## Open Questions

- マルチルートワークスペースでは先頭フォルダを使うか、個別に扱うか
- Git ルート探索に失敗した場合の fallback をどこまで許容するか
- 明示設定がある場合の強制上書き UX をどうするか
- テーマが未インストールだった場合にどう扱うか
- 設定の保存先を workspace にするか user にするか

## Suggested Initial Scope

最初のバージョンでは以下に絞る。

- 単一フォルダワークスペースを主対象とする
- `gitRootName` を優先し、失敗時は `folderName` を使う
- `candidateThemes` と `hashSalt` を設定可能にする
- `onlyWhenUnset` を既定で有効にする
- 手動再適用コマンドを 1 つ提供する

## Success Criteria

- 異なるプロジェクトを開くと安定して異なるテーマが選ばれる
- 同じプロジェクトでは毎回同じテーマが選ばれる
- 新しいプロジェクトを作って開いても追加設定なしでテーマが決まる
- 候補テーマ配列を変更すると割り当て結果がその配列に従って変わる
- 明示的に設定したワークスペーステーマは既定動作で壊れない
