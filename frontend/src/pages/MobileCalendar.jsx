import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, List, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { mockProjects, mockTasks } from "../utils/mockData";
import MobileBottomNav from "../components/MobileBottomNav";
import "../styles/MobileCalendar.css";

const MobileCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("month"); // month or list
  const navigate = useNavigate();

  // カレンダーイベントの抽出
  const calendarEvents = useMemo(() => {
    const events = [];

    mockProjects.forEach((project) => {
      if (project.contract_date) {
        events.push({
          id: `contract-${project.project_id}`,
          type: "contract",
          title: project.project_name,
          date: new Date(project.contract_date),
          projectId: project.project_id,
          color: "#3b82f6",
        });
      }

      if (project.settlement_date) {
        events.push({
          id: `settlement-${project.project_id}`,
          type: "settlement",
          title: project.project_name,
          date: new Date(project.settlement_date),
          projectId: project.project_id,
          color: "#10b981",
        });
      }

      if (project.loan_special_clause_deadline) {
        events.push({
          id: `deadline-${project.project_id}`,
          type: "deadline",
          title: project.project_name,
          date: new Date(project.loan_special_clause_deadline),
          projectId: project.project_id,
          color: "#ef4444",
        });
      }
    });

    Object.entries(mockTasks).forEach(([projectId, tasks]) => {
      const project = mockProjects.find((p) => p.project_id === parseInt(projectId));
      if (!project) return;

      tasks.forEach((task) => {
        if (task.due_date && !task.is_completed) {
          events.push({
            id: `task-${task.task_id}`,
            type: "task",
            title: `${project.project_name}: ${task.task_name}`,
            date: new Date(task.due_date),
            projectId: project.project_id,
            color: task.priority === "高" ? "#f59e0b" : "#8b5cf6",
          });
        }
      });
    });

    return events.sort((a, b) => a.date - b.date);
  }, []);

  // 月間ビューの日付配列
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { locale: ja });
    const end = endOfWeek(endOfMonth(currentDate), { locale: ja });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // 特定日のイベント取得
  const getEventsForDate = (date) => {
    return calendarEvents.filter((event) => isSameDay(new Date(event.date), date));
  };

  // 今後のイベント（リストビュー用）
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return calendarEvents
      .filter((event) => event.date >= today)
      .slice(0, 20);
  }, [calendarEvents]);

  // 月移動
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 今日に戻る
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // 日付クリック
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setViewMode("list");
  };

  // イベント種類のラベル
  const eventTypeLabels = {
    contract: "契約",
    settlement: "決済",
    deadline: "期限",
    task: "タスク",
  };

  return (
    <div className="mobile-calendar">
      {/* ヘッダー */}
      <header className="mobile-calendar-header">
        <div className="header-controls">
          <h1>📅 カレンダー</h1>
          <div className="view-toggle">
            <button
              className={viewMode === "month" ? "active" : ""}
              onClick={() => setViewMode("month")}
            >
              <CalendarIcon size={18} />
            </button>
            <button
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {viewMode === "month" && (
          <>
            <div className="month-navigation">
              <button onClick={goToPreviousMonth} className="nav-btn">
                <ChevronLeft size={20} />
              </button>
              <div className="current-month">
                {format(currentDate, "yyyy年 M月", { locale: ja })}
              </div>
              <button onClick={goToNextMonth} className="nav-btn">
                <ChevronRight size={20} />
              </button>
            </div>
            <button className="today-btn" onClick={goToToday}>
              今日
            </button>
          </>
        )}
      </header>

      {/* カレンダーコンテンツ */}
      {viewMode === "month" ? (
        <div className="mobile-month-view">
          {/* 曜日ヘッダー */}
          <div className="weekdays">
            {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
              <div key={i} className={`weekday ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>
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
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={index}
                  className={`day-cell ${!isCurrentMonth ? "other-month" : ""} ${
                    isCurrentDay ? "today" : ""
                  } ${isSelected ? "selected" : ""}`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className="day-number">{format(day, "d")}</div>
                  {dayEvents.length > 0 && (
                    <div className="event-dots">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="event-dot"
                          style={{ backgroundColor: event.color }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="more-events-badge">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mobile-list-view">
          <h2 className="list-title">
            {selectedDate
              ? format(selectedDate, "M月d日 (E)", { locale: ja })
              : "今後の予定"}
          </h2>

          <div className="events-list">
            {(selectedDate ? getEventsForDate(selectedDate) : upcomingEvents).map((event) => (
              <div
                key={event.id}
                className="event-item"
                onClick={() => navigate(`/project/${event.projectId}`)}
              >
                <div className="event-indicator" style={{ backgroundColor: event.color }} />
                <div className="event-content">
                  <div className="event-type">{eventTypeLabels[event.type]}</div>
                  <div className="event-title">{event.title}</div>
                  <div className="event-date">
                    {format(event.date, "M月d日 (E)", { locale: ja })}
                  </div>
                </div>
                <ChevronRight size={20} className="chevron" />
              </div>
            ))}

            {(selectedDate ? getEventsForDate(selectedDate) : upcomingEvents).length === 0 && (
              <div className="empty-events">
                <p>予定がありません</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ボトムナビゲーション */}
      <MobileBottomNav />
    </div>
  );
};

export default MobileCalendar;
