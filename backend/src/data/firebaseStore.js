// Firebase Firestore + Storage を使ったデータストア
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// .envを確実に読み込む（backend/.env）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// src/data/ から2つ上が backend/
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Firebase Admin 初期化
let db, bucket;

function initFirebase() {
  if (admin.apps.length > 0) return; // 既に初期化済み

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: 'googleapis.com',
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  console.log('✅ Firebase Admin initialized');
}

initFirebase();
db = admin.firestore();
bucket = admin.storage().bucket();

// ==============================
// 初期ユーザーデータ（Firestoreに存在しない場合のみ作成）
// ==============================
async function ensureInitialUsers() {
  const usersRef = db.collection('users');
  const snap = await usersRef.limit(1).get();
  if (!snap.empty) return; // 既にユーザーが存在する

  const hashedAdmin = await bcrypt.hash('goldkei123!', 10);
  const hashedUser = await bcrypt.hash('user123', 10);

  await usersRef.doc('1').set({
    id: '1',
    loginId: 'goldkei',
    password: hashedAdmin,
    name: '管理者',
    role: 'admin',
    createdAt: new Date().toISOString(),
  });

  await usersRef.doc('2').set({
    id: '2',
    loginId: 'user',
    password: hashedUser,
    name: '利用ユーザー',
    role: 'user',
    createdAt: new Date().toISOString(),
  });

  console.log('✅ 初期ユーザーを作成しました');
}

ensureInitialUsers().catch(console.error);

// ==============================
// セッション管理（Firestore）
// ==============================
const SESSION_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000; // 7日

async function createSession(userId) {
  const token = uuidv4();
  const expiresAt = Date.now() + SESSION_EXPIRE_MS;
  await db.collection('sessions').doc(token).set({
    userId,
    createdAt: Date.now(),
    expiresAt,
  });
  return token;
}

async function validateSession(token) {
  if (!token) return null;
  const doc = await db.collection('sessions').doc(token).get();
  if (!doc.exists) return null;
  const session = doc.data();
  if (Date.now() > session.expiresAt) {
    await db.collection('sessions').doc(token).delete();
    return null;
  }
  return session;
}

async function deleteSession(token) {
  if (!token) return;
  await db.collection('sessions').doc(token).delete();
}

// ==============================
// ユーザー管理
// ==============================
async function findUserByLoginId(loginId) {
  const snap = await db.collection('users').where('loginId', '==', loginId).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}

async function findUserById(id) {
  const doc = await db.collection('users').doc(String(id)).get();
  if (!doc.exists) return null;
  return doc.data();
}

// ==============================
// 物件管理（Firestore）
// ==============================
async function getAllProperties() {
  const snap = await db.collection('properties').orderBy('createdAt', 'desc').get();
  const properties = [];
  for (const doc of snap.docs) {
    const prop = doc.data();
    // PDFカウントを取得
    const pdfSnap = await db.collection('pdfs').where('propertyId', '==', doc.id).get();
    properties.push({ ...prop, pdfCount: pdfSnap.size });
  }
  return properties;
}

async function findPropertyById(id) {
  const doc = await db.collection('properties').doc(id).get();
  if (!doc.exists) return null;
  return doc.data();
}

async function createProperty({ name, price }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const property = {
    id,
    name,
    price: Number(price),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection('properties').doc(id).set(property);
  return property;
}

async function updateProperty(id, { name, price }) {
  const doc = await db.collection('properties').doc(id).get();
  if (!doc.exists) return null;
  const updated = {
    ...doc.data(),
    name,
    price: Number(price),
    updatedAt: new Date().toISOString(),
  };
  await db.collection('properties').doc(id).set(updated);
  return updated;
}

async function deleteProperty(id) {
  const doc = await db.collection('properties').doc(id).get();
  if (!doc.exists) return false;

  // 関連PDFをFirestore + Storageから削除
  const pdfSnap = await db.collection('pdfs').where('propertyId', '==', id).get();
  for (const pdfDoc of pdfSnap.docs) {
    const pdf = pdfDoc.data();
    try {
      await bucket.file(pdf.storagePath).delete();
    } catch (e) {
      console.error('Storage削除エラー:', e.message);
    }
    await pdfDoc.ref.delete();
  }

  await db.collection('properties').doc(id).delete();
  return true;
}

// ==============================
// PDF管理（Firestore + Firebase Storage）
// ==============================
async function getPdfsByPropertyId(propertyId) {
  const snap = await db.collection('pdfs')
    .where('propertyId', '==', propertyId)
    .orderBy('uploadedAt', 'asc')
    .get();
  return snap.docs.map(d => d.data());
}

async function countPdfsByPropertyId(propertyId) {
  const snap = await db.collection('pdfs').where('propertyId', '==', propertyId).get();
  return snap.size;
}

async function findPdfById(id) {
  const doc = await db.collection('pdfs').doc(id).get();
  if (!doc.exists) return null;
  return doc.data();
}

// PDFをFirebase Storageにアップロードし、Firestoreにメタデータ保存
async function addPdf(propertyId, file) {
  const id = uuidv4();
  const storagePath = `pdfs/${propertyId}/${id}_${file.originalname}`;

  // Firebase Storage にアップロード
  const fileRef = bucket.file(storagePath);
  await fileRef.save(file.buffer, {
    metadata: { contentType: 'application/pdf' },
  });

  // 署名付きURL（1年有効）を取得
  const [url] = await fileRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });

  const pdf = {
    id,
    propertyId,
    originalName: file.originalname,
    storagePath,
    downloadUrl: url,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };

  await db.collection('pdfs').doc(id).set(pdf);
  return pdf;
}

async function deletePdf(id) {
  const doc = await db.collection('pdfs').doc(id).get();
  if (!doc.exists) return null;
  const pdf = doc.data();

  // Firebase Storage から削除
  try {
    await bucket.file(pdf.storagePath).delete();
  } catch (e) {
    console.error('Storage削除エラー:', e.message);
  }

  await db.collection('pdfs').doc(id).delete();
  return pdf;
}

// ストリーム取得（閲覧・ダウンロード用）
async function getPdfStream(id) {
  const pdf = await findPdfById(id);
  if (!pdf) return null;
  const fileRef = bucket.file(pdf.storagePath);
  const [exists] = await fileRef.exists();
  if (!exists) return null;
  return { stream: fileRef.createReadStream(), pdf };
}

export default {
  // セッション
  createSession,
  validateSession,
  deleteSession,
  // ユーザー
  findUserByLoginId,
  findUserById,
  // 物件
  getAllProperties,
  findPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  // PDF
  getPdfsByPropertyId,
  countPdfsByPropertyId,
  findPdfById,
  addPdf,
  deletePdf,
  getPdfStream,
};
