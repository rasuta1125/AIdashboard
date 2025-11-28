# Cloudflare Pages デプロイメント完全ガイド

## 目次
1. [システム構成の理解](#システム構成の理解)
2. [デプロイ前の準備](#デプロイ前の準備)
3. [フロントエンドのデプロイ](#フロントエンドのデプロイ)
4. [バックエンドのデプロイ](#バックエンドのデプロイ)
5. [環境変数の設定](#環境変数の設定)
6. [トラブルシューティング](#トラブルシューティング)

---

## システム構成の理解

このシステムは以下の2層構造です：

```
┌─────────────────────────────────────────────────┐
│  フロントエンド (React + Vite)                  │
│  - ポート: 5173 (開発時)                        │
│  - 役割: UI表示、ユーザー操作                    │
│  - デプロイ先: Cloudflare Pages                 │
└─────────────────────────────────────────────────┘
                    ↓ API通信
┌─────────────────────────────────────────────────┐
│  バックエンド (Node.js + Express)               │
│  - ポート: 3001                                 │
│  - 役割: AI処理、データ管理                     │
│  - デプロイ先: Render/Railway/Heroku など      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Google Gemini API                              │
│  - AI-OCR / メール生成 / リスク分析              │
└─────────────────────────────────────────────────┘
```

---

## デプロイ前の準備

### 1. 必要なアカウント

| サービス | 用途 | URL |
|---------|------|-----|
| Cloudflare | フロントエンドホスティング | https://dash.cloudflare.com/ |
| Render (推奨) | バックエンドホスティング | https://render.com/ |
| GitHub | ソースコード管理 | https://github.com/ |
| Google AI Studio | Gemini APIキー | https://makersuite.google.com/app/apikey |

### 2. リポジトリの準備

✅ **現在の状態**: すでにGitHubにプッシュ済み
- リポジトリ: `rasuta1125/AIdashboard`
- ブランチ: `main`

---

## フロントエンドのデプロイ (Cloudflare Pages)

### ステップ1: Cloudflareダッシュボードにアクセス

1. **Cloudflareにログイン**: https://dash.cloudflare.com/
2. 左サイドバーから **「Pages」** を選択
3. **「プロジェクトを作成」** をクリック

### ステップ2: GitHubリポジトリと連携

1. **「Gitに接続」** を選択
2. GitHubアカウントで認証
3. リポジトリを選択: `rasuta1125/AIdashboard`
4. ブランチを選択: `main`

### ステップ3: ビルド設定

以下の設定を入力してください：

```yaml
プロジェクト名: real-estate-dashboard
ブランチ: main
フレームワークプリセット: Vite
ビルドコマンド: npm run build
ビルド出力ディレクトリ: dist
ルートディレクトリ: frontend
```

**重要**: 「ルートディレクトリ」を必ず `frontend` に設定してください。

### ステップ4: 環境変数の設定（フロントエンド）

Cloudflare Pagesのプロジェクト設定で以下を追加：

| 変数名 | 値 | 説明 |
|--------|---|------|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com` | バックエンドAPIのURL（後で設定） |

**注意**: Viteでは環境変数は `VITE_` プレフィックスが必要です。

### ステップ5: デプロイ実行

1. **「保存してデプロイ」** をクリック
2. ビルドが開始されます（約3-5分）
3. デプロイ完了後、URLが表示されます
   - 例: `https://real-estate-dashboard.pages.dev`

---

## バックエンドのデプロイ (Render推奨)

### なぜRenderを推奨？

- ✅ 無料プランあり
- ✅ Node.js対応
- ✅ 環境変数管理が簡単
- ✅ 自動デプロイ対応
- ✅ Gemini APIとの連携が容易

### ステップ1: Renderアカウント作成

1. https://render.com/ にアクセス
2. GitHubアカウントで登録

### ステップ2: Webサービスを作成

1. ダッシュボードで **「New +」** → **「Web Service」** を選択
2. GitHubリポジトリを選択: `rasuta1125/AIdashboard`
3. 以下の設定を入力：

```yaml
名前: real-estate-backend
環境: Node
ブランチ: main
ルートディレクトリ: backend
ビルドコマンド: npm install
起動コマンド: npm start
```

### ステップ3: 環境変数の設定（バックエンド）

Renderの環境変数セクションで以下を追加：

| 変数名 | 値 | 説明 |
|--------|---|------|
| `PORT` | `3001` | サーバーポート |
| `NODE_ENV` | `production` | 本番環境 |
| `GEMINI_API_KEY` | `あなたのAPIキー` | Google Gemini APIキー |
| `FRONTEND_URL` | `https://real-estate-dashboard.pages.dev` | フロントエンドURL（CORS用） |
| `MAX_FILE_SIZE` | `10485760` | アップロードファイルサイズ上限 |

### ステップ4: デプロイ実行

1. **「Create Web Service」** をクリック
2. デプロイが開始されます（約5-10分）
3. デプロイ完了後、URLが表示されます
   - 例: `https://real-estate-backend.onrender.com`

---

## 環境変数の設定

### フロントエンドで必要な設定

フロントエンドのAPI呼び出しを修正する必要があります：

#### 現在の設定（`frontend/src/utils/api.js`）

```javascript
const API_BASE_URL = 'http://localhost:3001';
```

#### 本番用に修正

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
```

### バックエンドで必要な設定

#### CORS設定の確認（`backend/src/server.js`）

```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : '*',
  credentials: true
};
app.use(cors(corsOptions));
```

---

## デプロイ後の確認手順

### 1. バックエンドAPI動作確認

ブラウザまたはcurlで以下にアクセス：

```bash
https://real-estate-backend.onrender.com/health
```

期待される応答：
```json
{
  "status": "healthy",
  "gemini_api": "configured"
}
```

### 2. フロントエンド表示確認

以下にアクセス：
```
https://real-estate-dashboard.pages.dev
```

### 3. AI機能動作確認

1. ダッシュボードで **「＋AIで案件作成」** をクリック
2. PDFファイルをアップロード
3. AI-OCRが正常に動作するか確認
4. メール自動生成機能をテスト
5. AIリスク分析機能をテスト

---

## トラブルシューティング

### ❌ フロントエンドがデプロイできない

**症状**: ビルドエラーが発生

**解決策**:
1. ルートディレクトリが `frontend` になっているか確認
2. ビルドコマンドが `npm run build` になっているか確認
3. Node.jsバージョンを確認（推奨: 18.x以上）

### ❌ バックエンドAPIに接続できない

**症状**: フロントエンドで「API connection failed」エラー

**解決策**:
1. Renderのサービスが起動しているか確認
2. `FRONTEND_URL` 環境変数が正しく設定されているか確認
3. CORS設定を確認
4. Renderのログを確認:
   ```
   https://dashboard.render.com/web/[your-service-id]/logs
   ```

### ❌ AI機能が動作しない

**症状**: AI-OCRやメール生成でエラー

**解決策**:
1. `GEMINI_API_KEY` が正しく設定されているか確認
2. APIキーが有効か確認: https://makersuite.google.com/app/apikey
3. バックエンドログでGemini APIエラーを確認

### ❌ PDF アップロードが失敗する

**症状**: 「File too large」エラー

**解決策**:
1. `MAX_FILE_SIZE` 環境変数を確認（デフォルト: 10MB）
2. Renderの無料プランの制限を確認
3. ファイルサイズを10MB以下に圧縮

---

## コスト概算

### 無料プランの場合

| サービス | 月額 | 制限 |
|---------|------|------|
| Cloudflare Pages | 無料 | 500ビルド/月 |
| Render (Free Tier) | 無料 | 750時間/月、休止あり |
| Google Gemini API | 無料〜 | 制限あり |
| **合計** | **無料** | 小規模利用に十分 |

### 有料プランの場合（推奨：ビジネス利用）

| サービス | 月額 | メリット |
|---------|------|---------|
| Cloudflare Pages | $20〜 | カスタムドメイン、高速配信 |
| Render (Starter) | $7〜 | 常時起動、高速応答 |
| Google Gemini API | 従量課金 | 高精度AI処理 |

---

## 推奨：カスタムドメイン設定

### Cloudflare Pagesでカスタムドメインを設定

1. Cloudflare Pagesプロジェクト設定を開く
2. **「カスタムドメイン」** タブを選択
3. ドメインを入力（例: `dashboard.yourdomain.com`）
4. DNSレコードを自動設定

---

## セキュリティのベストプラクティス

### 1. 環境変数の管理

✅ **推奨**:
- Gemini APIキーは必ず環境変数で管理
- `.env` ファイルは `.gitignore` に含める（既に設定済み）
- 本番環境と開発環境で異なるキーを使用

### 2. CORS設定

✅ **推奨**:
- 本番環境では特定のフロントエンドURLのみ許可
- `credentials: true` を設定

### 3. ファイルアップロード

✅ **推奨**:
- ファイルサイズ制限を設定（現在: 10MB）
- PDFのみ許可する検証を追加
- アップロードファイルは処理後に削除（既に実装済み）

---

## 次のステップ

デプロイが完了したら：

1. ✅ システムの動作確認
2. ✅ AI機能の精度テスト
3. ✅ パフォーマンスモニタリング設定
4. ✅ エラーロギングの設定
5. ✅ ユーザーフィードバック収集

---

## サポートリソース

- **Cloudflare Pages ドキュメント**: https://developers.cloudflare.com/pages/
- **Render ドキュメント**: https://render.com/docs
- **Vite デプロイガイド**: https://vitejs.dev/guide/static-deploy.html
- **Gemini API ドキュメント**: https://ai.google.dev/docs

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-11-28 | 1.0.0 | 初版作成 |
