import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { Calendar, TrendingUp, RefreshCw, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { mockProjects, mockTasks, mockContacts, PROJECT_STATUSES } from "../utils/mockData";
import { checkRisksWithAI } from "../utils/api";
import RiskAlerts from "../components/RiskAlerts";
import ProjectModal from "../components/ProjectModal";
import "../styles/Dashboard.css";

const Dashboard = () => {
  // localStorageから案件データを読み込む
  const [projects, setProjects] = useState(() => {
    const savedProjects = localStorage.getItem('projects');
    return savedProjects ? JSON.parse(savedProjects) : mockProjects;
  });
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [isCheckingRisks, setIsCheckingRisks] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectModalMode, setProjectModalMode] = useState("add");
  const navigate = useNavigate();

  // projectsが変更されたらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  // 初回マウント時にリスクチェック
  useEffect(() => {
    handleRiskCheck();
  }, []);

  // リスクチェック処理
  const handleRiskCheck = async () => {
    setIsCheckingRisks(true);

    try {
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

      console.log("リスクチェック開始...");

      // AIリスクチェックを実行
      const result = await checkRisksWithAI({
        projects: projects,
        tasksMap: tasksMap,
        contactsMap: contactsMap,
      });

      console.log("リスクチェック完了:", result);

      if (result.success && result.alerts) {
        setRiskAlerts(result.alerts);
      }
    } catch (error) {
      console.error("リスクチェックエラー:", error);
      // エラーは表示しない（バックグラウンド処理）
    } finally {
      setIsCheckingRisks(false);
    }
  };

  // アラートを閉じる
  const handleDismissAlert = (index) => {
    setRiskAlerts((alerts) => alerts.filter((_, i) => i !== index));
  };

  // 案件を表示
  const handleViewProject = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  // ドラッグ終了時の処理
  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    // ドロップ先がない場合は何もしない
    if (!destination) {
      return;
    }

    // 同じ位置にドロップした場合は何もしない
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // プロジェクトのステータスを更新
    const newStatus = destination.droppableId;
    const updatedProjects = projects.map((project) => {
      if (project.project_id === parseInt(draggableId)) {
        return { ...project, status: newStatus };
      }
      return project;
    });

    setProjects(updatedProjects);
    
    // 実際のアプリケーションでは、ここでAPIを呼び出してDBを更新
    console.log(`案件 ${draggableId} のステータスを "${newStatus}" に更新`);
  };

  // ステータスごとにプロジェクトをグループ化
  const projectsByStatus = PROJECT_STATUSES.reduce((acc, status) => {
    acc[status] = projects.filter((project) => project.status === status);
    return acc;
  }, {});

  // 案件カードをクリックした時の処理
  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  // 案件の追加
  const handleAddProject = () => {
    setProjectModalMode("add");
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  // 案件の保存（追加または更新）
  const handleSaveProject = (projectData) => {
    if (projectModalMode === "add") {
      // 新規追加
      setProjects([...projects, projectData]);
      console.log("案件を追加しました:", projectData);
    } else {
      // 更新
      setProjects(
        projects.map((p) =>
          p.project_id === projectData.project_id ? projectData : p
        )
      );
      console.log("案件を更新しました:", projectData);
    }
    // 実際のアプリケーションでは、ここでAPIを呼び出してDBを更新
  };

  // 案件の削除
  const handleDeleteProject = (e, projectId) => {
    e.stopPropagation(); // カードクリックイベントの伝播を停止
    const project = projects.find((p) => p.project_id === projectId);
    if (
      window.confirm(
        `「${project?.project_name}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`
      )
    ) {
      setProjects(projects.filter((p) => p.project_id !== projectId));
      console.log(`案件 ${projectId} を削除しました`);
      // 実際のアプリケーションでは、ここでAPIを呼び出してDBから削除
    }
  };

  // 金額をフォーマット
  const formatPrice = (price) => {
    return new Intl.NumberFormat("ja-JP").format(price);
  };

  // 日付をフォーマット
  const formatDate = (dateString) => {
    if (!dateString) return "未定";
    return format(new Date(dateString), "yyyy/MM/dd (E)", { locale: ja });
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

  // 緊急度に応じたクラス名を返す
  const getUrgencyClass = (daysUntil) => {
    if (daysUntil === null) return "";
    if (daysUntil < 0) return "overdue";
    if (daysUntil <= 3) return "urgent";
    if (daysUntil <= 7) return "warning";
    return "";
  };

  // プロジェクトのリスクバッジを取得
  const getProjectRiskBadge = (projectId) => {
    const projectRisks = riskAlerts.filter(
      (alert) => alert.projectId === projectId
    );

    if (projectRisks.length === 0) return null;

    // 最も高い severity を選択
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const highestRisk = projectRisks.reduce((max, risk) => {
      return severityOrder[risk.severity] > severityOrder[max.severity]
        ? risk
        : max;
    }, projectRisks[0]);

    const severityLabels = {
      critical: "緊急",
      high: "重要",
      medium: "注意",
      low: "確認",
    };

    return {
      severity: highestRisk.severity,
      label: severityLabels[highestRisk.severity],
      count: projectRisks.length,
    };
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-top">
          <h1>📊 案件管理ダッシュボード</h1>
          <div className="header-actions">
            <button
              className="add-project-button"
              onClick={handleAddProject}
              title="新規案件を作成"
            >
              <Plus size={18} />
              案件追加
            </button>
            <button
              className="calendar-nav-button"
              onClick={() => navigate("/calendar")}
              title="カレンダー表示"
            >
              <Calendar size={18} />
              カレンダー
            </button>
            <button
              className={`risk-check-button ${isCheckingRisks ? "loading" : ""}`}
              onClick={handleRiskCheck}
              disabled={isCheckingRisks}
              title="リスクチェック"
            >
              <RefreshCw size={18} className={isCheckingRisks ? "spinning" : ""} />
              {isCheckingRisks ? "チェック中..." : "リスクチェック"}
            </button>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-label">総案件数</span>
            <span className="stat-value">{projects.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">進行中</span>
            <span className="stat-value">
              {
                projects.filter((p) => p.status !== "決済完了").length
              }
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">完了</span>
            <span className="stat-value">
              {projects.filter((p) => p.status === "決済完了").length}
            </span>
          </div>
          {riskAlerts.length > 0 && (
            <div className="stat-card risk-stat">
              <span className="stat-label">リスク検出</span>
              <span className="stat-value risk-value">{riskAlerts.length}</span>
            </div>
          )}
        </div>
      </header>

      {/* リスクアラート表示 */}
      {riskAlerts.length > 0 && (
        <RiskAlerts
          alerts={riskAlerts}
          onDismiss={handleDismissAlert}
          onViewProject={handleViewProject}
        />
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {PROJECT_STATUSES.map((status) => (
            <div key={status} className="kanban-column">
              <div className="column-header">
                <h2 className="column-title">{status}</h2>
                <span className="column-count">
                  {projectsByStatus[status].length}
                </span>
              </div>

              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`column-content ${
                      snapshot.isDraggingOver ? "dragging-over" : ""
                    }`}
                  >
                    {projectsByStatus[status].length === 0 ? (
                      <div className="empty-column">
                        <p>案件がありません</p>
                      </div>
                    ) : (
                      projectsByStatus[status].map((project, index) => {
                        const daysUntil = getDaysUntilSettlement(
                          project.settlement_date
                        );
                        return (
                          <Draggable
                            key={project.project_id}
                            draggableId={String(project.project_id)}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`project-card ${
                                  snapshot.isDragging ? "dragging" : ""
                                } ${getUrgencyClass(daysUntil)}`}
                                onClick={() =>
                                  handleProjectClick(project.project_id)
                                }
                              >
                                <div className="project-card-header">
                                  <h3 className="project-name">
                                    {project.project_name}
                                  </h3>
                                  <button
                                    className="delete-project-button"
                                    onClick={(e) => handleDeleteProject(e, project.project_id)}
                                    title="案件を削除"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                                {/* リスクバッジ表示 */}
                                {(() => {
                                  const riskBadge = getProjectRiskBadge(project.project_id);
                                  if (riskBadge) {
                                    return (
                                      <div className={`risk-badge ${riskBadge.severity}`}>
                                        <AlertTriangle size={12} />
                                        {riskBadge.label}
                                        {riskBadge.count > 1 && ` (${riskBadge.count}件)`}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}

                                <div className="project-info">
                                  <div className="info-row">
                                    <Calendar size={16} />
                                    <span className="info-label">決済日:</span>
                                    <span className="info-value">
                                      {formatDate(project.settlement_date)}
                                    </span>
                                  </div>

                                  {daysUntil !== null && (
                                    <div className="days-until">
                                      {daysUntil < 0 ? (
                                        <span className="overdue-text">
                                          期限超過 ({Math.abs(daysUntil)}日)
                                        </span>
                                      ) : daysUntil === 0 ? (
                                        <span className="today-text">
                                          本日決済
                                        </span>
                                      ) : (
                                        <span>あと {daysUntil} 日</span>
                                      )}
                                    </div>
                                  )}

                                  <div className="info-row">
                                    <TrendingUp size={16} />
                                    <span className="info-label">売買代金:</span>
                                    <span className="info-value price">
                                      ¥{formatPrice(project.property_price)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* 案件作成/編集モーダル */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        project={editingProject}
        mode={projectModalMode}
      />
    </div>
  );
};

export default Dashboard;
