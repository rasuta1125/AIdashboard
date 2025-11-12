import express from "express";
import upload, { deleteFile } from "../utils/fileUpload.js";
import { extractContractInfoFromPDF } from "../services/geminiService.js";

const router = express.Router();

/**
 * POST /api/ocr/contract
 * 契約書PDFをアップロードし、情報を抽出する
 */
router.post("/contract", upload.single("contract"), async (req, res) => {
  let filePath = null;

  try {
    // ファイルがアップロードされているか確認
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "ファイルがアップロードされていません",
      });
    }

    filePath = req.file.path;
    const mimeType = req.file.mimetype;

    console.log("ファイルを受信しました:", {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: mimeType,
      path: filePath,
    });

    // Gemini APIで情報を抽出
    console.log("Gemini APIで契約書情報を抽出中...");
    const result = await extractContractInfoFromPDF(filePath, mimeType);

    // 処理完了後、ファイルを削除（オプション）
    // セキュリティとストレージ節約のため、処理後に削除することを推奨
    deleteFile(filePath);

    // 成功レスポンス
    res.json({
      success: true,
      message: "契約書情報を正常に抽出しました",
      data: result.data,
      metadata: {
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("契約書OCR処理エラー:", error);

    // エラー時もファイルを削除
    if (filePath) {
      deleteFile(filePath);
    }

    // エラーレスポンス
    res.status(500).json({
      success: false,
      error: error.message || "契約書の処理中にエラーが発生しました",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/ocr/health
 * ヘルスチェック用エンドポイント
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "OCR API is running",
    timestamp: new Date().toISOString(),
    geminiApiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

export default router;
