import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 日付の差分を日数で計算
 * @param {string} dateString - 日付文字列
 * @returns {number} 今日からの日数（負の値は過去）
 */
function getDaysUntil(dateString) {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * 案件とタスクのリスクを分析
 * @param {Array} projects - 全案件データ
 * @param {Object} tasksMap - 案件IDごとのタスクマップ
 * @param {Object} contactsMap - 案件IDごとの関係者マップ
 * @returns {Promise<Array>} 検出されたリスク
 */
export async function analyzeRisks(projects, tasksMap = {}, contactsMap = {}) {
  const risks = [];

  for (const project of projects) {
    // 決済完了の案件はスキップ
    if (project.status === "決済完了") continue;

    const projectRisks = [];
    const tasks = tasksMap[project.project_id] || [];
    const contacts = contactsMap[project.project_id] || [];

    // 1. 融資特約期限のチェック（最優先）
    if (project.loan_special_clause_deadline) {
      const daysUntil = getDaysUntil(project.loan_special_clause_deadline);
      if (daysUntil !== null && daysUntil <= 3) {
        // 融資承認タスクが未完了かチェック
        const loanTask = tasks.find(
          (t) =>
            (t.task_name.includes("融資") || t.task_name.includes("承認")) &&
            !t.is_completed
        );

        projectRisks.push({
          type: "loan_deadline",
          severity: daysUntil <= 0 ? "critical" : daysUntil <= 1 ? "high" : "medium",
          deadline: project.loan_special_clause_deadline,
          daysUntil,
          taskName: loanTask?.task_name || "融資承認確認",
          isOverdue: daysUntil < 0,
        });
      }
    }

    // 2. 決済予定日のチェック
    if (project.settlement_date) {
      const daysUntil = getDaysUntil(project.settlement_date);
      if (daysUntil !== null && daysUntil <= 7) {
        // 未完了の重要タスクをチェック
        const incompleteTasks = tasks.filter(
          (t) => !t.is_completed && t.priority === "high"
        );

        if (incompleteTasks.length > 0) {
          projectRisks.push({
            type: "settlement_deadline",
            severity: daysUntil <= 3 ? "high" : "medium",
            deadline: project.settlement_date,
            daysUntil,
            incompleteTasks: incompleteTasks.length,
            taskNames: incompleteTasks.map((t) => t.task_name),
            isOverdue: daysUntil < 0,
          });
        }
      }
    }

    // 3. 期限切れタスクのチェック
    const overdueTasks = tasks.filter((task) => {
      if (task.is_completed || !task.due_date) return false;
      const daysUntil = getDaysUntil(task.due_date);
      return daysUntil !== null && daysUntil < 0;
    });

    if (overdueTasks.length > 0) {
      projectRisks.push({
        type: "overdue_tasks",
        severity: "medium",
        overdueTasks: overdueTasks.map((t) => ({
          taskName: t.task_name,
          dueDate: t.due_date,
          daysOverdue: Math.abs(getDaysUntil(t.due_date)),
        })),
      });
    }

    // 4. 期限が迫っているタスク（3日以内）
    const urgentTasks = tasks.filter((task) => {
      if (task.is_completed || !task.due_date) return false;
      const daysUntil = getDaysUntil(task.due_date);
      return daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;
    });

    if (urgentTasks.length > 0) {
      projectRisks.push({
        type: "urgent_tasks",
        severity: "low",
        urgentTasks: urgentTasks.map((t) => ({
          taskName: t.task_name,
          dueDate: t.due_date,
          daysUntil: getDaysUntil(t.due_date),
        })),
      });
    }

    // リスクが検出された場合、案件情報と共に追加
    if (projectRisks.length > 0) {
      // 最も高い重大度を取得
      const maxSeverity = projectRisks.reduce((max, risk) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const current = severityOrder[risk.severity] || 0;
        const maximum = severityOrder[max] || 0;
        return current > maximum ? risk.severity : max;
      }, "low");

      risks.push({
        project: {
          project_id: project.project_id,
          project_name: project.project_name,
          status: project.status,
          settlement_date: project.settlement_date,
        },
        risks: projectRisks,
        severity: maxSeverity,
        contacts: contacts.map((c) => ({
          role: c.role,
          name: c.name,
        })),
      });
    }
  }

  // 重大度順にソート
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  risks.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  return risks;
}

/**
 * Gemini APIでリスクに対する具体的なアクションを生成
 * @param {Object} riskData - リスク情報
 * @returns {Promise<Object>} AIが生成した警告とアクション
 */
