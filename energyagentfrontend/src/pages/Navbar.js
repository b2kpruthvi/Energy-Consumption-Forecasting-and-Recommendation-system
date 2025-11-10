import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css'; 

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/home" className="navbar-logo">
          ⚡ Energy Agent
        </Link>
        <ul className="navbar-links">
          <li><Link to="/home">Home</Link></li>
          
        </ul>
      </div>

      <div className="navbar-right">
        <button onClick={handleLogout} className="navbar-logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
