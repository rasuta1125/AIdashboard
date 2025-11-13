import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Clock,
  Filter,
  Sparkles,
  Trash2,
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ja } from "date-fns/locale";
import { mockProjects, mockTasks } from "../utils/mockData";
import { generateScheduleSuggestion } from "../utils/api";
import "../styles/Calendar.css";

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // month, week, day
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [filters, setFilters] = useState({
    showProjects: true,
    showTasks: true,
    showDeadlines: true,
  });
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [scheduleSuggestion, setScheduleSuggestion] = useState(null);
  const navigate = useNavigate();

  // localStorageから案件データを読み込む
  const projects = useMemo(() => {
    const savedProjects = localStorage.getItem('projects');
    return savedProjects ? JSON.parse(savedProjects) : mockProjects;
  }, []);

  // カレンダーイベントの抽出
  const calendarEvents = useMemo(() => {
    const events = [];

    // プロジェクトの重要日程を追加
    if (filters.showProjects) {
      projects.forEach((project) => {
        // 契約日
        if (project.contract_date) {
          events.push({
            id: `project-contract-${project.project_id}`,
            type: "contract",
            title: `契約: ${project.project_name}`,
            date: new Date(project.contract_date),
            projectId: project.project_id,
            projectName: project.project_name,
            color: "#3b82f6", // blue
            allDay: true,
          });
        }

        // 決済日
        if (project.settlement_date) {
          events.push({
            id: `project-settlement-${project.project_id}`,
            type: "settlement",
            title: `決済: ${project.project_name}`,
            date: new Date(project.settlement_date),
            projectId: project.project_id,
            projectName: project.project_name,
            color: "#10b981", // green
            allDay: true,
            important: true,
          });
        }

        // 融資特約期限
        if (filters.showDeadlines && project.loan_special_clause_deadline) {
          events.push({
            id: `project-loan-${project.project_id}`,
            type: "deadline",
            title: `融資特約期限: ${project.project_name}`,
            date: new Date(project.loan_special_clause_deadline),
            projectId: project.project_id,
            projectName: project.project_name,
            color: "#ef4444", // red
            allDay: true,
            important: true,
          });
        }
      });
    }

    // タスクの期限を追加
    if (filters.showTasks) {
      Object.entries(mockTasks).forEach(([projectId, tasks]) => {
        const project = projects.find(
          (p) => p.project_id === parseInt(projectId)
        );
        if (!project) return;

        tasks.forEach((task) => {
          if (task.due_date && !task.is_completed) {
            events.push({
              id: `task-${task.task_id}`,
              type: "task",
              title: `タスク: ${task.task_name}`,
              date: new Date(task.due_date),
              projectId: project.project_id,
              projectName: project.project_name,
              taskId: task.task_id,
              taskName: task.task_name,
              priority: task.priority,
              color:
                task.priority === "高"
                  ? "#f59e0b"
                  : task.priority === "中"
                  ? "#8b5cf6"
                  : "#6b7280",
              allDay: true,
            });
          }
        });
      });
    }

    return events.sort((a, b) => a.date - b.date);
  }, [filters, projects]);

  // 月間ビューの日付配列を生成
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { locale: ja });
    const end = endOfWeek(endOfMonth(currentDate), { locale: ja });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // 週間ビューの日付配列を生成
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: ja });
    const end = endOfWeek(currentDate, { locale: ja });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // 特定日のイベントを取得
  const getEventsForDate = (date) => {
    return calendarEvents.filter((event) =>
      isSameDay(new Date(event.date), date)
    );
  };

  // 月移動
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // 週移動
  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  // 今日に戻る
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // イベントクリック
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // 日付クリック
  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (viewMode === "month") {
      setViewMode("day");
    }
  };

  // 案件に移動
  const navigateToProject = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  // イベント削除ハンドラー
  const handleDeleteEvent = (e, event) => {
    e.stopPropagation();
    
    if (window.confirm(`「${event.title}」を削除してもよろしいですか？`)) {
      console.log("イベントを削除:", event.id);
      // 実際のアプリケーションでは、ここでAPIを呼び出してDBから削除
      // 現在はモックデータなので、ページリロードで元に戻ります
      alert("イベントを削除しました\n（モックデータのため、リロードで復元されます）");
    }
  };

  // AIスケジュール提案を生成
  const handleGenerateSchedule = async () => {
    setIsGeneratingSchedule(true);
    try {
      // 今後30日間のイベントを分析
      const upcomingEvents = calendarEvents.filter((event) => {
        const eventDate = new Date(event.date);
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);
        return eventDate >= today && eventDate <= thirtyDaysLater;
      });

      const result = await generateScheduleSuggestion({
        events: upcomingEvents,
        projects: projects,
        currentDate: new Date().toISOString(),
      });

      if (result.success) {
        setScheduleSuggestion(result.suggestion);
      }
    } catch (error) {
      console.error("スケジュール提案生成エラー:", error);
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  return (
    <div className="calendar-page">
      {/* ヘッダー */}
      <div className="calendar-header">
        <div className="header-title">
          <button
            className="back-to-dashboard"
            onClick={() => navigate("/")}
            title="ダッシュボードに戻る"
          >
            ← ダッシュボード
          </button>
          <CalendarIcon size={32} />
          <h1>スケジュール管理</h1>
        </div>

        <div className="header-controls">
          {/* ビュー切替 */}
          <div className="view-mode-selector">
            <button
              className={`view-button ${viewMode === "month" ? "active" : ""}`}
              onClick={() => setViewMode("month")}
              title="月間ビュー"
            >
              <CalendarIcon size={18} />
              月
            </button>
            <button
              className={`view-button ${viewMode === "week" ? "active" : ""}`}
              onClick={() => setViewMode("week")}
              title="週間ビュー"
            >
              <Clock size={18} />
              週
            </button>
            <button
              className={`view-button ${viewMode === "day" ? "active" : ""}`}
              onClick={() => setViewMode("day")}
              title="日別ビュー"
            >
              <List size={18} />
              日
            </button>
          </div>

          {/* ナビゲーション */}
          <div className="date-navigation">
            <button
              className="nav-button"
              onClick={viewMode === "week" ? goToPreviousWeek : goToPreviousMonth}
            >
              <ChevronLeft size={20} />
            </button>
            <button className="today-button" onClick={goToToday}>
              今日
            </button>
            <button
              className="nav-button"
              onClick={viewMode === "week" ? goToNextWeek : goToNextMonth}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 現在の日付表示 */}
          <div className="current-date-display">
            {viewMode === "month" && format(currentDate, "yyyy年 M月", { locale: ja })}
            {viewMode === "week" &&
              `${format(weekDays[0], "M月d日", { locale: ja })} - ${format(
                weekDays[6],
                "M月d日",
                { locale: ja }
              )}`}
            {viewMode === "day" && format(selectedDate, "yyyy年 M月d日 (E)", { locale: ja })}
          </div>

          {/* AIスケジュール提案ボタン */}
          <button
            className={`ai-schedule-button ${isGeneratingSchedule ? "loading" : ""}`}
            onClick={handleGenerateSchedule}
            disabled={isGeneratingSchedule}
          >
            <Sparkles size={18} className={isGeneratingSchedule ? "spinning" : ""} />
            {isGeneratingSchedule ? "生成中..." : "AI提案"}
          </button>

          {/* フィルターボタン */}
          <button className="filter-button" title="フィルター">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* AI提案表示 */}
      {scheduleSuggestion && (
        <div className="schedule-suggestion-banner">
          <div className="suggestion-header">
            <Sparkles size={20} />
            <h3>AIスケジュール提案</h3>
            <button
              className="close-suggestion"
              onClick={() => setScheduleSuggestion(null)}
            >
              ✕
            </button>
          </div>
          <div className="suggestion-content">
            <p>{scheduleSuggestion.summary}</p>
            {scheduleSuggestion.recommendations && (
              <ul className="recommendation-list">
                {scheduleSuggestion.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* カレンダーコンテンツ */}
      <div className="calendar-content">
        {viewMode === "month" && (
          <MonthView
            monthDays={monthDays}
            currentDate={currentDate}
            getEventsForDate={getEventsForDate}
            handleDateClick={handleDateClick}
            handleEventClick={handleEventClick}
          />
        )}
        {viewMode === "week" && (
          <WeekView
            weekDays={weekDays}
            getEventsForDate={getEventsForDate}
            handleEventClick={handleEventClick}
          />
        )}
        {viewMode === "day" && (
          <DayView
            selectedDate={selectedDate}
            events={getEventsForDate(selectedDate)}
            handleEventClick={handleEventClick}
            navigateToProject={navigateToProject}
          />
        )}
      </div>

      {/* イベント詳細モーダル */}
      {showEventModal && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setShowEventModal(false)}
          navigateToProject={navigateToProject}
        />
      )}
    </div>
  );
};

