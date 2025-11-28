# 🚀 クイックデプロイガイド（5分で開始）

このガイドでは、最短時間でシステムを本番環境にデプロイする手順を説明します。

---

## 📋 必要なもの

- ✅ GitHubアカウント（リポジトリ: `rasuta1125/AIdashboard`）
- ✅ Cloudflareアカウント（無料）
- ✅ Renderアカウント（無料）
- ✅ Google Gemini APIキー（無料枠あり）

---

## ステップ1: バックエンドのデプロイ（Render） - 所要時間: 5分

### 1-1. Renderにログイン

https://render.com/ にアクセスし、GitHubアカウントで登録/ログイン

### 1-2. Webサービスを作成

1. ダッシュボードで **「New +」** → **「Web Service」** をクリック
2. **「Connect GitHub」** から `rasuta1125/AIdashboard` を選択
3. 以下の設定を入力：

```yaml
Name: real-estate-backend
Root Directory: backend
Environment: Node
Build Command: npm install
Start Command: npm start
```

### 1-3. 環境変数を設定

**「Environment」** タブで以下を追加：

| Key | Value |
|-----|-------|
| `PORT` | `3001` |
| `NODE_ENV` | `production` |
| `GEMINI_API_KEY` | `あなたのAPIキー` ※1 |
| `FRONTEND_URL` | `https://real-estate-dashboard.pages.dev` ※2 |
| `MAX_FILE_SIZE` | `10485760` |

※1: https://makersuite.google.com/app/apikey で取得  
※2: フロントエンドデプロイ後に正しいURLに変更

### 1-4. デプロイ開始

**「Create Web Service」** をクリック → 約5分でデプロイ完了

### 1-5. バックエンドURLをメモ

例: `https://real-estate-backend-xxxx.onrender.com`

---

## ステップ2: フロントエンドのデプロイ（Cloudflare Pages） - 所要時間: 3分

### 2-1. Cloudflareにログイン

https://dash.cloudflare.com/ にアクセスし、ログイン

### 2-2. Pagesプロジェクトを作成

1. 左サイドバーから **「Pages」** を選択
2. **「プロジェクトを作成」** → **「Gitに接続」** をクリック
3. GitHubアカウントで認証
4. リポジトリを選択: `rasuta1125/AIdashboard`

### 2-3. ビルド設定

以下の設定を入力：

```yaml
プロジェクト名: real-estate-dashboard
ブランチ: main
フレームワークプリセット: Vite
ビルドコマンド: npm run build
ビルド出力ディレクトリ: dist
ルートディレクトリ: frontend  ★重要★
```

### 2-4. 環境変数を設定

**「Environment variables」** セクションで追加：

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://real-estate-backend-xxxx.onrender.com` ※ステップ1-5のURL |

### 2-5. デプロイ開始

**「保存してデプロイ」** をクリック → 約3分でデプロイ完了

### 2-6. フロントエンドURLを確認

例: `https://real-estate-dashboard.pages.dev`

---

## ステップ3: CORS設定の更新（重要！） - 所要時間: 1分

### 3-1. Renderに戻る

https://dashboard.render.com/ にアクセス

### 3-2. 環境変数を更新

1. バックエンドサービスを選択
2. **「Environment」** タブを開く
3. `FRONTEND_URL` の値を更新:
   ```
   https://real-estate-dashboard.pages.dev
   ```
   ※ステップ2-6で確認したURLに変更
4. **「Save Changes」** をクリック
5. サービスが自動的に再デプロイされます（約1分）

---

## ステップ4: 動作確認 - 所要時間: 2分

### 4-1. バックエンドAPIの確認

ブラウザで以下にアクセス：

```
https://real-estate-backend-xxxx.onrender.com/health
```

期待される応答：
```json
{
  "status": "healthy",
  "gemini_api": "configured"
}
```

### 4-2. フロントエンドの確認

ブラウザで以下にアクセス：

```
https://real-estate-dashboard.pages.dev
```

ダッシュボードが表示されればOK！

### 4-3. AI機能のテスト

1. **「＋AIで案件作成」** ボタンをクリック
2. PDFファイルをアップロード（テスト用のPDF契約書）
3. AI-OCRが動作し、自動入力されることを確認
4. メール自動生成機能をテスト
5. AIリスク分析機能をテスト

---

## 🎉 デプロイ完了！

おめでとうございます！システムが本番環境で稼働しています。

### 📌 重要なURL（メモしておきましょう）

- **フロントエンド**: https://real-estate-dashboard.pages.dev
- **バックエンドAPI**: https://real-estate-backend-xxxx.onrender.com
- **GitHub**: https://github.com/rasuta1125/AIdashboard

---

## ⚠️ よくある問題と解決策

### 問題1: フロントエンドでAPIエラーが発生

**症状**: 「API connection failed」エラー

**解決策**:
1. Renderのバックエンドサービスが起動しているか確認
2. `VITE_API_BASE_URL` 環境変数が正しいか確認
3. `FRONTEND_URL` 環境変数がフロントエンドのURLと一致しているか確認

### 問題2: AI機能が動作しない

**症状**: AI-OCRやメール生成でエラー

**解決策**:
1. Renderの環境変数で `GEMINI_API_KEY` が正しく設定されているか確認
2. Google AI StudioでAPIキーが有効か確認
3. Renderのログを確認: `https://dashboard.render.com/` → サービス選択 → 「Logs」タブ

### 問題3: Renderサービスが休止状態（無料プラン）

**症状**: 初回アクセスが遅い（約30秒）

**解決策**:
- これは仕様です。無料プランでは15分間アクセスがないとサービスが休止します
- 有料プラン（$7/月〜）にアップグレードすると常時稼働します

### 問題4: PDFアップロードが失敗

**症状**: 「File too large」エラー

**解決策**:
1. PDFファイルサイズを10MB以下に圧縮
2. Renderの `MAX_FILE_SIZE` 環境変数を確認

---

## 🔧 次のステップ

デプロイ完了後の推奨事項：

1. ✅ **カスタムドメインの設定**
   - Cloudflare Pagesでカスタムドメインを設定（例: `dashboard.yourcompany.com`）

2. ✅ **モニタリングの設定**
   - Renderのログモニタリングを有効化
   - Cloudflareのアナリティクスを確認

3. ✅ **バックアップの設定**
   - Renderの自動バックアップを有効化（有料プラン）

4. ✅ **セキュリティ強化**
   - Cloudflare WAFを有効化（無料）
   - SSL/TLS証明書の確認（自動設定済み）

5. ✅ **パフォーマンス最適化**
   - Cloudflare CDNを活用（自動設定済み）
   - Renderのリージョンを最適化（有料プラン）

---

## 📚 詳細ドキュメント

より詳細な情報は以下のドキュメントを参照してください：

- **完全デプロイガイド**: `CLOUDFLARE_DEPLOYMENT.md`
- **システム概要**: `README.md`
- **開発ガイド**: `DEPLOYMENT.md`

---

## 💬 サポート

デプロイに関する問題やフィードバックは、GitHubのIssuesでお気軽にお知らせください：

https://github.com/rasuta1125/AIdashboard/issues

---

## 🚀 Happy Deploying!

ご利用ありがとうございます！
