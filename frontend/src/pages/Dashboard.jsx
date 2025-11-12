import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { mockProjects, PROJECT_STATUSES } from "../utils/mockData";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const [projects, setProjects] = useState(mockProjects);
  const navigate = useNavigate();

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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>📊 案件管理ダッシュボード</h1>
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
        </div>
      </header>

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
                                <h3 className="project-name">
                                  {project.project_name}
                                </h3>

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
    </div>
  );
};

export default Dashboard;
