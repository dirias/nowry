import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom for navigation

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Handle login logic here (e.g., API request or state management)
  };

  return (
    <div className="content">
      <div className="auth-container">
        <h2>Login</h2>
        <form>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" onClick={handleLogin} className="btn-primary">
            Login
          </button>
          <div className="or-divider">
            <span>OR</span>
          </div>
          <button className="google-login" type="button">
            <i className="fab fa-google"></i> Login with Google
          </button>
          <button className="facebook-login" type="button">
            <i className="fab fa-facebook"></i> Login with Facebook
          </button>
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
        </form>
      </div>
    </div>
  );
};

export default Login;
