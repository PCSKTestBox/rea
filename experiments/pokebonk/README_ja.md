# PokéBonk × REA：Windows解析手順

## 現在の状態

- PCSKTestBox/rea に解析用ブランチ analysis/pokebonk-rea-bootstrap を用意。
- Windowsの起動用スクリプトと受動解析用スクリプトを配置。
- **ユーザーのWindows PCへのインストール、REA実行、実サイトの動作解析はまだ行っていません。**
- このPull RequestはDraftで、main への変更やGitHub Actionsでの自動実行はありません。

## 前提条件

1. Windows 11とGoogle Chrome。
2. Node.jsの対応版（推奨24.11以上の24.x系／22系は22.19以上／26系以降も対応）。
3. PowerShell。管理者権限は通常不要。
4. PokéBonkをログインしない状態で調査。利用規約 https://pokebonk.com/legal に従い、チート・ゲーム改変・自動プレイ・サーバー通信改変は行いません。

## 1. REA CLIをインストール

公式配布元のnpmパッケージを利用します。**GitHubにForkしただけではREAは起動しません。** PowerShellで：

~~~powershell
node --version
npm --version
npm view rea-agents version
npm install --global rea-agents
rea --version
~~~

Node.jsがなければ https://nodejs.org/ から対応版をインストールしてください。すでに古いNode.jsがある場合は更新後、新しいPowerShellを開きます。

## 2. 専用ブラウザーを起動

このディレクトリのスクリプトを確認した上でPowerShellから実行します。

~~~powershell
powershell -ExecutionPolicy Bypass -File .\Start-PokeBonkREA.ps1
~~~

このスクリプトは通常のChromeと**別プロフィール**で https://pokebonk.com/ を開き、Chrome DevTools Protocol（CDP）を 127.0.0.1:9222 のみに公開します。その後REAの list-browser-targets でページの target ID を表示します。

- このプロフィールでログインしないでください。
- 9222番ポートを外部公開・転送しないでください。
- Chromeの標準パス以外を使用している場合、スクリプト内の候補パスを調整してください。

## 3. 受動解析を実行

画面に表示された https://pokebonk.com/ の target ID に置き換えて実行します。

~~~powershell
powershell -ExecutionPolicy Bypass -File .\Capture-PokeBonkREA.ps1 -TargetId 'ここにID'
~~~

スクリプトは順番に次を実行します。

- rea inspect-web-page：ページ構造・スクリプト・ネットワーク形状などを観測
- rea analyze-web-bundle：JavaScriptバンドルから構造・ライブラリ候補などを解析
- rea export-web-scripts：観測済みJavaScriptを**PC内にのみ**書き出し
- rea analyze-javascript-application：書き出したJavaScriptを静的解析

結果はPC上の %USERPROFILE%\PCSKTestBox\pokebonk-rea\captures に保存し、**公開GitHubへアップロードしません**。ゲーム素材やソースコードの権利、アカウント情報などに注意してください。

初期通信を調べたい場合、ブラウザーを表示した状態で下記を実行し、10秒以内に**手動で**F5を押してください。

~~~powershell
rea observe-web-session http://127.0.0.1:9222 対象ID --observation-ms 10000 --json
~~~

REAの受動CDP観測は、接続前に発生した通信を遡って収集できません。失敗時には元のエラーを保存し、観測できなかった項目を「不明」と明記します。

## 4. 徹底解析の順番

| フェーズ | 調査内容 | 成果物 |
|---|---|---|
| A | 稼働環境・URL・リダイレクト・対象ID | 環境再現手順 |
| B | スクリプト・DOM・WebGL・ワーカー・ライブラリ | 技術構成図 |
| C | アセット・音声・3D・外部ライセンス | 素材と取得元の一覧 |
| D | 手動プレイ中の選択・戦闘・成長・進化・ゲームオーバー | 状態遷移図 |
| E | 静的コードと実行結果の照合 | 敵AI・ダメージ・描画ロジックの根拠付き説明 |
| F | ストレージ・API経路・通信種別 | クライアント/サーバーの責任分界 |
| G | 未解明部分・制約・証拠IDの整理 | 最終レポート |

観測できていない内部処理を推測だけで「特定した」とは報告しません。

## 5. 本体Forkを動かす場合

上記は公式npm配布版を動かす最短手順です。Fork版のソースそのものを実行したい場合は、別途 PCSKTestBox/rea を git clone し、package.json の手順に従って依存関係のインストールとビルドを行います。**npm版とFork版のバージョンが同一とは限りません。**

参考： [REAのブラウザー観測](../../docs/browser-observation.md) / [JavaScript書き出し](../../docs/website-script-export.md) / [インストール](../../docs/installation.md)。
