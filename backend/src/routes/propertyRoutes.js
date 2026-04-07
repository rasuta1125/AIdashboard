import express from 'express';
import store from '../data/store.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/properties - 物件一覧取得（全ユーザー）
router.get('/', authenticate, (req, res) => {
  const properties = store.getAllProperties();
  res.json({ success: true, data: properties });
});

// GET /api/properties/:id - 物件詳細取得（全ユーザー）
router.get('/:id', authenticate, (req, res) => {
  const property = store.findPropertyById(req.params.id);
  if (!property) {
    return res.status(404).json({ success: false, error: '物件が見つかりません' });
  }
  const pdfs = store.getPdfsByPropertyId(req.params.id);
  res.json({
    success: true,
    data: {
      ...property,
      pdfs,
    },
  });
});

// POST /api/properties - 物件登録（管理者のみ）
router.post('/', authenticate, adminOnly, (req, res) => {
  const { name, price } = req.body;

  if (!name || price === undefined || price === '') {
    return res.status(400).json({ success: false, error: '物件名と金額は必須です' });
  }

  if (isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ success: false, error: '金額は有効な数値を入力してください' });
  }

  const property = store.createProperty({ name, price });
  res.status(201).json({ success: true, data: property });
});

// PUT /api/properties/:id - 物件更新（管理者のみ）
router.put('/:id', authenticate, adminOnly, (req, res) => {
  const { name, price } = req.body;

  if (!name || price === undefined || price === '') {
    return res.status(400).json({ success: false, error: '物件名と金額は必須です' });
  }

  if (isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ success: false, error: '金額は有効な数値を入力してください' });
  }

  const property = store.updateProperty(req.params.id, { name, price });
  if (!property) {
    return res.status(404).json({ success: false, error: '物件が見つかりません' });
  }

  res.json({ success: true, data: property });
});

// DELETE /api/properties/:id - 物件削除（管理者のみ）
router.delete('/:id', authenticate, adminOnly, (req, res) => {
  const success = store.deleteProperty(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, error: '物件が見つかりません' });
  }
  res.json({ success: true, message: '物件を削除しました' });
});

export default router;
