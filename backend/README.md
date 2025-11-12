# Backend API - 不動産売買決済管理システム

不動産売買決済管理システムのバックエンドAPIです。Gemini APIを使用した契約書OCR機能を提供します。

## 🚀 機能

### AI機能①: 契約書AI-OCR

PDFの売買契約書をアップロードすると、Gemini APIを使用して以下の情報を自動抽出します：

- **契約日** (contract_date)
- **決済日/引渡日** (settlement_date)
- **売買代金** (property_price)
- **手付金** (deposit_amount)
- **融資特約期限** (loan_special_clause_deadline)

## 📋 技術スタック

- **Node.js** - JavaScript実行環境
- **Express** - Webフレームワーク
- **Gemini API** - Google AI による OCR と情報抽出
- **Multer** - ファイルアップロード処理
- **CORS** - クロスオリジンリクエスト対応

## 🔧 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成します：

```bash
cp .env.example .env
```

`.env` ファイルを編集し、必要な設定を行います：

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Gemini API Configuration
GEMINI_API_KEY=your_actual_api_key_here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

#### Gemini APIキーの取得方法

1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. "Create API Key" をクリック
4. 生成されたAPIキーを `.env` ファイルの `GEMINI_API_KEY` に設定

### 3. サーバーの起動

#### 開発モード（ホットリロード有効）

```bash
npm run dev
```

#### 本番モード

```bash
npm start
```

サーバーは `http://localhost:3001` で起動します。

## 📡 API エンドポイント

### ヘルスチェック

#### `GET /health`

サーバーの状態を確認します。

**レスポンス例:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-12T08:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "geminiApiConfigured": true
}
```

### OCR API

#### `GET /api/ocr/health`

OCR APIの状態を確認します。

**レスポンス例:**
```json
{
  "success": true,
  "message": "OCR API is running",
  "timestamp": "2025-11-12T08:00:00.000Z",
  "geminiApiConfigured": true
}
```

#### `POST /api/ocr/contract`

契約書PDFをアップロードし、情報を抽出します。

**リクエスト:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: PDFファイル（フィールド名: `contract`）
- 最大ファイルサイズ: 10MB

**cURL例:**
```bash
curl -X POST http://localhost:3001/api/ocr/contract \
  -F "contract=@/path/to/contract.pdf"
```

**成功レスポンス例:**
```json
{
  "success": true,
  "message": "契約書情報を正常に抽出しました",
  "data": {
    "contract_date": "2025-11-01",
    "settlement_date": "2025-12-15",
    "property_price": 45000000,
    "deposit_amount": 4500000,
    "loan_special_clause_deadline": "2025-11-22"
  },
  "metadata": {
    "originalFilename": "contract.pdf",
    "fileSize": 2048000,
    "processedAt": "2025-11-12T08:00:00.000Z"
  }
}
```

**エラーレスポンス例:**
```json
{
  "success": false,
  "error": "ファイルがアップロードされていません"
}
```

## 📁 プロジェクト構造

```
backend/
├── src/
│   ├── routes/
│   │   └── ocrRoutes.js       # OCR APIのルート定義
│   ├── services/
│   │   └── geminiService.js   # Gemini API連携サービス
│   ├── utils/
│   │   └── fileUpload.js      # ファイルアップロード設定
│   └── server.js              # メインサーバーファイル
├── uploads/                    # アップロードファイル一時保存
│   └── .gitkeep
├── .env                        # 環境変数（Gitで管理しない）
├── .env.example                # 環境変数のテンプレート
├── .gitignore
├── package.json
└── README.md
```

## 🔐 セキュリティ

### ファイルアップロード

- **許可されるファイル形式**: PDFのみ
- **最大ファイルサイズ**: 10MB（デフォルト）
- **自動削除**: 処理完了後、アップロードされたファイルは自動的に削除されます

### CORS設定

デフォルトでは `http://localhost:5173`（フロントエンド）からのリクエストのみ許可されています。
本番環境では `.env` の `FRONTEND_URL` を適切に設定してください。

### API キー管理

- Gemini APIキーは `.env` ファイルで管理
- `.env` ファイルは `.gitignore` に追加済み（Gitで管理されません）
- 本番環境では環境変数として設定することを推奨

## 🧪 テスト

### Postmanでのテスト

1. Postmanを開く
2. 新しいリクエストを作成
3. Method: `POST`
4. URL: `http://localhost:3001/api/ocr/contract`
5. Body → form-data を選択
6. Key: `contract` (Type: File)
7. Value: PDFファイルを選択
8. Send をクリック

### cURLでのテスト

```bash
# ヘルスチェック
curl http://localhost:3001/health

# OCR処理
curl -X POST http://localhost:3001/api/ocr/contract \
  -F "contract=@./test-contract.pdf"
```

## 📊 Gemini API について

このプロジェクトでは **Gemini 1.5 Pro** モデルを使用しています。

### 特徴

- PDFファイルの直接処理が可能
- 高精度なOCRとテキスト抽出
- 構造化データの抽出に優れている
- 日本語の契約書に対応

### レート制限

無料プランの場合：
- 1分あたり15リクエスト
- 1日あたり1,500リクエスト

詳細は [Gemini API ドキュメント](https://ai.google.dev/gemini-api/docs) を参照してください。

## 🐛 トラブルシューティング

### Gemini APIキーが設定されていない

**エラー:**
```
❌ Gemini API: 未設定
```

**解決方法:**
1. `.env` ファイルに正しいAPIキーが設定されているか確認
2. サーバーを再起動

### ファイルアップロードエラー

**エラー:**
```json
{
  "success": false,
  "error": "ファイルサイズが大きすぎます（最大10MB）"
}
```

**解決方法:**
- PDFファイルのサイズを確認
- 必要に応じて `.env` の `MAX_FILE_SIZE` を増やす

### CORS エラー

**エラー:**
```
Access to fetch at 'http://localhost:3001/api/ocr/contract' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**解決方法:**
- `.env` の `FRONTEND_URL` が正しく設定されているか確認
- サーバーを再起動

## 📈 今後の拡張予定

- [ ] データベース連携（PostgreSQL）
- [ ] 認証・認可機能
- [ ] 複数ファイルの一括処理
- [ ] OCR結果のキャッシング
- [ ] Webhook通知機能
- [ ] ログ管理システム

## 📝 ライセンス

このプロジェクトは非公開プロジェクトです。

---

**作成日**: 2025-11-12  
**バージョン**: 1.0.0
