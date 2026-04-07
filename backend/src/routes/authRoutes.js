import express from 'express';
import bcrypt from 'bcryptjs';
import store from '../data/firebaseStore.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ success: false, error: 'ログインIDとパスワードを入力してください' });
    }

    const user = await store.findUserByLoginId(loginId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'ログインIDまたはパスワードが間違っています' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'ログインIDまたはパスワードが間違っています' });
    }

    const token = await store.createSession(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        loginId: user.loginId,
      },
    });
  } catch (err) {
    console.error('ログインエラー:', err);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await store.deleteSession(req.token);
  res.json({ success: true, message: 'ログアウトしました' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ success: true, user: userWithoutPassword });
});

export default router;
