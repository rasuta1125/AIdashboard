import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * AIスケジュール提案を生成
 * @param {Array} events - カレンダーイベントの配列
 * @param {Array} projects - プロジェクトの配列
 * @param {string} currentDate - 現在日時
 * @returns {Promise<Object>} スケジュール提案
 */
export async function generateScheduleSuggestion(events, projects, currentDate) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // プロンプトを構築
    const prompt = `
あなたは不動産売買決済業務の専門家です。以下のスケジュール情報を分析し、最適な業務計画を提案してください。

## 現在日時
${currentDate}

## 今後30日間の予定
${JSON.stringify(events, null, 2)}

## 案件情報
${JSON.stringify(
  projects.map((p) => ({
    project_id: p.project_id,
    project_name: p.project_name,
    status: p.status,
    settlement_date: p.settlement_date,
    loan_special_clause_deadline: p.loan_special_clause_deadline,
  })),
  null,
  2
)}

## 分析観点
1. 重要期限（融資特約期限、決済日）の優先順位付け
2. タスクの適切な分散配置
3. 複数案件の調整が必要な日の特定
4. リスクの高い期間の警告

## 出力形式
以下のJSON形式で回答してください：
{
  "summary": "スケジュール全体の要約（2-3文）",
  "recommendations": [
    "具体的な推奨事項1",
    "具体的な推奨事項2",
    "具体的な推奨事項3"
  ],
  "criticalDates": [
    {
      "date": "YYYY-MM-DD",
      "reason": "理由",
      "action": "推奨アクション"
    }
  ],
  "workloadBalance": {
    "overloadedDays": ["YYYY-MM-DD"],
    "recommendation": "業務負荷の調整提案"
  }
}

必ず有効なJSONのみを返してください。説明文は不要です。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSONを抽出（コードブロックを除去）
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const suggestion = JSON.parse(jsonText);

    return {
      success: true,
      suggestion: suggestion,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("スケジュール提案生成エラー:", error);

    // エラー時のフォールバック提案
    const fallbackSuggestion = {
      summary:
        "今後30日間で複数の重要な期限があります。計画的な業務進行をお勧めします。",
      recommendations: [
        "融資特約期限の3日前には必ず金融機関に確認を取りましょう",
        "決済日の1週間前には必要書類を全て準備しましょう",
        "複数の案件が重なる日は、優先順位を明確にして対応しましょう",
      ],
      criticalDates: events
        .filter((e) => e.type === "deadline" || e.type === "settlement")
        .slice(0, 3)
        .map((e) => ({
          date: new Date(e.date).toISOString().split("T")[0],
          reason: e.title,
          action: "事前準備と関係者への確認を実施",
        })),
      workloadBalance: {
        overloadedDays: [],
        recommendation: "現時点では大きな偏りは見られません",
      },
    };

    return {
      success: true,
      suggestion: fallbackSuggestion,
      generatedAt: new Date().toISOString(),
      fallback: true,
    };
  }
}

/**
 * タスクの最適配置を提案
 * @param {Object} project - プロジェクト情報
 * @param {Array} existingEvents - 既存のイベント
 * @returns {Promise<Object>} タスク配置提案
 */
export async function suggestTaskSchedule(project, existingEvents) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
不動産売買案件のタスクスケジュールを最適化してください。

## 案件情報
- 案件名: ${project.project_name}
- 契約日: ${project.contract_date}
- 決済日: ${project.settlement_date}
- 融資特約期限: ${project.loan_special_clause_deadline || "なし"}
- 現在のステータス: ${project.status}

## 既存の予定
${JSON.stringify(existingEvents, null, 2)}

## 一般的な決済業務タスク
1. 融資申込・書類準備（契約後すぐ）
2. 重要事項説明書の確認（契約後1週間以内）
3. 融資承認確認（融資特約期限の3日前まで）
4. 決済必要書類の準備（決済日の1週間前まで）
5. 司法書士との調整（決済日の3日前まで）
6. 残金決済・鍵の引渡し（決済日）

上記を参考に、この案件に最適なタスクスケジュールを提案してください。

## 出力形式
以下のJSON形式で回答してください：
{
  "suggestedTasks": [
    {
      "taskName": "タスク名",
      "suggestedDate": "YYYY-MM-DD",
      "priority": "高|中|低",
      "reason": "この日程を提案する理由"
    }
  ],
  "notes": "全体的な注意事項やアドバイス"
}

必ず有効なJSONのみを返してください。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const taskSchedule = JSON.parse(jsonText);

    return {
      success: true,
      taskSchedule: taskSchedule,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("タスクスケジュール提案エラー:", error);
    throw error;
  }
}

export default {
  generateScheduleSuggestion,
  suggestTaskSchedule,
};
