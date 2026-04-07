import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';

// 環境変数の読み込み
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Expressアプリの初期化
const app = express();
const PORT = process.env.PORT || 3001;

// CORS設定 - サンドボックス・本番両対応
const corsOptions = {
  origin: function (origin, callback) {
    // originなし（curl等）、localhost、sandboxドメインはすべて許可
    if (
      !origin ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('sandbox.novita.ai') ||
      origin.includes('.pages.dev') ||
      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
    ) {
      callback(null, true);
    } else {
      // それ以外も開発中は許可
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// OPTIONSプリフライトを明示的に処理
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// リクエストロギング
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ルートの設定
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/pdfs', pdfRoutes);

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: '不動産管理ソフト - Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout',
      me: 'GET /api/auth/me',
      properties: '/api/properties',
      pdfs: '/api/pdfs',
    },
  });
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 404エラーハンドリング
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません',
    requestedUrl: req.url,
  });
});

// グローバルエラーハンドリング
app.use((err, req, res, next) => {
  console.error('エラー:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'ファイルサイズが大きすぎます（最大10MB）' });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, error: '予期しないフィールド名です' });
  }

  if (err.message === 'PDFファイルのみアップロード可能です') {
    return res.status(400).json({ success: false, error: err.message });
  }

  res.status(500).json({
    success: false,
    error: err.message || 'サーバーエラーが発生しました',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// サーバーの起動
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🏠 不動産管理ソフト - Backend API');
  console.log('='.repeat(50));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
  console.log('\n📋 初期アカウント:');
  console.log('  管理ユーザー: admin / admin123');
  console.log('  利用ユーザー: user / user123');
  console.log('\n✨ サーバーが起動しました！\n');
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received. サーバーを終了します...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received. サーバーを終了します...');
  process.exit(0);
});

export default app;
