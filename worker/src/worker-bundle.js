// ============================================================
// 不動産管理API - Cloudflare Workers (全ファイル統合版)
// bcryptjs不使用・Web Crypto API使用版
// ============================================================

// ============================================================
// パスワードハッシュ（Web Crypto API使用）
// bcryptの代替：PBKDF2でハッシュ化
// ============================================================
async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password, stored) {
  // bcryptハッシュ（既存データ）との互換のため、bcryptは別途対応
  // 新形式: pbkdf2:salt:hash
  if (stored.startsWith('pbkdf2:')) {
    const [, saltHex, hashHex] = stored.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    const computedHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHex === hashHex;
  }
  // bcrypt形式（$2b$）→ 簡易チェック不可のためFirestoreに平文フラグで比較
  // 初回移行時のみ: プレーンテキスト比較フォールバック
  if (stored.startsWith('$2')) {
    // bcryptはWorkerで動かないため、Firestoreに保存済みの初期ユーザーは
    // 再作成時にPBKDF2形式で上書きする
    return false;
  }
  return false;
}

// ============================================================
// Firebase REST API
// ============================================================
async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.read_write',
  };
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  // シークレットの\nを実際の改行に変換（Cloudflare Workersでは\\nで入ることがある）
  const privateKey = env.FIREBASE_PRIVATE_KEY
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .trim();
  const cryptoKey = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, cryptoKey, new TextEncoder().encode(signingInput));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${signingInput}.${encodedSignature}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await response.json();
  if (!data.access_token) throw new Error('アクセストークン取得失敗: ' + JSON.stringify(data));
  return data.access_token;
}

async function importPrivateKey(pem) {
  // \n（文字列）と実際の改行の両方に対応
  const normalizedPem = pem
    .replace(/\\n/g, '\n')  // エスケープされた\nを実際の改行に
    .replace(/\\r/g, '')    // \rを削除
    .trim();
  const pemBody = normalizedPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/[\r\n\s]/g, '');  // 全空白・改行を除去
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

function firestoreBase(env) {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

function fromFirestore(doc) {
  if (!doc || !doc.fields) return null;
  const result = { _id: doc.name?.split('/').pop() };
  for (const [key, value] of Object.entries(doc.fields)) result[key] = parseFirestoreValue(value);
  return result;
}

function parseFirestoreValue(value) {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue !== undefined) return (value.arrayValue.values || []).map(parseFirestoreValue);
  if (value.mapValue !== undefined) {
    const obj = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) obj[k] = parseFirestoreValue(v);
    return obj;
  }
  if (value.timestampValue !== undefined) return value.timestampValue;
  return null;
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) fields[key] = toFirestoreValue(value);
  return { fields };
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])) } };
  return { stringValue: String(value) };
}

async function firestoreGet(env, collection, docId) {
  const token = await getAccessToken(env);
  const res = await fetch(`${firestoreBase(env)}/${collection}/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  return fromFirestore(await res.json());
}

async function firestoreSet(env, collection, docId, obj) {
  const token = await getAccessToken(env);
  const res = await fetch(`${firestoreBase(env)}/${collection}/${docId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toFirestoreFields(obj)),
  });
  return fromFirestore(await res.json());
}

