import store from '../data/store.js';

// 認証ミドルウェア
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '認証が必要です' });
  }

  const token = authHeader.substring(7);
  const user = store.validateSession(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'セッションが無効です。再ログインしてください' });
  }

  req.user = user;
  req.token = token;
  next();
};

// 管理者のみ許可
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '管理者権限が必要です' });
  }
  next();
};
