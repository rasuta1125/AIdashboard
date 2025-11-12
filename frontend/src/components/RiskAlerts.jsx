import { AlertTriangle, X, CheckCircle, Info } from "lucide-react";
import "../styles/RiskAlerts.css";

const RiskAlerts = ({ alerts, onDismiss, onViewProject }) => {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // 重大度のアイコンと色を取得
  const getSeverityStyle = (severity) => {
    switch (severity) {
      case "critical":
        return {
          icon: <AlertTriangle size={20} />,
          className: "critical",
          label: "緊急",
        };
      case "high":
        return {
          icon: <AlertTriangle size={20} />,
          className: "high",
          label: "重要",
        };
      case "medium":
        return {
          icon: <Info size={20} />,
          className: "medium",
          label: "注意",
        };
      case "low":
        return {
          icon: <Info size={20} />,
          className: "low",
          label: "情報",
        };
      default:
        return {
          icon: <Info size={20} />,
          className: "low",
          label: "情報",
        };
    }
  };

  return (
    <div className="risk-alerts-container">
      <div className="risk-alerts-header">
        <div className="header-title">
          <AlertTriangle size={24} />
          <h2>リスクアラート</h2>
          <span className="alert-count">{alerts.length}</span>
        </div>
      </div>

      <div className="risk-alerts-list">
        {alerts.map((alert, index) => {
          const severityStyle = getSeverityStyle(alert.severity);
          const aiAlert = alert.aiAlert || {};

          return (
            <div
              key={index}
              className={`risk-alert-card ${severityStyle.className}`}
            >
              {/* ヘッダー */}
              <div className="alert-card-header">
                <div className="alert-severity">
                  {severityStyle.icon}
                  <span className="severity-label">{severityStyle.label}</span>
                </div>
                <button
                  className="alert-dismiss"
                  onClick={() => onDismiss && onDismiss(index)}
                  title="閉じる"
                >
                  <X size={18} />
                </button>
              </div>

              {/* AI生成メッセージ */}
              {aiAlert.alertMessage && (
                <div className="alert-message">
                  <strong>{aiAlert.alertMessage}</strong>
                </div>
              )}

              {/* 詳細説明 */}
              {aiAlert.description && (
                <div className="alert-description">{aiAlert.description}</div>
              )}

              {/* 案件情報 */}
              <div className="alert-project-info">
                <span className="project-name">
                  📁 {alert.project.project_name}
                </span>
                <span className="project-status">{alert.project.status}</span>
              </div>

              {/* 次のアクション */}
              {aiAlert.nextActions && aiAlert.nextActions.length > 0 && (
                <div className="alert-actions">
                  <div className="actions-title">
                    <CheckCircle size={16} />
                    次のアクション:
                  </div>
                  <ul className="actions-list">
                    {aiAlert.nextActions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ボタン */}
              <div className="alert-footer">
                <button
                  className="view-project-button"
                  onClick={() =>
                    onViewProject && onViewProject(alert.project.project_id)
                  }
                >
                  案件を確認
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskAlerts;
