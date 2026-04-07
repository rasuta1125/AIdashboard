const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const getToken = () => localStorage.getItem('token');

// 401エラー時にログイン画面へ強制リダイレクト
const handleUnauthorized = () => {
  localStorage.removeItem('token');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const request = async (method, path, body = null, isFormData = false) => {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (err) {
    throw new Error('サーバーに接続できません。しばらく待ってから再試行してください。');
  }

  // 401: セッション切れ → 自動ログアウト
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('セッションが切れました。再ログインしてください。');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTPエラー: ${res.status}` }));
    throw new Error(err.error || `HTTPエラー: ${res.status}`);
  }
  return res.json();
};

// 認証API
export const authApi = {
  login: (loginId, password) => request('POST', '/api/auth/login', { loginId, password }),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me'),
};

// 物件API
export const propertyApi = {
  getAll: () => request('GET', '/api/properties'),
  getById: (id) => request('GET', `/api/properties/${id}`),
  create: (data) => request('POST', '/api/properties', data),
  update: (id, data) => request('PUT', `/api/properties/${id}`, data),
  delete: (id) => request('DELETE', `/api/properties/${id}`),
};

// PDF API
export const pdfApi = {
  upload: (propertyId, file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return request('POST', `/api/pdfs/upload/${propertyId}`, formData, true);
  },
  view: async (pdfId) => {
    const token = getToken();
    let res;
    try {
      res = await fetch(`${API_BASE_URL}/api/pdfs/view/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new Error('サーバーに接続できません。');
    }
    if (res.status === 401) { handleUnauthorized(); throw new Error('セッションが切れました。'); }
    if (!res.ok) throw new Error('PDFの取得に失敗しました');
    return res.blob();
  },
  download: async (pdfId, filename) => {
    const token = getToken();
    let res;
    try {
      res = await fetch(`${API_BASE_URL}/api/pdfs/download/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new Error('サーバーに接続できません。');
    }
    if (res.status === 401) { handleUnauthorized(); throw new Error('セッションが切れました。'); }
    if (!res.ok) throw new Error('ダウンロードに失敗しました');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  delete: (pdfId) => request('DELETE', `/api/pdfs/${pdfId}`),
};

export default { authApi, propertyApi, pdfApi };
