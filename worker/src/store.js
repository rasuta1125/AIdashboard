// データストア（Firestore REST API使用）
import bcrypt from 'bcryptjs';
import { firestoreGet, firestoreSet, firestoreDelete, firestoreQuery, storageUpload, storageDownload, storageDelete } from './firebase.js';

// UUID生成（Workers対応）
function uuidv4() {
  return crypto.randomUUID();
}

const SESSION_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000; // 7日

// ==============================
// 初期ユーザー確認・作成
// ==============================
export async function ensureInitialUsers(env) {
  const users = await firestoreQuery(env, 'users');
  if (users.length > 0) return;

  const hashedAdmin = await bcrypt.hash('goldkei123!', 10);
  const hashedUser = await bcrypt.hash('user123', 10);

  await firestoreSet(env, 'users', '1', {
    id: '1', loginId: 'goldkei', password: hashedAdmin,
    name: '管理者', role: 'admin', createdAt: new Date().toISOString(),
  });
  await firestoreSet(env, 'users', '2', {
    id: '2', loginId: 'user', password: hashedUser,
    name: '利用ユーザー', role: 'user', createdAt: new Date().toISOString(),
  });
  console.log('初期ユーザーを作成しました');
}

// ==============================
// ユーザー
// ==============================
export async function findUserByLoginId(env, loginId) {
  const users = await firestoreQuery(env, 'users', [{ field: 'loginId', value: loginId }]);
  return users[0] || null;
}

export async function findUserById(env, id) {
  return await firestoreGet(env, 'users', String(id));
}

// ==============================
// セッション
// ==============================
export async function createSession(env, userId) {
  const token = uuidv4();
  await firestoreSet(env, 'sessions', token, {
    userId: String(userId),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRE_MS,
  });
  return token;
}

export async function validateSession(env, token) {
  if (!token) return null;
  const session = await firestoreGet(env, 'sessions', token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    await firestoreDelete(env, 'sessions', token);
    return null;
  }
  return session;
}

export async function deleteSession(env, token) {
  if (token) await firestoreDelete(env, 'sessions', token);
}

// ==============================
// 物件
// ==============================
export async function getAllProperties(env) {
  const properties = await firestoreQuery(env, 'properties', [], { field: 'createdAt', direction: 'DESCENDING' });
  // PDF数を付与
  const result = await Promise.all(properties.map(async (prop) => {
    const pdfs = await firestoreQuery(env, 'pdfs', [{ field: 'propertyId', value: prop.id }]);
    return { ...prop, pdfCount: pdfs.length };
  }));
  return result;
}

export async function findPropertyById(env, id) {
  return await firestoreGet(env, 'properties', id);
}

export async function createProperty(env, { name, price }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const property = { id, name, price: Number(price), createdAt: now, updatedAt: now };
  await firestoreSet(env, 'properties', id, property);
  return property;
}

export async function updateProperty(env, id, { name, price }) {
  const existing = await firestoreGet(env, 'properties', id);
  if (!existing) return null;
  const updated = { ...existing, name, price: Number(price), updatedAt: new Date().toISOString() };
  delete updated._id;
  await firestoreSet(env, 'properties', id, updated);
  return updated;
}

export async function deleteProperty(env, id) {
  const existing = await firestoreGet(env, 'properties', id);
  if (!existing) return false;
  // 関連PDFも削除
  const pdfs = await firestoreQuery(env, 'pdfs', [{ field: 'propertyId', value: id }]);
  await Promise.all(pdfs.map(async (pdf) => {
    try { await storageDelete(env, pdf.storagePath); } catch (e) { }
    await firestoreDelete(env, 'pdfs', pdf.id);
  }));
  await firestoreDelete(env, 'properties', id);
  return true;
}

// ==============================
// PDF
// ==============================
export async function getPdfsByPropertyId(env, propertyId) {
  return await firestoreQuery(env, 'pdfs', [{ field: 'propertyId', value: propertyId }], { field: 'uploadedAt', direction: 'ASCENDING' });
}

export async function countPdfsByPropertyId(env, propertyId) {
  const pdfs = await firestoreQuery(env, 'pdfs', [{ field: 'propertyId', value: propertyId }]);
  return pdfs.length;
}

export async function findPdfById(env, id) {
  return await firestoreGet(env, 'pdfs', id);
}

export async function addPdf(env, propertyId, fileBuffer, originalName, size) {
  const id = uuidv4();
  const storagePath = `pdfs/${propertyId}/${id}_${originalName}`;

  await storageUpload(env, storagePath, fileBuffer, 'application/pdf');

  const pdf = {
    id, propertyId, originalName, storagePath,
    size, uploadedAt: new Date().toISOString(),
  };
  await firestoreSet(env, 'pdfs', id, pdf);
  return pdf;
}

export async function deletePdf(env, id) {
  const pdf = await firestoreGet(env, 'pdfs', id);
  if (!pdf) return null;
  try { await storageDelete(env, pdf.storagePath); } catch (e) { }
  await firestoreDelete(env, 'pdfs', id);
  return pdf;
}

export async function getPdfContent(env, id) {
  const pdf = await firestoreGet(env, 'pdfs', id);
  if (!pdf) return null;
  const res = await storageDownload(env, pdf.storagePath);
  if (!res) return null;
  return { response: res, pdf };
}
