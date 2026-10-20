# スマホ・PC共通の実験室（GitHub Pages）と非公開研究データの分離

## 公開する内容

- 公開場所は `PCSKTestBox/rea` の GitHub Pages、想定URLは `https://pcsktestbox.github.io/rea/`。
- Pagesデプロイワークフロー：`.github/workflows/pokebonk-lab-pages.yml`。
- **デプロイするのは `index.html`（独自実装の仮シミュレーター）と `.nojekyll` だけ**。
- HTMLはローカルのブラウザー内だけで計算する。外部への送信やリポジトリAPIへのアクセスを行わない。
- 実サイトの解析素材、スクリプト取得結果、プレイデータ、内部調査資料はサイトに含まれない。
- 公開サイトは誰でも閲覧可能。リンクを知っている人だけに限定されるものではない。

## 非公開にすべき内容

敵AI・経験値・ダメージ式に関する詳細レビュー、許可された範囲での検証用データ、研究メモは**別のPrivateリポジトリ**に保存する。公開画面に載せるのは、自分たちで作った模擬ロジックや公開許諾を確認した集計・パラメーターだけ。

**現状：公開REAsignal調査の生JSはGitHub-hostedランナー上の一時領域で破棄されており、Privateリポジトリへの保存・自動連携は未実装。** GitHub Pagesの導入だけではPrivate結果は保存されない。Private保存先とGitHub Actionsの権限（専用GitHub App等）を後から安全に設定する必要がある。PublicワークフローにPrivateリポジトリのトークンやデータを埋め込まない。

## GitHub Pages 初回セットアップ（GitHub接続から変更できない設定）

ワークフローを`main`にマージした後に、オーナー権限で**一度だけ**行う：

1. `https://github.com/PCSKTestBox/rea/settings/pages` を開く。
2. **Build and deployment → Source** を **GitHub Actions** にする（Deploy from a branchではありません）。
3. GitHubの **Actions → Publish PokéBonk independent balance lab (public site) → Run workflow** を選んで実行する。
4. Deployジョブが成功してから `https://pcsktestbox.github.io/rea/` をスマホのSafari / Chromeで開く。

組織のPages公開が禁止されていると、組織のオーナーによる「Pages creation」の公開許可が必要となる可能性があります。

## 操作

スライダーで敵速度・出現頻度・必要経験値を変え、「比較を実行」ボタンを押します。実ゲームの正しい計算式や実測結果ではなく、**独立した仮モデルのA/B比較**です。PCでもスマホでも同じ公開URLを開く運用にします。

参照：[GitHub Docs — Pagesの公開ソース設定](https://docs.github.com/ja/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
