import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css'; // This will import the new CSS

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
                email: email,
                password: password
            });

            localStorage.setItem('access_token', response.data.access_token);
            navigate('/home'); // Redirect to home on success

        } catch (error) {
            if (error.response) {
                console.error('Login error:', error.response.data.message);
                setErrorMessage(error.response.data.message);
            } else if (error.request) {
                console.error('Network error:', error.request);
                setErrorMessage('Network error. Is the backend server running?');
            } else {
                console.error('Error:', error.message);
                setErrorMessage('An unexpected error occurred.');
            }
        }
    };

    return (
        // The main container has the background image
        <div 
          className="login-page-container" 
          style={{ 
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/login-bg-full.png')` 
          }}
        >
            {/* The form is centered in the middle */}
            <form className="login-form" onSubmit={handleSubmit}>
               <h1>Energy Agent</h1>
                <h2><p className="form-subtitle">Login to your  account</p></h2>
                
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
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
                    />
                </div>
                <button type="submit" className="login-button">Login</button>
                
                <div className="form-footer">
                    <p>Don't have an account? <Link to="/register">Sign up</Link></p>
                </div>
            </form>
        </div>
    );
}

export default LoginPage;