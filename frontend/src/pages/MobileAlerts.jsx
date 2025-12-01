import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, ChevronRight, X } from "lucide-react";
import { mockProjects, mockTasks, mockContacts } from "../utils/mockData";
import { checkRisksWithAI } from "../utils/api";
import MobileBottomNav from "../components/MobileBottomNav";
import "../styles/MobileAlerts.css";

const MobileAlerts = () => {
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRiskAlerts();
  }, []);

  const loadRiskAlerts = async () => {
    setIsLoading(true);
    try {
      // localStorageから案件データを取得
      const savedProjects = localStorage.getItem('projects');
      const projects = savedProjects ? JSON.parse(savedProjects) : mockProjects;

      // タスクマップを作成
      const tasksMap = {};
      Object.keys(mockTasks).forEach((projectId) => {
        tasksMap[projectId] = mockTasks[projectId];
      });

      // 関係者マップを作成
      const contactsMap = {};
      Object.keys(mockContacts).forEach((projectId) => {
        contactsMap[projectId] = mockContacts[projectId];
      });

      // AIリスクチェックを実行
      const result = await checkRisksWithAI({
        projects: projects,
        tasksMap: tasksMap,
        contactsMap: contactsMap,
      });

      if (result.success && result.alerts) {
        setRiskAlerts(result.alerts);
      }
    } catch (error) {
      console.error("リスクチェックエラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissAlert = (index) => {
    setRiskAlerts((alerts) => alerts.filter((_, i) => i !== index));
  };

  const handleViewProject = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "critical";
      case "high":
        return "high";
      case "medium":
        return "medium";
      case "low":
        return "low";
      default:
        return "low";
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case "critical":
        return "緊急";
      case "high":
        return "重要";
      case "medium":
        return "注意";
      case "low":
        return "確認";
      default:
        return "確認";
    }
  };

  return (
    <div className="mobile-alerts">
      {/* ヘッダー */}
      <header className="mobile-alerts-header">
        <button className="back-button" onClick={() => navigate("/")}>
          <ArrowLeft size={24} />
        </button>
        <h1>リスクアラート</h1>
        <div className="spacer" />
      </header>

      {/* コンテンツ */}
      <div className="mobile-alerts-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>リスクをチェック中...</p>
          </div>
        ) : riskAlerts.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={48} className="empty-icon" />
            <h2>リスクはありません</h2>
            <p>現在、検出されたリスクはありません</p>
          </div>
        ) : (
          <>
            {/* サマリー */}
            <div className="alerts-summary">
              <AlertTriangle size={20} />
              <span>
                {riskAlerts.length}件のリスクが検出されました
              </span>
            </div>

            {/* アラートリスト */}
            <div className="alerts-list">
              {riskAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`alert-card ${getSeverityColor(alert.severity)}`}
                >
                  {/* アラートヘッダー */}
                  <div className="alert-header">
                    <div className="alert-severity-badge">
                      <AlertTriangle size={14} />
                      {getSeverityLabel(alert.severity)}
                    </div>
                    <button
                      className="dismiss-button"
                      onClick={() => handleDismissAlert(index)}
                      aria-label="アラートを閉じる"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* アラートメッセージ */}
                  <div className="alert-message">
                    <h3>{alert.message}</h3>
                    {alert.details && (
                      <p className="alert-details">{alert.details}</p>
                    )}
                  </div>

                  {/* 案件情報 */}
                  {alert.projectId && (
                    <div className="alert-project">
                      <span className="project-label">関連案件:</span>
                      <span className="project-name">{alert.projectName}</span>
                    </div>
                  )}

                  {/* アクションボタン */}
                  {alert.projectId && (
                    <button
                      className="view-project-button"
                      onClick={() => handleViewProject(alert.projectId)}
                    >
                      <span>案件を確認</span>
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ボトムナビゲーション */}
      <MobileBottomNav />
    </div>
  );
};

export default MobileAlerts;
