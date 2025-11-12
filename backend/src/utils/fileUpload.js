import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// アップロードディレクトリのパス
const uploadDir = path.join(__dirname, "../../uploads");

// アップロードディレクトリが存在しない場合は作成
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ストレージ設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // ユニークなファイル名を生成
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// ファイルフィルター（PDFのみ許可）
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(
      new Error("PDFファイルのみアップロード可能です。"),
      false
    );
  }
};

// Multerの設定
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // デフォルト10MB
  },
});

/**
 * アップロードされたファイルを削除する
 * @param {string} filePath - 削除するファイルのパス
 */
export function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("ファイルを削除しました:", filePath);
    }
  } catch (error) {
    console.error("ファイル削除エラー:", error);
  }
}

export default upload;
