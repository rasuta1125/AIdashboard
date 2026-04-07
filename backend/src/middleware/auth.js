import store from '../data/firebaseStore.js';

// 認証ミドルウェア（非同期）
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '認証が必要です' });
  }

  const token = authHeader.substring(7);
  try {
    const session = await store.validateSession(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'セッションが無効です。再ログインしてください' });
    }

    const user = await store.findUserById(session.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'ユーザーが見つかりません' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    console.error('認証エラー:', err);
    return res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
};

// 管理者のみ許可
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '管理者権限が必要です' });
  }
  next();
};