async function firestoreDelete(env, collection, docId) {
  const token = await getAccessToken(env);
  await fetch(`${firestoreBase(env)}/${collection}/${docId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}

async function firestoreQuery(env, collection, filters = [], orderBy = null) {
  const token = await getAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const structuredQuery = { from: [{ collectionId: collection }] };
  if (filters.length > 0) {
    structuredQuery.where = filters.length === 1
      ? buildFieldFilter(filters[0])
      : { compositeFilter: { op: 'AND', filters: filters.map(buildFieldFilter) } };
  }
  if (orderBy) structuredQuery.orderBy = [{ field: { fieldPath: orderBy.field }, direction: orderBy.direction || 'ASCENDING' }];
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
  });
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.filter(r => r.document).map(r => fromFirestore(r.document));
}

function buildFieldFilter({ field, op, value }) {
  return { fieldFilter: { field: { fieldPath: field }, op: op || 'EQUAL', value: toFirestoreValue(value) } };
}

async function storageUpload(env, storagePath, fileBuffer, contentType) {
  const token = await getAccessToken(env);
  const bucket = env.FIREBASE_STORAGE_BUCKET;
  // Firebase Storage REST API: nameパラメータはスラッシュを含むパスをエンコード
  const encodedName = encodeURIComponent(storagePath);
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodedName}`;
  console.log('Storage upload URL:', uploadUrl.replace(token, '[TOKEN]'));
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body: fileBuffer,
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Storage upload failed:', res.status, errText);
    throw new Error(`Storage upload failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function storageDownload(env, storagePath) {
  const token = await getAccessToken(env);
  const bucket = env.FIREBASE_STORAGE_BUCKET;
  const encodedPath = encodeURIComponent(storagePath);
  const res = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodedPath}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res;
}

async function storageDelete(env, storagePath) {
  const token = await getAccessToken(env);
  const bucket = env.FIREBASE_STORAGE_BUCKET;
  const encodedPath = encodeURIComponent(storagePath);
  await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodedPath}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
}

// ============================================================
// データストア
// ============================================================
const SESSION_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;

async function ensureInitialUsers(env) {
  // 既存ユーザーを確認（PBKDF2形式かどうか）
  const admin = await firestoreGet(env, 'users', '1');
  // 存在しないか、bcrypt形式（$2b$）のままなら再作成
  if (!admin || admin.password.startsWith('$2')) {
    const hashedAdmin = await hashPassword('goldkei123!');
    const hashedUser = await hashPassword('user123');
    await firestoreSet(env, 'users', '1', {
      id: '1', loginId: 'goldkei', password: hashedAdmin,
      name: '管理者', role: 'admin', createdAt: new Date().toISOString(),
    });
    await firestoreSet(env, 'users', '2', {
      id: '2', loginId: 'user', password: hashedUser,
      name: '利用ユーザー', role: 'user', createdAt: new Date().toISOString(),
    });
    console.log('初期ユーザーをPBKDF2形式で作成/更新しました');
  }
}

async function findUserByLoginId(env, loginId) {
  const users = await firestoreQuery(env, 'users', [{ field: 'loginId', value: loginId }]);
  return users[0] || null;
}

async function findUserById(env, id) {
  return await firestoreGet(env, 'users', String(id));
}

async function createSession(env, userId) {
  const token = crypto.randomUUID();
  await firestoreSet(env, 'sessions', token, {
    userId: String(userId), createdAt: Date.now(), expiresAt: Date.now() + SESSION_EXPIRE_MS,
  });
  return token;
}

async function validateSession(env, token) {
  if (!token) return null;
  const session = await firestoreGet(env, 'sessions', token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) { await firestoreDelete(env, 'sessions', token); return null; }
  return session;
}

async function deleteSession(env, token) {
  if (token) await firestoreDelete(env, 'sessions', token);
}

async function getAllProperties(env) {
  const properties = await firestoreQuery(env, 'properties', [], { field: 'createdAt', direction: 'DESCENDING' });
  return await Promise.all(properties.map(async (prop) => {
    const pdfs = await firestoreQuery(env, 'pdfs', [{ field: 'propertyId', value: prop.id }]);
    return { ...prop, pdfCount: pdfs.length };
  }));
}

async function findPropertyById(env, id) {
  return await firestoreGet(env, 'properties', id);
}

async function createProperty(env, { name, price }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const property = { id, name, price: Number(price), createdAt: now, updatedAt: now };
  await firestoreSet(env, 'properties', id, property);
  return property;
}

async function updateProperty(env, id, { name, price }) {
  const existing = await firestoreGet(env, 'properties', id);
  if (!existing) return null;
  const updated = { ...existing, name, price: Number(price), updatedAt: new Date().toISOString() };
  delete updated._id;
  await firestoreSet(env, 'properties', id, updated);
  return updated;
}

async function deleteProperty(env, id) {
  const existing = await firestoreGet(env, 'properties', id);
  if (!existing) return false;
  const pdfs = await firestoreQuery(env, 'pdfs', [{ field: 'propertyId', value: id }]);
  await Promise.all(pdfs.map(async (pdf) => {
    try { await storageDelete(env, pdf.storagePath); } catch (e) { }
    await firestoreDelete(env, 'pdfs', pdf.id);
  }));
  await firestoreDelete(env, 'properties', id);
  return true;
}

async function getPdfsByPropertyId(env, propertyId) {
  return await firestoreQuery(env, 'pdfs', [{ field: 'propertyId', value: propertyId }], { field: 'uploadedAt', direction: 'ASCENDING' });
}

async function countPdfsByPropertyId(env, propertyId) {
  const pdfs = await firestoreQuery(env, 'pdfs', [{ field: 'propertyId', value: propertyId }]);
  return pdfs.length;
}

async function addPdf(env, propertyId, fileBuffer, originalName, size) {
  const id = crypto.randomUUID();
  // ファイル名を安全な形式に変換（スペースや特殊文字を除去）
  const safeFileName = originalName.replace(/[^\w.\-]/g, '_');
  const storagePath = `pdfs/${propertyId}/${id}_${safeFileName}`;
  await storageUpload(env, storagePath, fileBuffer, 'application/pdf');
  const pdf = { id, propertyId, originalName, storagePath, size, uploadedAt: new Date().toISOString() };
  await firestoreSet(env, 'pdfs', id, pdf);
  return pdf;
}

async function deletePdf(env, id) {
  const pdf = await firestoreGet(env, 'pdfs', id);
  if (!pdf) return null;
  try { await storageDelete(env, pdf.storagePath); } catch (e) { }
  await firestoreDelete(env, 'pdfs', id);
  return pdf;
}

async function getPdfContent(env, id) {
  const pdf = await firestoreGet(env, 'pdfs', id);
  if (!pdf) return null;
  const res = await storageDownload(env, pdf.storagePath);
  if (!res) return null;
  return { response: res, pdf };
}

// ============================================================
// CORS・レスポンスヘルパー
// ============================================================
function corsHeaders(env, request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = [
    env.FRONTEND_URL,
    'https://aidashboard-anw.pages.dev',
    'http://localhost:5173',
  ].filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || '*');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonRes(data, status = 200, env, req) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(env, req) } });
}

function errRes(msg, status = 400, env, req) {
  return jsonRes({ success: false, error: msg }, status, env, req);
}

async function authCheck(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const session = await validateSession(env, token);
  if (!session) return null;
  const user = await findUserById(env, session.userId);
  return user ? { user, token } : null;
}

async function parsePdf(request) {
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.includes('multipart/form-data')) return { error: 'multipart/form-data が必要です' };
  const formData = await request.formData();
  const file = formData.get('pdf');
  if (!file || typeof file === 'string') return { error: 'PDFファイルを選択してください' };
  if (file.type !== 'application/pdf') return { error: 'PDFファイルのみアップロード可能です' };
  if (file.size > 10 * 1024 * 1024) return { error: 'ファイルサイズは10MB以下にしてください' };
  return { buffer: await file.arrayBuffer(), name: file.name, size: file.size };
}

// ============================================================
// メインハンドラー
// ============================================================
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env, request) });

  if (path === '/health' || path === '/') {
    return jsonRes({ status: 'OK', timestamp: new Date().toISOString(), service: '不動産管理API' }, 200, env, request);
  }

  // 認証
  if (path === '/api/auth/login' && method === 'POST') {
    try {
      const { loginId, password } = await request.json();
      if (!loginId || !password) return errRes('ログインIDとパスワードを入力してください', 400, env, request);
      console.log('ログイン試行:', loginId);
      console.log('FIREBASE_PROJECT_ID:', env.FIREBASE_PROJECT_ID ? '設定済み' : '未設定');
      console.log('FIREBASE_CLIENT_EMAIL:', env.FIREBASE_CLIENT_EMAIL ? '設定済み' : '未設定');
      console.log('FIREBASE_PRIVATE_KEY:', env.FIREBASE_PRIVATE_KEY ? '設定済み' : '未設定');
      const user = await findUserByLoginId(env, loginId);
      console.log('ユーザー検索結果:', user ? 'found' : 'not found');
      if (!user) return errRes('ログインIDまたはパスワードが間違っています', 401, env, request);
      const valid = await verifyPassword(password, user.password);
      console.log('パスワード検証:', valid);
      if (!valid) return errRes('ログインIDまたはパスワードが間違っています', 401, env, request);
      const token = await createSession(env, user.id);
      return jsonRes({ success: true, token, user: { id: user.id, name: user.name, role: user.role, loginId: user.loginId } }, 200, env, request);
    } catch (e) { console.error('ログインエラー詳細:', e.message, e.stack); return errRes('サーバーエラー: ' + e.message, 500, env, request); }
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    await deleteSession(env, auth.token);
    return jsonRes({ success: true, message: 'ログアウトしました' }, 200, env, request);
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    const { password: _, ...u } = auth.user;
    return jsonRes({ success: true, user: u }, 200, env, request);
  }

  // 物件
  if (path === '/api/properties' && method === 'GET') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    try { return jsonRes({ success: true, data: await getAllProperties(env) }, 200, env, request); }
    catch (e) { return errRes('サーバーエラーが発生しました', 500, env, request); }
  }

  const propMatch = path.match(/^\/api\/properties\/([^/]+)$/);

  if (propMatch && method === 'GET') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    try {
      const property = await findPropertyById(env, propMatch[1]);
      if (!property) return errRes('物件が見つかりません', 404, env, request);
      const pdfs = await getPdfsByPropertyId(env, propMatch[1]);
      return jsonRes({ success: true, data: { ...property, pdfs } }, 200, env, request);
    } catch (e) { return errRes('サーバーエラーが発生しました', 500, env, request); }
  }

  if (path === '/api/properties' && method === 'POST') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errRes('管理者権限が必要です', 403, env, request);
    try {
      const { name, price } = await request.json();
      if (!name || price === undefined || price === '') return errRes('物件名と金額は必須です', 400, env, request);
      if (isNaN(Number(price)) || Number(price) < 0) return errRes('金額は有効な数値を入力してください', 400, env, request);
      return jsonRes({ success: true, data: await createProperty(env, { name, price }) }, 201, env, request);
    } catch (e) { return errRes('サーバーエラーが発生しました', 500, env, request); }
  }

  if (propMatch && method === 'PUT') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errRes('管理者権限が必要です', 403, env, request);
    try {
      const { name, price } = await request.json();
      if (!name || price === undefined || price === '') return errRes('物件名と金額は必須です', 400, env, request);
      if (isNaN(Number(price)) || Number(price) < 0) return errRes('金額は有効な数値を入力してください', 400, env, request);
      const property = await updateProperty(env, propMatch[1], { name, price });
      if (!property) return errRes('物件が見つかりません', 404, env, request);
      return jsonRes({ success: true, data: property }, 200, env, request);
    } catch (e) { return errRes('サーバーエラーが発生しました', 500, env, request); }
  }

  if (propMatch && method === 'DELETE') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errRes('管理者権限が必要です', 403, env, request);
    try {
      const ok = await deleteProperty(env, propMatch[1]);
      if (!ok) return errRes('物件が見つかりません', 404, env, request);
      return jsonRes({ success: true, message: '物件を削除しました' }, 200, env, request);
    } catch (e) { return errRes('サーバーエラーが発生しました', 500, env, request); }
  }

  // PDF
  const pdfUploadMatch = path.match(/^\/api\/pdfs\/upload\/([^/]+)$/);
  if (pdfUploadMatch && method === 'POST') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errRes('管理者権限が必要です', 403, env, request);
    try {
      const propertyId = pdfUploadMatch[1];
      const property = await findPropertyById(env, propertyId);
      if (!property) return errRes('物件が見つかりません', 404, env, request);
      const count = await countPdfsByPropertyId(env, propertyId);
      if (count >= 5) return errRes('PDFは1物件につき最大5個まで登録可能です', 400, env, request);
      const parsed = await parsePdf(request);
      if (parsed.error) return errRes(parsed.error, 400, env, request);
      const pdf = await addPdf(env, propertyId, parsed.buffer, parsed.name, parsed.size);
      return jsonRes({ success: true, data: pdf }, 201, env, request);
    } catch (e) {
      console.error('PDF upload error:', e.message, e.stack);
      return errRes('PDFのアップロードに失敗しました: ' + e.message, 500, env, request);
    }
  }

  const pdfViewMatch = path.match(/^\/api\/pdfs\/view\/([^/]+)$/);
  if (pdfViewMatch && method === 'GET') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    try {
      const result = await getPdfContent(env, pdfViewMatch[1]);
      if (!result) return errRes('PDFが見つかりません', 404, env, request);
      const { response, pdf } = result;
      const buffer = await response.arrayBuffer();
      return new Response(buffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${encodeURIComponent(pdf.originalName)}"`, ...corsHeaders(env, request) } });
    } catch (e) { return errRes('PDFの取得に失敗しました', 500, env, request); }
  }

  const pdfDownloadMatch = path.match(/^\/api\/pdfs\/download\/([^/]+)$/);
  if (pdfDownloadMatch && method === 'GET') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    try {
      const result = await getPdfContent(env, pdfDownloadMatch[1]);
      if (!result) return errRes('PDFが見つかりません', 404, env, request);
      const { response, pdf } = result;
      const buffer = await response.arrayBuffer();
      return new Response(buffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${encodeURIComponent(pdf.originalName)}"`, ...corsHeaders(env, request) } });
    } catch (e) { return errRes('PDFのダウンロードに失敗しました', 500, env, request); }
  }

  const pdfDeleteMatch = path.match(/^\/api\/pdfs\/([^/]+)$/);
  if (pdfDeleteMatch && method === 'DELETE') {
    const auth = await authCheck(request, env);
    if (!auth) return errRes('認証が必要です', 401, env, request);
    if (auth.user.role !== 'admin') return errRes('管理者権限が必要です', 403, env, request);
    try {
      const pdf = await deletePdf(env, pdfDeleteMatch[1]);
      if (!pdf) return errRes('PDFが見つかりません', 404, env, request);
      return jsonRes({ success: true, message: 'PDFを削除しました' }, 200, env, request);
    } catch (e) { return errRes('PDFの削除に失敗しました', 500, env, request); }
  }

  return errRes('エンドポイントが見つかりません', 404, env, request);
}

// ============================================================
// エントリーポイント
// ============================================================
export default {
  async fetch(request, env, ctx) {
    ctx.waitUntil(ensureInitialUsers(env).catch(console.error));
    return handleRequest(request, env);
  },
};
