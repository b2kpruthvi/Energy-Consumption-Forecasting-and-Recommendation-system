import React from "react";
import { Link, useNavigate } from "react-router-dom";
// We don't import Sidebar.css. App.css handles all styling.

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    // The main 'nav' tag now has the "sidebar" class
    <nav className="sidebar">
      
      {/* Sidebar title */}
      <h2 style={{ textAlign: 'center', color: '#ecf0f1', marginBottom: '20px' }}>
      ⚡Energy Agent
      </h2>
      
      {/* Links */}
      <ul>
        <li><Link to="/home">Home</Link></li>
        <li><Link to="/dataset">Dataset Upload</Link></li>
        <li><Link to="/overview">Overview</Link></li>
        <li><Link to="/distribution">Distribution</Link></li>
        <li><Link to="/forecasting">Forecasting</Link></li>
        <li><Link to="/recommendation">Recommendation</Link></li>
        <li><Link to="/dashboard">Dashboard</Link></li>
      </ul>
      
      {/* --- This is the Logout Button --- */}
      <div className="sidebar-footer">
        <button className="logout-button-sidebar" onClick={handleLogout}>
          Logout
        </button>
      </div>

    </nav>
  );
};

export default Sidebar;