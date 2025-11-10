import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/login', {
        email,
        password,
      });

      localStorage.setItem('access_token', response.data.access_token);
      navigate('/home');
    } catch (error) {
      if (error.response) {
        setErrorMessage(error.response.data.message);
      } else if (error.request) {
        setErrorMessage('Network error. Please check your server connection.');
      } else {
        setErrorMessage('An unexpected error occurred.');
      }
    }
  };

  return (
    <div
      className="login-page-container"
      style={{
        backgroundImage: "url('/login-bg-full.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="login-overlay"></div>

      <form className="login-form" onSubmit={handleSubmit}>
        <h2>⚡ Welcome Back</h2>
        <p className="form-subtitle">Log in to your Energy Agent account</p>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" className="login-button">
          Login
        </button>

        <div className="form-footer">
          <p>
            Don’t have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
