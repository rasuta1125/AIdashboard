# 不動産管理ソフト 簡易版

ログイン機能付きの不動産物件管理システムです。

## 機能概要

### ユーザー区分
| 機能 | 管理ユーザー | 利用ユーザー |
|------|------------|------------|
| ログイン | ✅ | ✅ |
| 物件一覧閲覧 | ✅ | ✅ |
| 物件詳細閲覧 | ✅ | ✅ |
| 物件登録 | ✅ | ❌ |
| 物件編集 | ✅ | ❌ |
| 物件削除 | ✅ | ❌ |
| PDF登録 | ✅ | ❌ |
| PDF削除 | ✅ | ❌ |
| PDF閲覧 | ✅ | ✅ |
| PDF保存（DL） | ✅ | ✅ |

### 初期アカウント
| 区分 | ID | パスワード |
|------|-----|----------|
| 管理ユーザー | admin | admin123 |
| 利用ユーザー | user | user123 |

## システム構成

```
frontend/  - React + Vite (Cloudflare Pages)
backend/   - Node.js + Express (Render等)
```

## ローカル起動方法

### バックエンド
```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### フロントエンド
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## デプロイ（Cloudflare Pages + Render）

### フロントエンド (Cloudflare Pages)
- **ビルドコマンド**: `npm run build`
- **ビルド出力ディレクトリ**: `dist`
- **ルートディレクトリ**: `frontend`
- **環境変数**: `VITE_API_BASE_URL=https://your-backend.onrender.com`

### バックエンド (Render)
- **ルートディレクトリ**: `backend`
- **ビルドコマンド**: `npm install`
- **起動コマンド**: `npm start`
- **環境変数**: `FRONTEND_URL=https://your-project.pages.dev`

## API エンドポイント

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| POST | /api/auth/login | ログイン | 全員 |
| POST | /api/auth/logout | ログアウト | 認証済 |
| GET | /api/auth/me | 自分の情報 | 認証済 |
| GET | /api/properties | 物件一覧 | 認証済 |
| GET | /api/properties/:id | 物件詳細 | 認証済 |
| POST | /api/properties | 物件登録 | 管理者 |
| PUT | /api/properties/:id | 物件更新 | 管理者 |
| DELETE | /api/properties/:id | 物件削除 | 管理者 |
| POST | /api/pdfs/upload/:propertyId | PDFアップロード | 管理者 |
| GET | /api/pdfs/view/:pdfId | PDF閲覧 | 認証済 |
| GET | /api/pdfs/download/:pdfId | PDFダウンロード | 認証済 |
| DELETE | /api/pdfs/:pdfId | PDF削除 | 管理者 |
