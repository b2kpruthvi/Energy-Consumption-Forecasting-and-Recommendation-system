import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import your pages and layout
import Layout from './pages/Layout'; // New Layout (includes Sidebar)
import HomePage from './pages/HomePage';
import Dataset from './pages/Dataset';
import Overview from './pages/Overview';
import DistributionPage from './pages/DistributionPage';
import ForecastingPage from './pages/ForecastingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Authentication helper
const useAuth = () => {
  const token = localStorage.getItem('access_token');
  return Boolean(token);
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const isAuth = useAuth();
  return isAuth ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected Routes - use the new Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="home" element={<HomePage />} />
          <Route path="dataset" element={<Dataset />} />
          <Route path="overview" element={<Overview />} />
          <Route path="distribution" element={<DistributionPage />} />
          <Route path="forecasting" element={<ForecastingPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
