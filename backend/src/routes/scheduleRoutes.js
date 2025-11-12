import express from "express";
import {
  generateScheduleSuggestion,
  suggestTaskSchedule,
} from "../services/scheduleService.js";

const router = express.Router();

/**
 * ヘルスチェック
 * GET /api/schedule/health
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Schedule API is running",
    timestamp: new Date().toISOString(),
    geminiApiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

/**
 * AIスケジュール提案を生成
 * POST /api/schedule/suggest
 * 
 * Body:
 * {
 *   events: Array,
 *   projects: Array,
 *   currentDate: string
 * }
 */
router.post("/suggest", async (req, res) => {
  try {
    const { events, projects, currentDate } = req.body;

    // バリデーション
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: "イベント情報が必要です",
      });
    }

    if (!projects || !Array.isArray(projects)) {
      return res.status(400).json({
        success: false,
        error: "案件情報が必要です",
      });
    }

    console.log(`スケジュール提案生成開始: ${events.length}件のイベント`);

    // スケジュール提案を生成
    const result = await generateScheduleSuggestion(
      events,
      projects,
      currentDate || new Date().toISOString()
    );

    console.log("スケジュール提案生成完了");

    res.json(result);
  } catch (error) {
    console.error("スケジュール提案エラー:", error);
    res.status(500).json({
      success: false,
      error: "スケジュール提案の生成に失敗しました",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * タスクスケジュール提案を生成
 * POST /api/schedule/suggest-tasks
 * 
 * Body:
 * {
 *   project: Object,
 *   existingEvents: Array
 * }
 */
router.post("/suggest-tasks", async (req, res) => {
  try {
    const { project, existingEvents } = req.body;

    // バリデーション
    if (!project) {
      return res.status(400).json({
        success: false,
        error: "案件情報が必要です",
      });
    }

    console.log(`タスクスケジュール提案生成開始: ${project.project_name}`);

    // タスクスケジュール提案を生成
    const result = await suggestTaskSchedule(
      project,
      existingEvents || []
    );

    console.log("タスクスケジュール提案生成完了");

    res.json(result);
  } catch (error) {
    console.error("タスクスケジュール提案エラー:", error);
    res.status(500).json({
      success: false,
      error: "タスクスケジュール提案の生成に失敗しました",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
