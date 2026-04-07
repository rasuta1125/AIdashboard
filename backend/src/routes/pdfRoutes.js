import express from 'express';
import multer from 'multer';
import store from '../data/firebaseStore.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Multer設定（メモリストレージ → Firebase Storageへ転送）
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('PDFファイルのみアップロード可能です'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /api/pdfs/upload/:propertyId - PDFアップロード（管理者のみ）
router.post('/upload/:propertyId', authenticate, adminOnly, upload.single('pdf'), async (req, res) => {
  try {
    const { propertyId } = req.params;

    const property = await store.findPropertyById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, error: '物件が見つかりません' });
    }

    const pdfCount = await store.countPdfsByPropertyId(propertyId);
    if (pdfCount >= 5) {
      return res.status(400).json({ success: false, error: 'PDFは1物件につき最大5個まで登録可能です' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'PDFファイルを選択してください' });
    }

    const pdf = await store.addPdf(propertyId, req.file);
    res.status(201).json({ success: true, data: pdf });
  } catch (err) {
    console.error('PDFアップロードエラー:', err);
    res.status(500).json({ success: false, error: 'PDFのアップロードに失敗しました' });
  }
});

// GET /api/pdfs/view/:pdfId - PDF閲覧（全ユーザー）
router.get('/view/:pdfId', authenticate, async (req, res) => {
  try {
    const result = await store.getPdfStream(req.params.pdfId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'PDFが見つかりません' });
    }
    const { stream, pdf } = result;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pdf.originalName)}"`);
    stream.pipe(res);
  } catch (err) {
    console.error('PDF閲覧エラー:', err);
    res.status(500).json({ success: false, error: 'PDFの取得に失敗しました' });
  }
});

// GET /api/pdfs/download/:pdfId - PDFダウンロード（全ユーザー）
router.get('/download/:pdfId', authenticate, async (req, res) => {
  try {
    const result = await store.getPdfStream(req.params.pdfId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'PDFが見つかりません' });
    }
    const { stream, pdf } = result;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdf.originalName)}"`);
    stream.pipe(res);
  } catch (err) {
    console.error('PDFダウンロードエラー:', err);
    res.status(500).json({ success: false, error: 'PDFのダウンロードに失敗しました' });
  }
});

// DELETE /api/pdfs/:pdfId - PDF削除（管理者のみ）
router.delete('/:pdfId', authenticate, adminOnly, async (req, res) => {
  try {
    const pdf = await store.deletePdf(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({ success: false, error: 'PDFが見つかりません' });
    }
    res.json({ success: true, message: 'PDFを削除しました' });
  } catch (err) {
    console.error('PDF削除エラー:', err);
    res.status(500).json({ success: false, error: 'PDFの削除に失敗しました' });
  }
});

export default router;
