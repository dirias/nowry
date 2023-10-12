import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../images/logo.png';

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

export default Header;
