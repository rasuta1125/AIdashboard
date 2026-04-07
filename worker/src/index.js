// Cloudflare Workers - 不動産管理API
import bcrypt from 'bcryptjs';
import {
  ensureInitialUsers, findUserByLoginId, findUserById,
  createSession, validateSession, deleteSession,
  getAllProperties, findPropertyById, createProperty, updateProperty, deleteProperty,
  getPdfsByPropertyId, countPdfsByPropertyId, findPdfById, addPdf, deletePdf, getPdfContent,
} from './store.js';

// ==============================
// CORS ヘルパー
// ==============================
function corsHeaders(env, request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = [
    env.FRONTEND_URL,
    'https://aidashboard-anw.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean);

  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || '*');

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonResponse(data, status = 200, env, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
  });
}

function errorResponse(message, status = 400, env, request) {
  return jsonResponse({ success: false, error: message }, status, env, request);
}

// ==============================
// 認証ヘルパー
// ==============================
async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const session = await validateSession(env, token);
  if (!session) return null;
  const user = await findUserById(env, session.userId);
  return user ? { user, token } : null;
}

// ==============================
// マルチパートフォーム解析（PDF用）
// ==============================
async function parsePdfFromRequest(request) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return { error: 'multipart/form-data が必要です' };
  }
  const formData = await request.formData();
  const file = formData.get('pdf');
  if (!file || typeof file === 'string') {
    return { error: 'PDFファイルを選択してください' };
  }
  if (file.type !== 'application/pdf') {
    return { error: 'PDFファイルのみアップロード可能です' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'ファイルサイズは10MB以下にしてください' };
  }
  const buffer = await file.arrayBuffer();
  return { buffer, name: file.name, size: file.size };
}

