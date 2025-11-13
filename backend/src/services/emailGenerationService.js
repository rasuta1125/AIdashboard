import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 案件情報に基づいて連絡メールを自動生成する
 * @param {Object} context - メール生成に必要なコンテキスト情報
 * @returns {Promise<Object>} 生成されたメール（件名と本文）
 */
export async function generateContactEmail(context) {
  try {
    const {
      projectName,
      buyerName,
      sellerName,
      situation,
      nextAction,
      recipientRole,
      taskName,
      settlementDate,
      propertyPrice,
    } = context;

    // Gemini 2.0 Flashモデルを使用（高速）
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // メール生成のプロンプト
    const prompt = `
あなたは不動産取引の営業担当者です。
以下の情報に基づいて、関係者への連絡メールを作成してください。

【案件情報】
- 案件名: ${projectName || "未設定"}
- 買主: ${buyerName || "未設定"}
${sellerName ? `- 売主: ${sellerName}` : ""}
${settlementDate ? `- 決済予定日: ${settlementDate}` : ""}
${propertyPrice ? `- 売買代金: ${new Intl.NumberFormat("ja-JP").format(propertyPrice)}円` : ""}

【現在の状況】
${situation || "タスクが完了しました"}

${taskName ? `【完了したタスク】\n${taskName}` : ""}

【次のアクション】
${nextAction || "引き続きお手続きを進めてまいります"}

【メール送信先】
${recipientRole || "関係者"}

【作成指示】
1. 件名は簡潔に20文字程度で
2. 本文は丁寧で専門的な言葉遣いで
3. ビジネスメールの基本形式（挨拶、本文、締めくくり）に従う
4. 次のアクションを明確に伝える
5. 読みやすく段落を分ける

【出力形式】
以下のJSON形式で出力してください：

{
  "subject": "メールの件名",
  "body": "メールの本文\\n\\n（改行は\\\\nで表現）"
}

それでは、プロフェッショナルで丁寧な連絡メールを作成してください。
`;

    // Gemini APIを呼び出し
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSONを抽出
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    // JSONをパース
    const emailData = JSON.parse(jsonText);

    // 改行文字を実際の改行に変換
    if (emailData.body) {
      emailData.body = emailData.body.replace(/\\n/g, "\n");
    }

    console.log("生成されたメール:", {
      subject: emailData.subject,
      bodyLength: emailData.body?.length || 0,
    });

    return {
      success: true,
      email: {
        subject: emailData.subject || "【重要】案件進捗のご連絡",
        body: emailData.body || "メール本文の生成に失敗しました。",
      },
      rawResponse: text,
    };
  } catch (error) {
    console.error("メール生成エラー:", error);
    throw new Error(`メール生成に失敗しました: ${error.message}`);
  }
}

/**
 * タスク完了時の自動メール生成
 * @param {Object} taskContext - タスク完了時のコンテキスト
 * @returns {Promise<Object>} 生成されたメール
 */
export async function generateTaskCompletionEmail(taskContext) {
  const {
    projectName,
    taskName,
    buyerName,
    sellerName,
    settlementDate,
    recipientRole,
  } = taskContext;

  // タスクに応じた状況説明を生成
  let situation = "";
  let nextAction = "";

  // タスク名に基づいて適切な文面を設定
  if (taskName?.includes("融資承認")) {
    situation = "融資承認の確認が完了いたしました";
    nextAction =
      "つきましては、銀行との金銭消費貸借契約に進んでまいります。契約日程につきましては、改めてご連絡させていただきます";
  } else if (taskName?.includes("司法書士")) {
    situation = "司法書士への連絡が完了いたしました";
    nextAction =
      "登記手続きの準備を進めてまいります。必要書類につきましては、追ってご案内申し上げます";
  } else if (taskName?.includes("決済")) {
    situation = "決済の準備が整いました";
    nextAction =
      "決済当日の流れにつきましては、別途詳細をご案内させていただきます";
  } else {
    situation = `「${taskName}」のタスクが完了いたしました`;
    nextAction = "引き続き、円滑なお取引のためにサポートさせていただきます";
  }

  return await generateContactEmail({
    projectName,
    buyerName,
    sellerName,
    situation,
    nextAction,
    recipientRole,
    taskName,
    settlementDate,
  });
}

/**
 * カスタムメッセージでメール生成
 * @param {Object} customContext - カスタムコンテキスト
 * @returns {Promise<Object>} 生成されたメール
 */
export async function generateCustomEmail(customContext) {
  return await generateContactEmail(customContext);
}

export default {
  generateContactEmail,
  generateTaskCompletionEmail,
  generateCustomEmail,
};
