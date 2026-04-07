// Firebase REST API クライアント（Cloudflare Workers用）
// firebase-adminの代わりにREST APIを使用

// Google OAuth2 アクセストークン取得（サービスアカウントJWT）
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

  // JWTを作成
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // RSA署名
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const cryptoKey = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signingInput}.${encodedSignature}`;

  // トークン交換
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
  const pemBody = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

// Firestore REST API ベースURL
function firestoreBase(env) {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

// Firestore ドキュメントをJS オブジェクトに変換
function fromFirestore(doc) {
  if (!doc || !doc.fields) return null;
  const result = { _id: doc.name?.split('/').pop() };
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = parseFirestoreValue(value);
  }
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

// JS オブジェクトをFirestore形式に変換
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(value);
  }
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
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])) } };
  }
  return { stringValue: String(value) };
}

// ==============================
// Firestore CRUD
// ==============================
export async function firestoreGet(env, collection, docId) {
  const token = await getAccessToken(env);
  const url = `${firestoreBase(env)}/${collection}/${docId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  const data = await res.json();
  return fromFirestore(data);
}

export async function firestoreSet(env, collection, docId, obj) {
  const token = await getAccessToken(env);
  const url = `${firestoreBase(env)}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toFirestoreFields(obj)),
  });
  const data = await res.json();
  return fromFirestore(data);
}

export async function firestoreDelete(env, collection, docId) {
  const token = await getAccessToken(env);
  const url = `${firestoreBase(env)}/${collection}/${docId}`;
  await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}

export async function firestoreQuery(env, collection, filters = [], orderBy = null) {
  const token = await getAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

  const structuredQuery = {
    from: [{ collectionId: collection }],
  };

  if (filters.length > 0) {
    structuredQuery.where = filters.length === 1
      ? buildFieldFilter(filters[0])
      : { compositeFilter: { op: 'AND', filters: filters.map(buildFieldFilter) } };
  }

  if (orderBy) {
    structuredQuery.orderBy = [{ field: { fieldPath: orderBy.field }, direction: orderBy.direction || 'ASCENDING' }];
  }

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
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op: op || 'EQUAL',
      value: toFirestoreValue(value),
    },
  };
}

// ==============================
// Firebase Storage REST API
// ==============================
export async function storageUpload(env, storagePath, fileBuffer, contentType) {
  const token = await getAccessToken(env);
  const bucket = env.FIREBASE_STORAGE_BUCKET;
  const encodedPath = encodeURIComponent(storagePath);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodedPath}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('Storage upload failed: ' + err);
  }
  return await res.json();
}

export async function storageDownload(env, storagePath) {
  const token = await getAccessToken(env);
  const bucket = env.FIREBASE_STORAGE_BUCKET;
  const encodedPath = encodeURIComponent(storagePath);
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedPath}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res;
}

export async function storageDelete(env, storagePath) {
  const token = await getAccessToken(env);
  const bucket = env.FIREBASE_STORAGE_BUCKET;
  const encodedPath = encodeURIComponent(storagePath);
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedPath}`;

  await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function storageGetSignedUrl(env, storagePath) {
  // Public URL (Storage rules must allow read)
  const bucket = env.FIREBASE_STORAGE_BUCKET;
  const encodedPath = encodeURIComponent(storagePath);
  return `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedPath}?alt=media`;
}