// ==============================
// ルーティング
// ==============================
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS プリフライト
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(env, request) });
  }

  // ヘルスチェック
  if (path === '/health' || path === '/') {
    return jsonResponse({ status: 'OK', timestamp: new Date().toISOString(), service: '不動産管理API (Cloudflare Workers)' }, 200, env, request);
  }

  // ==============================
  // 認証ルート
  // ==============================

  // POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    try {
      const { loginId, password } = await request.json();
      if (!loginId || !password) return errorResponse('ログインIDとパスワードを入力してください', 400, env, request);

      const user = await findUserByLoginId(env, loginId);
      if (!user) return errorResponse('ログインIDまたはパスワードが間違っています', 401, env, request);

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return errorResponse('ログインIDまたはパスワードが間違っています', 401, env, request);

      const token = await createSession(env, user.id);
      return jsonResponse({
        success: true, token,
        user: { id: user.id, name: user.name, role: user.role, loginId: user.loginId },
      }, 200, env, request);
    } catch (e) {
      console.error('ログインエラー:', e);
      return errorResponse('サーバーエラーが発生しました', 500, env, request);
    }
  }

  // POST /api/auth/logout
  if (path === '/api/auth/logout' && method === 'POST') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    await deleteSession(env, auth.token);
    return jsonResponse({ success: true, message: 'ログアウトしました' }, 200, env, request);
  }

  // GET /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    const { password: _, ...userWithoutPassword } = auth.user;
    return jsonResponse({ success: true, user: userWithoutPassword }, 200, env, request);
  }

  // ==============================
  // 物件ルート（要認証）
  // ==============================

  // GET /api/properties
  if (path === '/api/properties' && method === 'GET') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    try {
      const properties = await getAllProperties(env);
      return jsonResponse({ success: true, data: properties }, 200, env, request);
    } catch (e) {
      console.error(e);
      return errorResponse('サーバーエラーが発生しました', 500, env, request);
    }
  }

  // GET /api/properties/:id
  const propMatch = path.match(/^\/api\/properties\/([^/]+)$/);
  if (propMatch && method === 'GET') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    try {
      const property = await findPropertyById(env, propMatch[1]);
      if (!property) return errorResponse('物件が見つかりません', 404, env, request);
      const pdfs = await getPdfsByPropertyId(env, propMatch[1]);
      return jsonResponse({ success: true, data: { ...property, pdfs } }, 200, env, request);
    } catch (e) {
      console.error(e);
      return errorResponse('サーバーエラーが発生しました', 500, env, request);
    }
  }

  // POST /api/properties（管理者のみ）
  if (path === '/api/properties' && method === 'POST') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errorResponse('管理者権限が必要です', 403, env, request);
    try {
      const { name, price } = await request.json();
      if (!name || price === undefined || price === '') return errorResponse('物件名と金額は必須です', 400, env, request);
      if (isNaN(Number(price)) || Number(price) < 0) return errorResponse('金額は有効な数値を入力してください', 400, env, request);
      const property = await createProperty(env, { name, price });
      return jsonResponse({ success: true, data: property }, 201, env, request);
    } catch (e) {
      console.error(e);
      return errorResponse('サーバーエラーが発生しました', 500, env, request);
    }
  }

  // PUT /api/properties/:id（管理者のみ）
  if (propMatch && method === 'PUT') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errorResponse('管理者権限が必要です', 403, env, request);
    try {
      const { name, price } = await request.json();
      if (!name || price === undefined || price === '') return errorResponse('物件名と金額は必須です', 400, env, request);
      if (isNaN(Number(price)) || Number(price) < 0) return errorResponse('金額は有効な数値を入力してください', 400, env, request);
      const property = await updateProperty(env, propMatch[1], { name, price });
      if (!property) return errorResponse('物件が見つかりません', 404, env, request);
      return jsonResponse({ success: true, data: property }, 200, env, request);
    } catch (e) {
      console.error(e);
      return errorResponse('サーバーエラーが発生しました', 500, env, request);
    }
  }

  // DELETE /api/properties/:id（管理者のみ）
  if (propMatch && method === 'DELETE') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errorResponse('管理者権限が必要です', 403, env, request);
    try {
      const ok = await deleteProperty(env, propMatch[1]);
      if (!ok) return errorResponse('物件が見つかりません', 404, env, request);
      return jsonResponse({ success: true, message: '物件を削除しました' }, 200, env, request);
    } catch (e) {
      console.error(e);
      return errorResponse('サーバーエラーが発生しました', 500, env, request);
    }
  }

  // ==============================
  // PDFルート
  // ==============================

  // POST /api/pdfs/upload/:propertyId（管理者のみ）
  const pdfUploadMatch = path.match(/^\/api\/pdfs\/upload\/([^/]+)$/);
  if (pdfUploadMatch && method === 'POST') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errorResponse('管理者権限が必要です', 403, env, request);
    try {
      const propertyId = pdfUploadMatch[1];
      const property = await findPropertyById(env, propertyId);
      if (!property) return errorResponse('物件が見つかりません', 404, env, request);
      const count = await countPdfsByPropertyId(env, propertyId);
      if (count >= 5) return errorResponse('PDFは1物件につき最大5個まで登録可能です', 400, env, request);

      const parsed = await parsePdfFromRequest(request);
      if (parsed.error) return errorResponse(parsed.error, 400, env, request);

      const pdf = await addPdf(env, propertyId, parsed.buffer, parsed.name, parsed.size);
      return jsonResponse({ success: true, data: pdf }, 201, env, request);
    } catch (e) {
      console.error('PDFアップロードエラー:', e);
      return errorResponse('PDFのアップロードに失敗しました', 500, env, request);
    }
  }

  // GET /api/pdfs/view/:pdfId
  const pdfViewMatch = path.match(/^\/api\/pdfs\/view\/([^/]+)$/);
  if (pdfViewMatch && method === 'GET') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    try {
      const result = await getPdfContent(env, pdfViewMatch[1]);
      if (!result) return errorResponse('PDFが見つかりません', 404, env, request);
      const { response, pdf } = result;
      const buffer = await response.arrayBuffer();
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${encodeURIComponent(pdf.originalName)}"`,
          ...corsHeaders(env, request),
        },
      });
    } catch (e) {
      console.error(e);
      return errorResponse('PDFの取得に失敗しました', 500, env, request);
    }
  }

  // GET /api/pdfs/download/:pdfId
  const pdfDownloadMatch = path.match(/^\/api\/pdfs\/download\/([^/]+)$/);
  if (pdfDownloadMatch && method === 'GET') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    try {
      const result = await getPdfContent(env, pdfDownloadMatch[1]);
      if (!result) return errorResponse('PDFが見つかりません', 404, env, request);
      const { response, pdf } = result;
      const buffer = await response.arrayBuffer();
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(pdf.originalName)}"`,
          ...corsHeaders(env, request),
        },
      });
    } catch (e) {
      console.error(e);
      return errorResponse('PDFのダウンロードに失敗しました', 500, env, request);
    }
  }

  // DELETE /api/pdfs/:pdfId（管理者のみ）
  const pdfDeleteMatch = path.match(/^\/api\/pdfs\/([^/]+)$/);
  if (pdfDeleteMatch && method === 'DELETE') {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errorResponse('管理者権限が必要です', 403, env, request);
    try {
      const pdf = await deletePdf(env, pdfDeleteMatch[1]);
      if (!pdf) return errorResponse('PDFが見つかりません', 404, env, request);
      return jsonResponse({ success: true, message: 'PDFを削除しました' }, 200, env, request);
    } catch (e) {
      console.error(e);
      return errorResponse('PDFの削除に失敗しました', 500, env, request);
    }
  }

  // 404
  return errorResponse('エンドポイントが見つかりません', 404, env, request);
}

// ==============================
// Workers エントリーポイント
// ==============================
export default {
  async fetch(request, env, ctx) {
    // 初期ユーザー確認（初回のみ）
    ctx.waitUntil(ensureInitialUsers(env).catch(console.error));
    return handleRequest(request, env);
  },
};
