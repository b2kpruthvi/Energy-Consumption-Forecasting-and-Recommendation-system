import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false); // hidden by default

  return (
    <>
      {/* Toggle Button */}
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
        ☰
      </button>

      {/* Sidebar */}
      <nav className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <h2 className="sidebar-title">⚡ Energy Agent</h2>
        <ul>
          <li><Link to="/dataset" onClick={() => setIsOpen(false)}>Dataset Upload</Link></li>
          <li><Link to="/overview" onClick={() => setIsOpen(false)}>Overview</Link></li>
          <li><Link to="/distribution" onClick={() => setIsOpen(false)}>Distribution</Link></li>
          <li><Link to="/forecasting" onClick={() => setIsOpen(false)}>Forecasting</Link></li>
          <li><Link to="/recommendation" onClick={() => setIsOpen(false)}>Recommendation</Link></li>
          <li><a href="/dashboard">Dashboard</a></li>
        </ul>
      </nav>

      {/* Page overlay when sidebar is open */}
      {isOpen && <div className="overlay" onClick={() => setIsOpen(false)}></div>}
    </>
  );
};

export default Sidebar;
