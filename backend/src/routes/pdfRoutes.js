import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import store from '../data/store.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// アップロードディレクトリの設定
// 本番環境(Render)では /var/data/uploads/pdfs、開発環境では backend/uploads/pdfs
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const uploadDir = process.env.DATA_DIR
  ? path.join(DATA_DIR, 'uploads/pdfs')
  : path.join(__dirname, '../../uploads/pdfs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('PDFファイルのみアップロード可能です'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /api/pdfs/upload/:propertyId - PDFアップロード（管理者のみ）
router.post('/upload/:propertyId', authenticate, adminOnly, upload.single('pdf'), (req, res) => {
  const { propertyId } = req.params;

  const property = store.findPropertyById(propertyId);
  if (!property) {
    // アップロードされたファイルを削除
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ success: false, error: '物件が見つかりません' });
  }

  const pdfCount = store.countPdfsByPropertyId(propertyId);
  if (pdfCount >= 5) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, error: 'PDFは1物件につき最大5個まで登録可能です' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'PDFファイルを選択してください' });
  }

  const pdf = store.addPdf(propertyId, req.file);
  res.status(201).json({ success: true, data: pdf });
});

// GET /api/pdfs/view/:pdfId - PDF閲覧（全ユーザー）
router.get('/view/:pdfId', authenticate, (req, res) => {
  const pdf = store.findPdfById(req.params.pdfId);
  if (!pdf) {
    return res.status(404).json({ success: false, error: 'PDFが見つかりません' });
  }

  if (!fs.existsSync(pdf.path)) {
    return res.status(404).json({ success: false, error: 'PDFファイルが存在しません' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pdf.originalName)}"`);
  const stream = fs.createReadStream(pdf.path);
  stream.pipe(res);
});

// GET /api/pdfs/download/:pdfId - PDFダウンロード（全ユーザー）
router.get('/download/:pdfId', authenticate, (req, res) => {
  const pdf = store.findPdfById(req.params.pdfId);
  if (!pdf) {
    return res.status(404).json({ success: false, error: 'PDFが見つかりません' });
  }

  if (!fs.existsSync(pdf.path)) {
    return res.status(404).json({ success: false, error: 'PDFファイルが存在しません' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdf.originalName)}"`);
  const stream = fs.createReadStream(pdf.path);
  stream.pipe(res);
});

// DELETE /api/pdfs/:pdfId - PDF削除（管理者のみ）
router.delete('/:pdfId', authenticate, adminOnly, (req, res) => {
  const pdf = store.deletePdf(req.params.pdfId);
  if (!pdf) {
    return res.status(404).json({ success: false, error: 'PDFが見つかりません' });
  }

  // ファイルシステムから削除
  if (fs.existsSync(pdf.path)) {
    fs.unlinkSync(pdf.path);
  }

  res.json({ success: true, message: 'PDFを削除しました' });
});

export default router;
