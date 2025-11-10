import React from 'react';
import './App.css'; // This is your main CSS
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';

// Import all your pages
import Navbar from './pages/Navbar'; // <-- Import new Navbar
// import Sidebar from './pages/Sidebar'; // <-- We no longer need Sidebar
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import Dataset from './pages/Dataset';
import Overview from './pages/Overview';
import DistributionPage from './pages/DistributionPage';
import ForecastingPage from './pages/ForecastingPage';
import RecommendationPage from './pages/RecommendationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// --- This is our Protected Route logic ---
const useAuth = () => {
  const token = localStorage.getItem('access_token');
  return token ? true : false;
};

// --- This is our new Layout Component ---
// It renders the Navbar at the top, and the page content below it
const ProtectedLayout = () => {
  const isAuth = useAuth();

  if (!isAuth) {
    // If not logged in, redirect to login
    return <Navigate to="/login" />;
  }

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <Outlet /> {/* This renders the current page (e.g., HomePage) */}
      </div>
    </div>
  );
};

// --- This layout is for public pages (no navbar) ---
const PublicLayout = () => {
  return (
    <div>
      <Outlet />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* --- Public Routes (Login/Register) --- */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/login" />} /> {/* Default to login */}
        </Route>

        {/* --- Protected Routes (The App) --- */}
        <Route element={<ProtectedLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dataset" element={<Dataset />} />
          <Route path="/data" element={<Overview />} /> 
          <Route path="/overview" element={<Overview />} />
          <Route path="/distribution" element={<DistributionPage />} />
          <Route path="/forecasting" element={<ForecastingPage />} />
          <Route path="/prediction" element={<ForecastingPage />} />
          <Route path="/recommendation" element={<RecommendationPage />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;