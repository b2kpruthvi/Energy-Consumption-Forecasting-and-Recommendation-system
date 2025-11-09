import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RegisterPage.css'; // This will import the new CSS

function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters long.');
            return;
        }

        try {
            const response = await axios.post('http://127.0.0.1:5000/api/register', {
                username: username,
                email: email,
                password: password
            });

            console.log('Registration successful:', response.data);
            setSuccessMessage('Account created! Redirecting to login...');

            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            if (error.response) {
                console.error('Registration error:', error.response.data.message);
                setErrorMessage(error.response.data.message);
            } else {
                console.error('Network error:', error.request);
                setErrorMessage('Network error. Is the backend server running?');
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
                <h2>Create Your Account</h2>
                <p className="form-subtitle">Join us and start saving energy today</p>

                {errorMessage && <p className="error-message">{errorMessage}</p>}
                {successMessage && <p className="success-message">{successMessage}</p>}

                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
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
                <button type="submit" className="register-button">Sign Up</button>
                
                <div className="form-footer">
                    <p>Already have an account? <Link to="/login">Log in</Link></p>
                </div>
            </form>
        </div>
    );
}

export default RegisterPage;