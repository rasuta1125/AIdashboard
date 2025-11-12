import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, FileText, Bell } from "lucide-react";
import "../styles/MobileBottomNav.css";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: "/",
      icon: Home,
      label: "ホーム",
    },
    {
      path: "/calendar",
      icon: Calendar,
      label: "カレンダー",
    },
    {
      path: "/projects",
      icon: FileText,
      label: "案件",
    },
    {
      path: "/alerts",
      icon: Bell,
      label: "通知",
    },
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <button
            key={item.path}
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
          >
            <Icon size={24} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
