// インメモリデータストア（本番環境ではDBに置き換え）
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ユーザーデータ
const users = [
  {
    id: '1',
    loginId: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    name: '管理者',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    loginId: 'user',
    password: bcrypt.hashSync('user123', 10),
    name: '利用ユーザー',
    role: 'user',
    createdAt: new Date().toISOString(),
  },
];

// 物件データ
let properties = [
  {
    id: uuidv4(),
    name: 'サンプル物件A',
    price: 50000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'サンプル物件B',
    price: 35000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// PDFデータ
let pdfs = [];

// セッション（簡易トークン管理）
let sessions = {};

export const store = {
  // ===== ユーザー =====
  findUserByLoginId(loginId) {
    return users.find((u) => u.loginId === loginId);
  },

  findUserById(id) {
    return users.find((u) => u.id === id);
  },

  // ===== セッション =====
  createSession(userId) {
    const token = uuidv4();
    sessions[token] = {
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24時間
    };
    return token;
  },

  validateSession(token) {
    const session = sessions[token];
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      delete sessions[token];
      return null;
    }
    return this.findUserById(session.userId);
  },

  deleteSession(token) {
    delete sessions[token];
  },

  // ===== 物件 =====
  getAllProperties() {
    return properties.map((p) => ({
      ...p,
      pdfCount: pdfs.filter((pdf) => pdf.propertyId === p.id).length,
    }));
  },

  findPropertyById(id) {
    return properties.find((p) => p.id === id);
  },

  createProperty(data) {
    const now = new Date().toISOString();
    const property = {
      id: uuidv4(),
      name: data.name,
      price: Number(data.price),
      createdAt: now,
      updatedAt: now,
    };
    properties.push(property);
    return property;
  },

  updateProperty(id, data) {
    const idx = properties.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    properties[idx] = {
      ...properties[idx],
      ...data,
      price: Number(data.price),
      updatedAt: new Date().toISOString(),
    };
    return properties[idx];
  },

  deleteProperty(id) {
    const idx = properties.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    properties.splice(idx, 1);
    // 関連PDFも削除
    pdfs = pdfs.filter((pdf) => pdf.propertyId !== id);
    return true;
  },

  // ===== PDF =====
  getPdfsByPropertyId(propertyId) {
    return pdfs.filter((pdf) => pdf.propertyId === propertyId);
  },

  findPdfById(id) {
    return pdfs.find((pdf) => pdf.id === id);
  },

  countPdfsByPropertyId(propertyId) {
    return pdfs.filter((pdf) => pdf.propertyId === propertyId).length;
  },

  addPdf(propertyId, fileInfo) {
    const pdf = {
      id: uuidv4(),
      propertyId,
      filename: fileInfo.filename,
      originalName: fileInfo.originalname,
      path: fileInfo.path,
      size: fileInfo.size,
      uploadedAt: new Date().toISOString(),
    };
    pdfs.push(pdf);
    return pdf;
  },

  deletePdf(id) {
    const idx = pdfs.findIndex((pdf) => pdf.id === id);
    if (idx === -1) return null;
    const pdf = pdfs[idx];
    pdfs.splice(idx, 1);
    return pdf;
  },
};

export default store;
