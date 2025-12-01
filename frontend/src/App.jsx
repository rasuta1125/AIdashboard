import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import Calendar from "./pages/Calendar";
import MobileDashboard from "./pages/MobileDashboard";
import MobileCalendar from "./pages/MobileCalendar";
import MobileAlerts from "./pages/MobileAlerts";
import useIsMobile from "./hooks/useIsMobile";
import "./App.css";

function App() {
  const isMobile = useIsMobile();

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/" 
            element={isMobile ? <MobileDashboard /> : <Dashboard />} 
          />
          <Route 
            path="/projects" 
            element={isMobile ? <MobileDashboard /> : <Dashboard />} 
          />
          <Route path="/project/:projectId" element={<ProjectDetail />} />
          <Route 
            path="/calendar" 
            element={isMobile ? <MobileCalendar /> : <Calendar />} 
          />
          <Route 
            path="/alerts" 
            element={isMobile ? <MobileAlerts /> : <Dashboard />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
