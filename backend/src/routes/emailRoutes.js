import express from "express";
import {
  generateContactEmail,
  generateTaskCompletionEmail,
  generateCustomEmail,
} from "../services/emailGenerationService.js";

const router = express.Router();

/**
 * POST /api/email/generate
 * 案件情報に基づいてメールを生成
 */
router.post("/generate", async (req, res) => {
  try {
    const context = req.body;

    // 必須フィールドのチェック
    if (!context.projectName) {
      return res.status(400).json({
        success: false,
        error: "案件名（projectName）は必須です",
      });
    }

    console.log("メール生成リクエスト:", {
      projectName: context.projectName,
      recipientRole: context.recipientRole,
      taskName: context.taskName,
    });

    // メール生成
    const result = await generateContactEmail(context);

    // 成功レスポンス
    res.json({
      success: true,
      message: "メールを正常に生成しました",
      email: result.email,
      metadata: {
        projectName: context.projectName,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("メール生成エラー:", error);

    // エラーレスポンス
    res.status(500).json({
      success: false,
      error: error.message || "メール生成中にエラーが発生しました",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/email/task-completion
 * タスク完了時のメール生成
 */
router.post("/task-completion", async (req, res) => {
  try {
    const taskContext = req.body;

    // 必須フィールドのチェック
    if (!taskContext.projectName || !taskContext.taskName) {
      return res.status(400).json({
        success: false,
        error: "案件名（projectName）とタスク名（taskName）は必須です",
      });
    }

    console.log("タスク完了メール生成リクエスト:", {
      projectName: taskContext.projectName,
      taskName: taskContext.taskName,
    });

    // タスク完了メール生成
    const result = await generateTaskCompletionEmail(taskContext);

    // 成功レスポンス
    res.json({
      success: true,
      message: "タスク完了メールを正常に生成しました",
      email: result.email,
      metadata: {
        projectName: taskContext.projectName,
        taskName: taskContext.taskName,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("タスク完了メール生成エラー:", error);

    // エラーレスポンス
    res.status(500).json({
      success: false,
      error: error.message || "メール生成中にエラーが発生しました",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/email/custom
 * カスタムコンテキストでメール生成
 */
router.post("/custom", async (req, res) => {
  try {
    const customContext = req.body;

    console.log("カスタムメール生成リクエスト:", customContext);

    // カスタムメール生成
    const result = await generateCustomEmail(customContext);

    // 成功レスポンス
    res.json({
      success: true,
      message: "カスタムメールを正常に生成しました",
      email: result.email,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("カスタムメール生成エラー:", error);

    // エラーレスポンス
    res.status(500).json({
      success: false,
      error: error.message || "メール生成中にエラーが発生しました",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/email/health
 * ヘルスチェック用エンドポイント
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Email Generation API is running",
    timestamp: new Date().toISOString(),
    geminiApiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

export default router;
