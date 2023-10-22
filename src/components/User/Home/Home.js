import React from 'react';
import { useParams } from 'react-router-dom';

function Home() {
  const { username } = useParams();

  return (
    <div className="user-home-container">
      <h1>Welcome, {username}!</h1>
      <p>This is your personalized home page.</p>
      <p>Explore and use the features available to you.</p>
    </div>
  );
}

export default Home;
