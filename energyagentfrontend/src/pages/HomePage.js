// energyagentfrontend/src/pages/HomePage.js
import React from "react";
import { useNavigate, Link } from "react-router-dom"; // Import Link
import "./HomePage.css"; // Import our new CSS

const HomePage = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <div className="home-container">
      {/* --- HEADER --- */}
      <header className="home-header">
        <h1>Energy Dashboard</h1>
        <button onClick={handleLogout} className="logout-button-home">
          Logout
        </button>
      </header>

      {/* --- WELCOME TEXT --- */}
      <p style={{ fontSize: "1.2rem", color: "#4A5568", marginBottom: "2.5rem" }}>
        Welcome! Select a module below to get started.
      </p>

      {/* --- INTERACTIVE CARDS --- */}
      <div className="card-grid">
        {/* Card 1: Upload */}
        <Link to="/dataset" className="nav-card">
          <div className="card-icon">📤</div>
          <h3>Upload Dataset</h3>
          <p>Start by uploading your energy consumption CSV file.</p>
        </Link>

        {/* Card 2: Overview */}
        <Link to="/overview" className="nav-card">
          <div className="card-icon">📊</div>
          <h3>Data Overview</h3>
          <p>View statistics and a summary of your uploaded data.</p>
        </Link>

        {/* Card 3: Forecasting */}
        <Link to="/forecasting" className="nav-card">
          <div className="card-icon">📈</div>
          <h3>Forecasting</h3>
          <p>Predict future energy consumption based on your data.</p>
        </Link>

        {/* Card 4: Recommendation */}
        <Link to="/recommendation" className="nav-card">
          <div className="card-icon">💡</div>
          <h3>Recommendations</h3>
          <p>Get smart recommendations to optimize energy usage.</p>
        </Link>

        {/* Card 5: Distribution */}
        <Link to="/distribution" className="nav-card">
          <div className="card-icon">📉</div>
          <h3>Distribution</h3>
          <p>Analyze the distribution of your energy data points.</p>
        </Link>

        {/* Card 6: Dashboard */}
        <Link to="/dashboard" className="nav-card">
          <div className="card-icon">🖥️</div>
          <h3>Main Dashboard</h3>
          <p>See all your key metrics in one comprehensive view.</p>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
