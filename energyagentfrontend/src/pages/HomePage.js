import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div
      className="home-container"
      style={{
        backgroundImage: "url('/home-bg-full.jpg')", // ✅ from /public folder
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="overlay">
        <div className="header-section">
          <h1>⚡ Energy Agent</h1>
          <p>Analyze, Forecast, and Optimize your Energy Consumption</p>
        </div>

        <div className="card-grid">
          <Link to="/dataset" className="nav-card">
            <div className="card-icon">📤</div>
            <h3>Add Data</h3>
            <p>Enter your daily consumption data manually.</p>
          </Link>

          <Link to="/data" className="nav-card">
            <div className="card-icon">📊</div>
            <h3>Data Overview</h3>
            <p>View statistics and summaries of your entered data.</p>
          </Link>

          <Link to="/forecasting" className="nav-card">
            <div className="card-icon">📈</div>
            <h3>Forecasting</h3>
            <p>Predict future energy usage with intelligent forecasting.</p>
          </Link>

          <Link to="/recommendation" className="nav-card">
            <div className="card-icon">💡</div>
            <h3>Recommendations</h3>
            <p>Get smart suggestions to reduce and optimize energy usage.</p>
          </Link>

          <Link to="/distribution" className="nav-card">
            <div className="card-icon">📉</div>
            <h3>Distribution</h3>
            <p>Visualize the distribution of your energy data points.</p>
          </Link>

          <Link to="/dashboard" className="nav-card">
            <div className="card-icon">🖥️</div>
            <h3>Main Dashboard</h3>
            <p>See all your key energy metrics in one place.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
