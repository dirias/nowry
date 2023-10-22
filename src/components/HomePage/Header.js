import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../images/logo.png';

const Header = () => {
  return (
    <header className="header">
      <div className="logo">
        <Link to="/">
          <img src={Logo} alt="Logo" className="logo-img" />
        </Link>
      </div>
      <nav className="nav">
        <ul className="nav-list">
          <li className="nav-item">About</li>
          <li className="nav-item">Contact</li>
          <li className="nav-item">Services</li>
          <li className="nav-item">FAQ</li>
          <li className="nav-item">
            <Link to="/login" className="nav-link">
              Login <i className="fas fa-angle-right "></i>
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};  

const HeaderLoggedIn = ({ username }) => {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('username')
    localStorage.removeItem('authToken')
    navigate('/');
  }
  return (
    <header className="header">
      <div className="logo">
        <Link to="/">
          <img src={Logo} alt="Logo" className="logo-img" />
        </Link>
      </div>
      <nav className="nav">
        <ul className="nav-list">
          <li className="nav-item">Study</li>
          <li className="nav-item">Cards</li>
          <li className="nav-item">Books</li>
          <li className="nav-item" onClick={logout}>Logout</li>
          <li className="nav-item">Welcome, {username}</li>
        </ul>
      </nav>
    </header>
  );
};

export { Header, HeaderLoggedIn };
