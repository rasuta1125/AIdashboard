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

/**
 * メールを生成
 * @param {Object} context - メール生成に必要なコンテキスト情報
 * @returns {Promise<Object>} 生成されたメール
 */
export async function generateEmail(context) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/email/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(context),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "メール生成に失敗しました");
    }

    if (!data.success) {
      throw new Error(data.error || "メール生成に失敗しました");
    }

    return data;
  } catch (error) {
    console.error("Email Generation Error:", error);
    throw error;
  }
}

/**
 * タスク完了時のメールを生成
 * @param {Object} taskContext - タスク完了時のコンテキスト
 * @returns {Promise<Object>} 生成されたメール
 */
export async function generateTaskCompletionEmail(taskContext) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/email/task-completion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskContext),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "メール生成に失敗しました");
    }

    if (!data.success) {
      throw new Error(data.error || "メール生成に失敗しました");
    }

    return data;
  } catch (error) {
    console.error("Task Completion Email Generation Error:", error);
    throw error;
  }
}

export default {
  uploadContractPDF,
  checkApiHealth,
  generateEmail,
  generateTaskCompletionEmail,
};
