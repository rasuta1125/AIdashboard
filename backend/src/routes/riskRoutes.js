import express from "express";
import {
  analyzeRisks,
  generateAllRiskAlerts,
} from "../services/riskAnalysisService.js";

const router = express.Router();

/**
 * POST /api/risk/check
 * 全案件のリスクをチェック
 */
router.post("/check", async (req, res) => {
  try {
    const { projects, tasksMap, contactsMap } = req.body;

    // 入力検証
    if (!projects || !Array.isArray(projects)) {
      return res.status(400).json({
        success: false,
        error: "案件データ（projects）は配列である必要があります",
      });
    }

    console.log(`リスクチェック開始: ${projects.length}件の案件を分析中...`);

    // リスク分析
    const risks = await analyzeRisks(projects, tasksMap || {}, contactsMap || {});

    console.log(`検出されたリスク: ${risks.length}件`);

    // リスクが検出されなかった場合
    if (risks.length === 0) {
      return res.json({
        success: true,
        message: "リスクは検出されませんでした",
        risks: [],
        summary: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      });
    }

    // 重大度別にカウント
    const summary = {
      total: risks.length,
      critical: risks.filter((r) => r.severity === "critical").length,
      high: risks.filter((r) => r.severity === "high").length,
      medium: risks.filter((r) => r.severity === "medium").length,
      low: risks.filter((r) => r.severity === "low").length,
    };

    // 成功レスポンス
    res.json({
      success: true,
      message: `${risks.length}件のリスクが検出されました`,
      risks: risks,
      summary: summary,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("リスクチェックエラー:", error);

    // エラーレスポンス
    res.status(500).json({
      success: false,
      error: error.message || "リスクチェック中にエラーが発生しました",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/risk/check-with-ai
 * 全案件のリスクをチェックし、AI警告を生成
 */
router.post("/check-with-ai", async (req, res) => {
  try {
    const { projects, tasksMap, contactsMap } = req.body;

    // 入力検証
    if (!projects || !Array.isArray(projects)) {
      return res.status(400).json({
        success: false,
        error: "案件データ（projects）は配列である必要があります",
      });
    }

    console.log(`AI リスクチェック開始: ${projects.length}件の案件を分析中...`);

    // リスク分析
    const risks = await analyzeRisks(projects, tasksMap || {}, contactsMap || {});

    console.log(`検出されたリスク: ${risks.length}件`);

    // リスクが検出されなかった場合
    if (risks.length === 0) {
      return res.json({
        success: true,
        message: "リスクは検出されませんでした",
        alerts: [],
        summary: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      });
    }

    // AI警告生成（最大10件まで）
    const risksToAnalyze = risks.slice(0, 10);
    console.log(`AI警告生成中: ${risksToAnalyze.length}件...`);
    
    const alerts = await generateAllRiskAlerts(risksToAnalyze);

    // 重大度別にカウント
    const summary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      high: alerts.filter((a) => a.severity === "high").length,
      medium: alerts.filter((a) => a.severity === "medium").length,
      low: alerts.filter((a) => a.severity === "low").length,
    };

    // 成功レスポンス
    res.json({
      success: true,
      message: `${alerts.length}件のリスクアラートが生成されました`,
      alerts: alerts,
      summary: summary,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AIリスクチェックエラー:", error);

    // エラーレスポンス
    res.status(500).json({
      success: false,
      error: error.message || "AIリスクチェック中にエラーが発生しました",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/risk/health
 * ヘルスチェック用エンドポイント
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Risk Analysis API is running",
    timestamp: new Date().toISOString(),
    geminiApiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

export default router;
