# 🚀 デプロイメントガイド

**不動産売買案件管理システム**のデプロイメント手順書

---

## 📋 目次

1. [前提条件](#前提条件)
2. [環境変数設定](#環境変数設定)
3. [バックエンドデプロイ](#バックエンドデプロイ)
4. [フロントエンドデプロイ](#フロントエンドデプロイ)
5. [動作確認](#動作確認)
6. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要な環境

- **Node.js**: v18.0 以上
- **npm**: v8.0 以上
- **Git**: v2.0 以上

### 必要なAPIキー

- **Google Gemini API Key**: AI機能を使用する場合に必要
  - 取得方法: [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## 環境変数設定

### バックエンド環境変数

`backend/.env` ファイルを作成：

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Gemini API Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com
```

### フロントエンド環境変数

`frontend/.env` ファイルを作成（必要に応じて）：

```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

---

## バックエンドデプロイ

### 1. 依存関係のインストール

```bash
cd backend
npm install --production
```

### 2. 環境変数の設定

```bash
# .envファイルを本番環境用に編集
nano .env
```

### 3. サーバー起動

#### 開発モード
```bash
npm start
```

#### 本番モード（PM2使用推奨）
```bash
# PM2をグローバルにインストール
npm install -g pm2

# PM2でサーバーを起動
pm2 start src/server.js --name "real-estate-backend"

# 自動起動設定
pm2 startup
pm2 save
```

### 4. 動作確認

```bash
curl http://localhost:3001/health
```

期待される出力：
```json
{
  "status": "ok",
  "message": "不動産売買決済管理システム - Backend API",
  "timestamp": "2025-11-28T00:00:00.000Z",
  "geminiApiConfigured": true
}
```

---

## フロントエンドデプロイ

### 1. 依存関係のインストール

```bash
cd frontend
npm install
```

### 2. 本番ビルド

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに生成されます。

### 3. デプロイ方法

#### オプション1: 静的ホスティング（Netlify, Vercel, GitHub Pagesなど）

**Netlify例:**
```bash
# Netlify CLIをインストール
npm install -g netlify-cli

# ログイン
netlify login

# デプロイ
netlify deploy --prod --dir=dist
```

**Vercel例:**
```bash
# Vercel CLIをインストール
npm install -g vercel

# デプロイ
vercel --prod
```

#### オプション2: 独自サーバー（Nginx）

1. ビルド成果物をサーバーにコピー：
```bash
scp -r dist/* user@your-server:/var/www/html/
```

2. Nginx設定例（`/etc/nginx/sites-available/real-estate`）：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Nginxを再起動：
```bash
sudo systemctl restart nginx
```

---

## 動作確認

### 1. フロントエンド確認

ブラウザで `https://your-domain.com` にアクセス

**確認項目:**
- ✅ ダッシュボードが表示される
- ✅ サンプルデータが表示される（初回）
- ✅ 案件カードがクリック可能

### 2. AI機能確認

#### AI-OCR機能
1. 「＋AIで案件作成」ボタンをクリック
2. 契約書PDFをアップロード
3. 自動的に案件が作成されることを確認

#### メール生成機能
1. 任意の案件詳細を開く
2. 「✉️ メール作成」ボタンをクリック
3. AIがメール文面を生成することを確認

#### リスクチェック機能
1. ダッシュボードで「リスクチェック」ボタンをクリック
2. リスクアラートが表示されることを確認

### 3. API確認

```bash
# ヘルスチェック
curl https://your-backend-domain.com/health

# OCR APIヘルスチェック
curl https://your-backend-domain.com/api/ocr/health

# Email APIヘルスチェック
curl https://your-backend-domain.com/api/email/health

# Risk APIヘルスチェック
curl https://your-backend-domain.com/api/risk/health
```

---

## トラブルシューティング

### 問題1: CORS エラー

**症状:**
```
Access to fetch at 'https://backend.com/api/...' from origin 'https://frontend.com' has been blocked by CORS policy
```

**解決方法:**
1. `backend/.env` の `FRONTEND_URL` を確認
2. フロントエンドのドメインと一致しているか確認
3. バックエンドサーバーを再起動

### 問題2: Gemini API エラー

**症状:**
```
Error: Gemini API key not configured
```

**解決方法:**
1. `backend/.env` に正しいAPIキーが設定されているか確認
2. APIキーが有効か確認（Google AI Studioで確認）
3. 環境変数が正しく読み込まれているか確認：
```bash
cd backend
node -e "console.log(process.env.GEMINI_API_KEY)"
```

### 問題3: ファイルアップロードエラー

**症状:**
```
Error: File upload failed
```

**解決方法:**
1. `backend/uploads` ディレクトリが存在するか確認
2. 書き込み権限があるか確認：
```bash
chmod 755 backend/uploads
```
3. ファイルサイズ制限を確認（デフォルト10MB）

### 問題4: localStorage データが消える

**症状:**
- ページをリロードするとデータが消える

**原因:**
- プライベートブラウジングモード
- ブラウザの設定でlocalStorageが無効

**解決方法:**
- 通常モードでブラウザを使用
- ブラウザの設定を確認

### 問題5: モバイルで表示が崩れる

**症状:**
- スマートフォンでレイアウトが崩れる

**解決方法:**
1. ブラウザのキャッシュをクリア
2. ハードリロード（Ctrl+Shift+R / Cmd+Shift+R）
3. レスポンシブデザインのCSSが読み込まれているか確認

---

## 📊 パフォーマンス最適化

### フロントエンド最適化

1. **Code Splitting**
```javascript
// 遅延読み込み例
const Calendar = lazy(() => import('./pages/Calendar'));
```

2. **画像最適化**
- WebP形式を使用
- 適切なサイズにリサイズ

3. **CDN活用**
- 静的ファイルをCDNにホスト

### バックエンド最適化

1. **キャッシング**
```javascript
// Redis等を使用したキャッシング実装
```

2. **レート制限**
```javascript
// express-rate-limitを使用
```

3. **圧縮**
```javascript
// compressionミドルウェアを使用
```

---

## 🔒 セキュリティ

### 推奨設定

1. **HTTPS必須**
   - Let's Encryptで無料SSL証明書を取得

2. **環境変数の保護**
   - `.env`ファイルをGit管理外に
   - 本番環境では環境変数として設定

3. **APIキーの保護**
   - フロントエンドに直接埋め込まない
   - バックエンド経由でのみアクセス

4. **ファイルアップロード制限**
   - ファイルタイプ検証
   - サイズ制限
   - ウイルススキャン（推奨）

---

## 📈 監視・ログ

### 推奨ツール

- **アプリケーション監視**: PM2, New Relic
- **ログ管理**: Winston, Loggly
- **エラー追跡**: Sentry
- **アクセス解析**: Google Analytics

---

## 🆘 サポート

問題が解決しない場合：

1. GitHubのIssueを確認
2. 新しいIssueを作成（エラーログを添付）
3. ドキュメントを再確認

---

**最終更新**: 2025-11-28  
**バージョン**: 1.5.0
