import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../images/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

const Header = ({ username }) => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('authToken');
    navigate('/');
    window.location.reload();
  };

  const isLoggedIn = localStorage.getItem('authToken');

  return (
    <header className="header">
      <div className="logo">
        <Link to="/">
          <img src={Logo} alt="Logo" className="logo-img" />
        </Link>
      </div>
      <nav className="nav">
        <ul className="nav-list">
          {!isLoggedIn ? (
            <>
              <li className="nav-item">About</li>
              <li className="nav-item">Contact</li>
              <li className="nav-item">Services</li>
              <li className="nav-item">FAQ</li>
              <li className="nav-item">
                <Link to="/login" className="nav-link">
                  Login <i className="fas fa-angle-right "></i>
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">Study</li>
              <li className="nav-item">Cards</li>
              <li className="nav-item">
                <Link to="/books" className="link">Books</Link>
              </li>
              <li className="nav-item">{username} <span onClick={logout} ><FontAwesomeIcon icon={faSignOutAlt} /></span></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};


export default Header;
