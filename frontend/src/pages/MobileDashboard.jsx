import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, TrendingUp, AlertTriangle, ChevronRight, Plus } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { mockProjects, mockTasks, PROJECT_STATUSES } from "../utils/mockData";
import { checkRisksWithAI } from "../utils/api";
import MobileBottomNav from "../components/MobileBottomNav";
import "../styles/MobileDashboard.css";

const MobileDashboard = () => {
  const [projects, setProjects] = useState(mockProjects);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [riskAlerts, setRiskAlerts] = useState([]);
  const navigate = useNavigate();

  // 初回マウント時にリスクチェック
  useEffect(() => {
    handleRiskCheck();
  }, []);

  // リスクチェック処理
  const handleRiskCheck = async () => {
    try {
      const tasksMap = {};
      Object.keys(mockTasks).forEach((projectId) => {
        tasksMap[projectId] = mockTasks[projectId];
      });

      const result = await checkRisksWithAI({
        projects: projects,
        tasksMap: tasksMap,
        contactsMap: {},
      });

      if (result.success && result.alerts) {
        setRiskAlerts(result.alerts);
      }
    } catch (error) {
      console.error("リスクチェックエラー:", error);
    }
  };

  // 金額をフォーマット
  const formatPrice = (price) => {
    return new Intl.NumberFormat("ja-JP").format(price);
  };

  // 日付をフォーマット
  const formatDate = (dateString) => {
    if (!dateString) return "未定";
    return format(new Date(dateString), "M/d (E)", { locale: ja });
  };

  // 決済日までの日数を計算
  const getDaysUntilSettlement = (settlementDate) => {
    if (!settlementDate) return null;
    const today = new Date();
    const settlement = new Date(settlementDate);
    const diffTime = settlement - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // フィルター済みプロジェクト
  const filteredProjects =
    selectedStatus === "all"
      ? projects
      : projects.filter((p) => p.status === selectedStatus);

  // 統計データ
  const stats = {
    total: projects.length,
    inProgress: projects.filter((p) => p.status !== "決済完了").length,
    completed: projects.filter((p) => p.status === "決済完了").length,
    risks: riskAlerts.length,
  };

  return (
    <div className="mobile-dashboard">
      {/* ヘッダー */}
      <header className="mobile-header">
        <div className="header-content">
          <h1>📊 案件管理</h1>
          <button className="calendar-button" onClick={() => navigate("/calendar")}>
            <Calendar size={20} />
          </button>
        </div>

        {/* 統計カード */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">総案件</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">進行中</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">完了</span>
          </div>
          {stats.risks > 0 && (
            <div className="stat-card risk">
              <span className="stat-value">{stats.risks}</span>
              <span className="stat-label">リスク</span>
            </div>
          )}
        </div>

        {/* リスクアラート（簡易版） */}
        {riskAlerts.length > 0 && (
          <div className="mobile-risk-banner">
            <AlertTriangle size={18} />
            <span>{riskAlerts.length}件のリスクが検出されました</span>
            <button onClick={() => navigate("/alerts")}>詳細</button>
          </div>
        )}

        {/* ステータスフィルター */}
        <div className="status-filter">
          <button
            className={`filter-chip ${selectedStatus === "all" ? "active" : ""}`}
            onClick={() => setSelectedStatus("all")}
          >
            全て
          </button>
          {PROJECT_STATUSES.map((status) => (
            <button
              key={status}
              className={`filter-chip ${selectedStatus === status ? "active" : ""}`}
              onClick={() => setSelectedStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </header>

      {/* プロジェクトリスト */}
      <div className="mobile-project-list">
        {filteredProjects.map((project) => {
          const daysUntil = getDaysUntilSettlement(project.settlement_date);
          const hasRisk = riskAlerts.some((alert) => alert.projectId === project.project_id);

          return (
            <div
              key={project.project_id}
              className={`mobile-project-card ${hasRisk ? "has-risk" : ""}`}
              onClick={() => navigate(`/project/${project.project_id}`)}
            >
              {/* リスクバッジ */}
              {hasRisk && (
                <div className="risk-indicator">
                  <AlertTriangle size={14} />
                </div>
              )}

              {/* プロジェクト情報 */}
              <div className="project-header">
                <h3 className="project-name">{project.project_name}</h3>
                <ChevronRight size={20} className="chevron" />
              </div>

              <div className="project-details">
                {/* ステータスバッジ */}
                <span className={`status-badge ${project.status}`}>
                  {project.status}
                </span>

                {/* 決済日 */}
                <div className="detail-row">
                  <Calendar size={14} />
                  <span className="detail-label">決済日:</span>
                  <span className="detail-value">{formatDate(project.settlement_date)}</span>
                </div>

                {/* 残り日数 */}
                {daysUntil !== null && (
                  <div
                    className={`days-badge ${
                      daysUntil < 0
                        ? "overdue"
                        : daysUntil <= 3
                        ? "urgent"
                        : daysUntil <= 7
                        ? "warning"
                        : ""
                    }`}
                  >
                    {daysUntil < 0
                      ? `${Math.abs(daysUntil)}日超過`
                      : daysUntil === 0
                      ? "本日決済"
                      : `あと${daysUntil}日`}
                  </div>
                )}

                {/* 売買代金 */}
                <div className="detail-row">
                  <TrendingUp size={14} />
                  <span className="detail-label">売買代金:</span>
                  <span className="detail-value price">
                    ¥{formatPrice(project.property_price)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="empty-state">
            <p>該当する案件がありません</p>
          </div>
        )}
      </div>

      {/* フローティングアクションボタン */}
      <button className="fab" title="新規案件追加">
        <Plus size={24} />
      </button>

      {/* ボトムナビゲーション */}
      <MobileBottomNav />
    </div>
  );
};

export default MobileDashboard;
