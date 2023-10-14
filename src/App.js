import React, { useEffect }  from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import './styles/App.css';
import './styles/Landing.css';
import './styles/Header.css';
import './styles/Footer.css';
import './styles/Login.css';

import Header from './components/Header';
import Landing from './components/Landing';
import Footer from './components/Footer';
import { Login, Register, ResetPassword } from './components/User'; // Import the LoginForm component

const App = () => {

  useEffect(() => {
    // Create a <link> element for FontAwesome CSS and append it to the document's <head>
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css';
    document.head.appendChild(link);

    // Clean up the <link> element when the component unmounts
    return () => {
      document.head.removeChild(link);
    };
  }, []); // Run this effect only once on component mount
  return (
    <Router>
      <div className="App">
        <Header />
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/resetPassword" element={<ResetPassword />} />
            <Route path="/" element={<Landing />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
