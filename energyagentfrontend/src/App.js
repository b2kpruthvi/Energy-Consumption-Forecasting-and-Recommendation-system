// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./pages/Sidebar"; // or Navbar if you use that
import ForecastingPage from "./pages/ForecastingPage";
import DistributionPage from "./pages/DistributionPage";
import Overview from "./pages/Overview";
import Dataset from "./pages/Dataset";
import RecommendationPage from "./pages/RecommendationPage";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
function App() {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <div className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dataset" element={<Dataset />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/distribution" element={<DistributionPage />} />
            <Route path="/forecasting" element={<ForecastingPage />} />
            <Route path="/recommendation" element={<RecommendationPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
