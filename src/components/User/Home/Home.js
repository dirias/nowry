import React from 'react';
import SideMenu from './SideMenu';
import NewsCarousel from './NewsCarousel';

function Home() {
  const username = localStorage.getItem('username')

  return (
    <div className="content">
      <div className="side-container">
        <h1>Welcome, {username}!</h1>
        <SideMenu />
      </div>
      <div className="carousel-container">
        <NewsCarousel />
      </div>
    </div>
  );
}

export default Home;
