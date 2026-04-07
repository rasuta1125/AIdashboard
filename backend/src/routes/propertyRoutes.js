import express from 'express';
import store from '../data/firebaseStore.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/properties - 物件一覧取得（全ユーザー）
router.get('/', authenticate, async (req, res) => {
  try {
    const properties = await store.getAllProperties();
    res.json({ success: true, data: properties });
  } catch (err) {
    console.error('物件一覧取得エラー:', err);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// GET /api/properties/:id - 物件詳細取得（全ユーザー）
router.get('/:id', authenticate, async (req, res) => {
  try {
    const property = await store.findPropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: '物件が見つかりません' });
    }
    const pdfs = await store.getPdfsByPropertyId(req.params.id);
    res.json({ success: true, data: { ...property, pdfs } });
  } catch (err) {
    console.error('物件詳細取得エラー:', err);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// POST /api/properties - 物件登録（管理者のみ）
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, price } = req.body;

    if (!name || price === undefined || price === '') {
      return res.status(400).json({ success: false, error: '物件名と金額は必須です' });
    }
    if (isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, error: '金額は有効な数値を入力してください' });
    }

    const property = await store.createProperty({ name, price });
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    console.error('物件登録エラー:', err);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// PUT /api/properties/:id - 物件更新（管理者のみ）
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, price } = req.body;

    if (!name || price === undefined || price === '') {
      return res.status(400).json({ success: false, error: '物件名と金額は必須です' });
    }
    if (isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, error: '金額は有効な数値を入力してください' });
    }

    const property = await store.updateProperty(req.params.id, { name, price });
    if (!property) {
      return res.status(404).json({ success: false, error: '物件が見つかりません' });
    }
    res.json({ success: true, data: property });
  } catch (err) {
    console.error('物件更新エラー:', err);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// DELETE /api/properties/:id - 物件削除（管理者のみ）
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const success = await store.deleteProperty(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: '物件が見つかりません' });
    }
    res.json({ success: true, message: '物件を削除しました' });
  } catch (err) {
    console.error('物件削除エラー:', err);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

export default router;