// 月間ビューコンポーネント
const MonthView = ({ monthDays, currentDate, getEventsForDate, handleDateClick, handleEventClick }) => {
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="month-view">
      {/* 曜日ヘッダー */}
      <div className="weekday-header">
        {weekDays.map((day, index) => (
          <div key={index} className={`weekday ${index === 0 ? "sunday" : index === 6 ? "saturday" : ""}`}>
            {day}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="days-grid">
        {monthDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={index}
              className={`day-cell ${!isCurrentMonth ? "other-month" : ""} ${isCurrentDay ? "today" : ""}`}
              onClick={() => handleDateClick(day)}
            >
              <div className="day-number">{format(day, "d")}</div>
              <div className="day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="event-badge"
                    style={{ backgroundColor: event.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    title={event.title}
                  >
                    {event.title.length > 15 ? event.title.substring(0, 15) + "..." : event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="more-events">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 週間ビューコンポーネント（時間軸表示）
const WeekView = ({ weekDays, getEventsForDate, handleEventClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="week-view">
      <div className="week-header">
        <div className="time-column-header">時間</div>
        {weekDays.map((day, index) => (
          <div key={index} className={`week-day-header ${isToday(day) ? "today" : ""}`}>
            <div className="day-name">{format(day, "E", { locale: ja })}</div>
            <div className="day-date">{format(day, "d")}</div>
          </div>
        ))}
      </div>

      <div className="week-grid">
        <div className="time-column">
          {hours.map((hour) => (
            <div key={hour} className="time-slot">
              {hour}:00
            </div>
          ))}
        </div>

        {weekDays.map((day, dayIndex) => {
          const dayEvents = getEventsForDate(day);
          return (
            <div key={dayIndex} className="week-day-column">
              {hours.map((hour) => (
                <div key={hour} className="hour-slot"></div>
              ))}
              {/* イベントを配置 */}
              <div className="events-overlay">
                {dayEvents.map((event, eventIndex) => (
                  <div
                    key={event.id}
                    className="week-event"
                    style={{
                      backgroundColor: event.color,
                      top: `${eventIndex * 60}px`,
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="event-time">終日</div>
                    <div className="event-title">{event.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 日別リストビューコンポーネント
const DayView = ({ selectedDate, events, handleEventClick, navigateToProject }) => {
  const groupedEvents = useMemo(() => {
    const groups = {
      contract: [],
      settlement: [],
      deadline: [],
      task: [],
    };

    events.forEach((event) => {
      if (groups[event.type]) {
        groups[event.type].push(event);
      }
    });

    return groups;
  }, [events]);

  const eventTypeLabels = {
    contract: "契約",
    settlement: "決済",
    deadline: "期限",
    task: "タスク",
  };

  return (
    <div className="day-view">
      <div className="day-view-header">
        <h2>{format(selectedDate, "yyyy年 M月d日 (E)", { locale: ja })}</h2>
        {events.length === 0 ? (
          <p className="no-events">この日の予定はありません</p>
        ) : (
          <p className="event-count">{events.length}件の予定</p>
        )}
      </div>

      <div className="day-view-content">
        {Object.entries(groupedEvents).map(([type, typeEvents]) => {
          if (typeEvents.length === 0) return null;

          return (
            <div key={type} className="event-group">
              <h3 className="group-title">{eventTypeLabels[type]}</h3>
              <div className="event-list">
                {typeEvents.map((event) => (
                  <div
                    key={event.id}
                    className="event-card"
                    onClick={() => handleEventClick(event)}
                  >
                    <div
                      className="event-indicator"
                      style={{ backgroundColor: event.color }}
                    ></div>
                    <div className="event-info">
                      <h4 className="event-title">{event.title}</h4>
                      <p className="event-project">{event.projectName}</p>
                      {event.priority && (
                        <span className={`priority-badge priority-${event.priority}`}>
                          {event.priority}
                        </span>
                      )}
                    </div>
                    <div className="event-actions">
                      <button
                        className="view-project-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToProject(event.projectId);
                        }}
                      >
                        案件を表示
                      </button>
                      <button
                        className="delete-event-button"
                        onClick={(e) => handleDeleteEvent(e, event)}
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// イベント詳細モーダル
const EventModal = ({ event, onClose, navigateToProject }) => {
  const eventTypeLabels = {
    contract: "契約",
    settlement: "決済",
    deadline: "期限",
    task: "タスク",
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event.title}</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          <div className="event-detail-row">
            <span className="detail-label">種類:</span>
            <span className="detail-value">{eventTypeLabels[event.type]}</span>
          </div>

          <div className="event-detail-row">
            <span className="detail-label">日付:</span>
            <span className="detail-value">
              {format(event.date, "yyyy年 M月d日 (E)", { locale: ja })}
            </span>
          </div>

          <div className="event-detail-row">
            <span className="detail-label">案件:</span>
            <span className="detail-value">{event.projectName}</span>
          </div>

          {event.priority && (
            <div className="event-detail-row">
              <span className="detail-label">優先度:</span>
              <span className={`priority-badge priority-${event.priority}`}>
                {event.priority}
              </span>
            </div>
          )}

          {event.important && (
            <div className="important-notice">
              <span>⚠️</span>
              重要な期限です
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="primary-button"
            onClick={() => navigateToProject(event.projectId)}
          >
            案件詳細を表示
          </button>
          <button className="secondary-button" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
