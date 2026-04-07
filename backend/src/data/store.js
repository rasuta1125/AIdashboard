// JSONファイルベースの永続化データストア
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データ保存先ディレクトリ
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// データディレクトリを作成
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初期データ定義
const INITIAL_DATA = {
  properties: [
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
  ],
  pdfs: [],
};

// DBファイルの読み込み（なければ初期データで作成）
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('DB読み込みエラー:', err);
  }
  // ファイルがない or 壊れている場合は初期データを書き込んで返す
  saveDB(INITIAL_DATA);
  return JSON.parse(JSON.stringify(INITIAL_DATA));
}

// DBファイルへの書き込み
function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('DB書き込みエラー:', err);
  }
}

// DBを読み込んで操作、保存するラッパー
function withDB(fn) {
  const db = loadDB();
  const result = fn(db);
  saveDB(db);
  return result;
}

// ユーザーデータ（固定。変更不要のためメモリのみ）
const users = [
  {
    id: '1',
    loginId: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    name: '管理者',
    role: 'admin',
  },
  {
    id: '2',
    loginId: 'user',
    password: bcrypt.hashSync('user123', 10),
    name: '利用ユーザー',
    role: 'user',
  },
];

// セッション（サーバー再起動でリセットされるが許容）
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
    const db = loadDB();
    return db.properties.map((p) => ({
      ...p,
      pdfCount: db.pdfs.filter((pdf) => pdf.propertyId === p.id).length,
    }));
  },

  findPropertyById(id) {
    const db = loadDB();
    return db.properties.find((p) => p.id === id) || null;
  },

  createProperty(data) {
    return withDB((db) => {
      const now = new Date().toISOString();
      const property = {
        id: uuidv4(),
        name: data.name,
        price: Number(data.price),
        createdAt: now,
        updatedAt: now,
      };
      db.properties.push(property);
      return property;
    });
  },

  updateProperty(id, data) {
    return withDB((db) => {
      const idx = db.properties.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      db.properties[idx] = {
        ...db.properties[idx],
        name: data.name,
        price: Number(data.price),
        updatedAt: new Date().toISOString(),
      };
      return db.properties[idx];
    });
  },

  deleteProperty(id) {
    return withDB((db) => {
      const idx = db.properties.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      db.properties.splice(idx, 1);
      // 関連PDFも削除
      db.pdfs = db.pdfs.filter((pdf) => pdf.propertyId !== id);
      return true;
    });
  },

  // ===== PDF =====
  getPdfsByPropertyId(propertyId) {
    const db = loadDB();
    return db.pdfs.filter((pdf) => pdf.propertyId === propertyId);
  },

  findPdfById(id) {
    const db = loadDB();
    return db.pdfs.find((pdf) => pdf.id === id) || null;
  },

  countPdfsByPropertyId(propertyId) {
    const db = loadDB();
    return db.pdfs.filter((pdf) => pdf.propertyId === propertyId).length;
  },

  addPdf(propertyId, fileInfo) {
    return withDB((db) => {
      const pdf = {
        id: uuidv4(),
        propertyId,
        filename: fileInfo.filename,
        originalName: fileInfo.originalname,
        path: fileInfo.path,
        size: fileInfo.size,
        uploadedAt: new Date().toISOString(),
      };
      db.pdfs.push(pdf);
      return pdf;
    });
  },

  deletePdf(id) {
    return withDB((db) => {
      const idx = db.pdfs.findIndex((pdf) => pdf.id === id);
      if (idx === -1) return null;
      const pdf = db.pdfs[idx];
      db.pdfs.splice(idx, 1);
      return pdf;
    });
  },
};

// 起動時にDBを初期化
loadDB();
console.log(`📂 DBファイル: ${DB_FILE}`);

export default store;
