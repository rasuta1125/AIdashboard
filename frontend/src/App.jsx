import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:projectId" element={<ProjectDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
