import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ocrRoutes from "./routes/ocrRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import riskRoutes from "./routes/riskRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";

// 環境変数の読み込み
dotenv.config();

// Expressアプリの初期化
const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェアの設定
// CORS設定 - 開発環境では柔軟に対応
const corsOptions = {
  origin: function (origin, callback) {
    // 開発環境では全てのオリジンを許可
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // 本番環境では指定されたURLのみ許可
      const allowedOrigins = [process.env.FRONTEND_URL];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// リクエストロギング
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ルートの設定
app.use("/api/ocr", ocrRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/schedule", scheduleRoutes);

// ルートエンドポイント
app.get("/", (req, res) => {
  res.json({
    message: "不動産売買決済管理システム - Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      ocrHealth: "/api/ocr/health",
      contractOCR: "POST /api/ocr/contract",
      emailHealth: "/api/email/health",
      emailGenerate: "POST /api/email/generate",
      emailTaskCompletion: "POST /api/email/task-completion",
      riskHealth: "/api/risk/health",
      riskCheck: "POST /api/risk/check",
      riskCheckWithAI: "POST /api/risk/check-with-ai",
      scheduleHealth: "/api/schedule/health",
      scheduleSuggest: "POST /api/schedule/suggest",
      scheduleSuggestTasks: "POST /api/schedule/suggest-tasks",
    },
  });
});

// ヘルスチェックエンドポイント
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    geminiApiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// 404エラーハンドリング
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "エンドポイントが見つかりません",
    requestedUrl: req.url,
  });
});

// グローバルエラーハンドリング
app.use((err, req, res, next) => {
  console.error("エラー:", err);

  // Multerのエラー処理
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: "ファイルサイズが大きすぎます（最大10MB）",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      error: "予期しないフィールド名です",
    });
  }

  // その他のエラー
  res.status(500).json({
    success: false,
    error: err.message || "サーバーエラーが発生しました",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// サーバーの起動
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("🚀 不動産売買決済管理システム - Backend API");
  console.log("=".repeat(50));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? "✅ 設定済み" : "❌ 未設定"}`);
  console.log("=".repeat(50));
  console.log("\n📋 利用可能なエンドポイント:");
  console.log(`  GET  /health - ヘルスチェック`);
  console.log(`  GET  /api/ocr/health - OCR APIヘルスチェック`);
  console.log(`  POST /api/ocr/contract - 契約書OCR処理`);
  console.log(`  GET  /api/email/health - Email APIヘルスチェック`);
  console.log(`  POST /api/email/generate - メール生成`);
  console.log(`  POST /api/email/task-completion - タスク完了メール生成`);
  console.log(`  GET  /api/risk/health - Risk APIヘルスチェック`);
  console.log(`  POST /api/risk/check - リスクチェック`);
  console.log(`  POST /api/risk/check-with-ai - AIリスクチェック`);
  console.log(`  GET  /api/schedule/health - Schedule APIヘルスチェック`);
  console.log(`  POST /api/schedule/suggest - AIスケジュール提案`);
  console.log(`  POST /api/schedule/suggest-tasks - タスクスケジュール提案`);
  console.log("\n✨ サーバーが起動しました！\n");
});

// プロセス終了時の処理
process.on("SIGTERM", () => {
  console.log("\n⚠️  SIGTERM received. サーバーを終了します...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n⚠️  SIGINT received. サーバーを終了します...");
  process.exit(0);
});

export default app;
