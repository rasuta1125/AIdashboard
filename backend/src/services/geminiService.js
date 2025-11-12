import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * PDFファイルから契約書情報を抽出する
 * @param {string} filePath - PDFファイルのパス
 * @param {string} mimeType - ファイルのMIMEタイプ
 * @returns {Promise<Object>} 抽出された契約書情報
 */
export async function extractContractInfoFromPDF(filePath, mimeType) {
  try {
    // Gemini 1.5 Proモデルを使用（PDFサポート）
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // PDFファイルを読み込む
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");

    // Gemini APIに送信するプロンプト
    const prompt = `
あなたは不動産売買契約書を分析する専門AIです。
以下のPDF契約書から、指定された情報を正確に抽出してください。

【抽出する情報】
1. 契約日（contract_date）
2. 決済日または引渡日（settlement_date）
3. 売買代金（property_price）- 数値のみ
4. 手付金（deposit_amount）- 数値のみ
5. 融資利用の特約（ローン特約）の期限日（loan_special_clause_deadline）

【出力形式】
以下のJSON形式で出力してください。値が見つからない場合はnullを返してください。

{
  "contract_date": "YYYY-MM-DD形式の日付",
  "settlement_date": "YYYY-MM-DD形式の日付",
  "property_price": 数値（円単位、カンマなし）,
  "deposit_amount": 数値（円単位、カンマなし）,
  "loan_special_clause_deadline": "YYYY-MM-DD形式の日付"
}

【注意事項】
- 日付は必ず「YYYY-MM-DD」形式で出力してください（例: 2025-11-15）
- 金額は数値のみで、カンマや「円」などの単位は含めないでください
- 和暦の場合は西暦に変換してください（例: 令和7年 → 2025年）
- JSONのみを出力し、説明文は不要です
- 確実に見つかった情報のみを返し、推測は避けてください

それでは、以下の契約書PDFを分析してください。
`;

    // Gemini APIを呼び出し
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();

    // JSONを抽出（マークダウンのコードブロックが含まれている場合に対応）
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    // JSONをパース
    const extractedData = JSON.parse(jsonText);

    // データの検証とクリーニング
    const cleanedData = {
      contract_date: extractedData.contract_date || null,
      settlement_date: extractedData.settlement_date || null,
      property_price: extractedData.property_price
        ? Number(extractedData.property_price)
        : null,
      deposit_amount: extractedData.deposit_amount
        ? Number(extractedData.deposit_amount)
        : null,
      loan_special_clause_deadline:
        extractedData.loan_special_clause_deadline || null,
    };

    console.log("Gemini APIから抽出されたデータ:", cleanedData);

    return {
      success: true,
      data: cleanedData,
      rawResponse: text,
    };
  } catch (error) {
    console.error("Gemini API エラー:", error);
    throw new Error(`契約書の情報抽出に失敗しました: ${error.message}`);
  }
}

/**
 * テキストから契約書情報を抽出する（OCR済みテキスト用）
 * @param {string} text - OCR済みのテキスト
 * @returns {Promise<Object>} 抽出された契約書情報
 */
export async function extractContractInfoFromText(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
あなたは不動産売買契約書を分析する専門AIです。
以下の契約書テキストから、指定された情報を正確に抽出してください。

【抽出する情報】
1. 契約日（contract_date）
2. 決済日または引渡日（settlement_date）
3. 売買代金（property_price）- 数値のみ
4. 手付金（deposit_amount）- 数値のみ
5. 融資利用の特約（ローン特約）の期限日（loan_special_clause_deadline）

【出力形式】
以下のJSON形式で出力してください。値が見つからない場合はnullを返してください。

{
  "contract_date": "YYYY-MM-DD形式の日付",
  "settlement_date": "YYYY-MM-DD形式の日付",
  "property_price": 数値（円単位、カンマなし）,
  "deposit_amount": 数値（円単位、カンマなし）,
  "loan_special_clause_deadline": "YYYY-MM-DD形式の日付"
}

【注意事項】
- 日付は必ず「YYYY-MM-DD」形式で出力してください（例: 2025-11-15）
- 金額は数値のみで、カンマや「円」などの単位は含めないでください
- 和暦の場合は西暦に変換してください（例: 令和7年 → 2025年）
- JSONのみを出力し、説明文は不要です

契約書テキスト:
${text}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // JSONを抽出
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const extractedData = JSON.parse(jsonText);

    // データのクリーニング
    const cleanedData = {
      contract_date: extractedData.contract_date || null,
      settlement_date: extractedData.settlement_date || null,
      property_price: extractedData.property_price
        ? Number(extractedData.property_price)
        : null,
      deposit_amount: extractedData.deposit_amount
        ? Number(extractedData.deposit_amount)
        : null,
      loan_special_clause_deadline:
        extractedData.loan_special_clause_deadline || null,
    };

    return {
      success: true,
      data: cleanedData,
      rawResponse: responseText,
    };
  } catch (error) {
    console.error("Gemini API エラー:", error);
    throw new Error(`テキストからの情報抽出に失敗しました: ${error.message}`);
  }
}

export default {
  extractContractInfoFromPDF,
  extractContractInfoFromText,
};
