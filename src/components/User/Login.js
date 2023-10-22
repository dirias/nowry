import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import axios for making API requests

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      const response = await axios.post('http://localhost:8000/login', formData);

      // Check if the login was successful
      if (response.status === 200) {
        console.log(response)
        // Redirect to a success page or perform any other action
        navigate(`/home/${response.data.username}`);
      } else {
        // Handle login errors
        console.error('Login failed:', response.data.detail);
      }
    } catch (error) {
      // Handle network errors or other issues
      console.error('Login failed:', error.message);
    }
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
          <p>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </form>

        <div className="forgot-password-section">
          <p>Forgot your password?</p>
          <Link to="/resetPassword">Reset it here</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
