import React from 'react';
import SideMenu from './SideMenu';
import NewsCarousel from './NewsCarousel';

function Home() {
  const username = localStorage.getItem('username')

  return (
    <div className="content">
      <view className="side-container">
        <h1>Welcome, {username}!</h1>
        <SideMenu />
      </view>
      <view className="carousel-container">
        <NewsCarousel />
      </view>
    </div>
  );
}

export default Home;
