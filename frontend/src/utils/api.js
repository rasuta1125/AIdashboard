// APIベースURL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

/**
 * 契約書PDFをアップロードしてOCR処理を実行
 * @param {File} file - PDFファイル
 * @returns {Promise<Object>} 抽出された契約書情報
 */
export async function uploadContractPDF(file) {
  try {
    // FormDataを作成
    const formData = new FormData();
    formData.append("contract", file);

    // APIにリクエスト
    const response = await fetch(`${API_BASE_URL}/api/ocr/contract`, {
      method: "POST",
      body: formData,
    });

    // レスポンスをJSON形式で取得
    const data = await response.json();

    // エラーチェック
    if (!response.ok) {
      throw new Error(data.error || "契約書のアップロードに失敗しました");
    }

    if (!data.success) {
      throw new Error(data.error || "契約書の処理に失敗しました");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

/**
 * APIのヘルスチェック
 * @returns {Promise<Object>} サーバーの状態
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Health Check Error:", error);
    throw error;
  }
}

export default {
  uploadContractPDF,
  checkApiHealth,
};