export async function generateRiskAlert(riskData) {
  try {
    const { project, risks, contacts } = riskData;

    // Gemini 1.5 Proモデルを使用
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // リスク情報を文字列化
    let riskDescription = "";
    for (const risk of risks) {
      if (risk.type === "loan_deadline") {
        const status = risk.isOverdue
          ? `期限超過（${Math.abs(risk.daysUntil)}日）`
          : risk.daysUntil === 0
          ? "本日が期限"
          : `残り${risk.daysUntil}日`;
        riskDescription += `- 融資特約期限: ${status}\n`;
        riskDescription += `  期限日: ${risk.deadline}\n`;
        if (risk.taskName) {
          riskDescription += `  関連タスク: ${risk.taskName}（未完了）\n`;
        }
      } else if (risk.type === "settlement_deadline") {
        const status = risk.isOverdue
          ? `期限超過（${Math.abs(risk.daysUntil)}日）`
          : risk.daysUntil === 0
          ? "本日が決済日"
          : `残り${risk.daysUntil}日`;
        riskDescription += `- 決済予定日: ${status}\n`;
        riskDescription += `  決済日: ${risk.deadline}\n`;
        riskDescription += `  未完了の重要タスク: ${risk.incompleteTasks}件\n`;
        if (risk.taskNames && risk.taskNames.length > 0) {
          riskDescription += `  タスク: ${risk.taskNames.join(", ")}\n`;
        }
      } else if (risk.type === "overdue_tasks") {
        riskDescription += `- 期限切れタスク: ${risk.overdueTasks.length}件\n`;
        for (const task of risk.overdueTasks) {
          riskDescription += `  * ${task.taskName} (${task.daysOverdue}日超過)\n`;
        }
      } else if (risk.type === "urgent_tasks") {
        riskDescription += `- 期限が迫っているタスク: ${risk.urgentTasks.length}件\n`;
      }
    }

    // 関係者情報
    let contactsInfo = "";
    if (contacts && contacts.length > 0) {
      contactsInfo = "\n【関係者】\n";
      for (const contact of contacts) {
        contactsInfo += `- ${contact.role}: ${contact.name}\n`;
      }
    }

    // プロンプト
    const prompt = `
あなたは不動産取引のリスク管理専門家です。
以下の案件で重大なリスクが検出されました。
営業担当者に対して、緊急性の高い警告メッセージと具体的な次のアクションを提案してください。

【案件情報】
案件名: ${project.project_name}
ステータス: ${project.status}
${project.settlement_date ? `決済予定日: ${project.settlement_date}` : ""}

【検出されたリスク】
${riskDescription}
${contactsInfo}

【指示】
1. 警告メッセージは簡潔で強い口調（緊急性を伝える）
2. 次のアクションは具体的で実行可能なステップ
3. 優先順位を明確に示す
4. 連絡すべき関係者を明記

【出力形式】
以下のJSON形式で出力してください：

{
  "alertMessage": "【警告】短くて強いメッセージ（50文字以内）",
  "description": "状況の詳細説明（100文字程度）",
  "nextActions": [
    "1. 最優先で実行すべきアクション",
    "2. 次に実行すべきアクション",
    "3. その他の推奨アクション"
  ],
  "urgencyLevel": "critical または high または medium"
}

JSONのみを出力し、説明文は不要です。
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
    const alertData = JSON.parse(jsonText);

    console.log("AIが生成した警告:", {
      project: project.project_name,
      alertMessage: alertData.alertMessage,
      urgencyLevel: alertData.urgencyLevel,
    });

    return {
      success: true,
      alert: {
        ...alertData,
        projectId: project.project_id,
        projectName: project.project_name,
        generatedAt: new Date().toISOString(),
      },
      rawResponse: text,
    };
  } catch (error) {
    console.error("リスクアラート生成エラー:", error);
    throw new Error(`リスクアラート生成に失敗しました: ${error.message}`);
  }
}

/**
 * すべての検出されたリスクに対してAI警告を生成
 * @param {Array} risks - 検出されたリスクのリスト
 * @returns {Promise<Array>} AI生成された警告のリスト
 */
export async function generateAllRiskAlerts(risks) {
  const alerts = [];

  for (const risk of risks) {
    try {
      const result = await generateRiskAlert(risk);
      if (result.success) {
        alerts.push({
          ...risk,
          aiAlert: result.alert,
        });
      }
    } catch (error) {
      console.error(`案件 ${risk.project.project_name} の警告生成失敗:`, error);
      // エラーでも基本情報は追加
      alerts.push({
        ...risk,
        aiAlert: {
          alertMessage: `【警告】${risk.project.project_name}: リスクが検出されました`,
          description: "詳細な分析に失敗しましたが、期限が迫っています。",
          nextActions: ["案件の状況を確認してください"],
          urgencyLevel: risk.severity,
        },
      });
    }
  }

  return alerts;
}

export default {
  analyzeRisks,
  generateRiskAlert,
  generateAllRiskAlerts,
};
