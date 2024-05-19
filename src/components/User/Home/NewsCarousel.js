import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Carousel from 'react-bootstrap/Carousel';

const apiKey = 'caeb2784955f4fe191eade6917713cb3'; // Replace 'YOUR_NEWSAPI_API_KEY' with your actual API key

function NewsCarousel() {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`);
        setNews(response.data.articles.filter(article => article.urlToImage));
      } catch (error) {
        console.error('Error fetching news:', error);
      }
    };

    fetchNews();
  }, []);

  return (
    <Carousel data-bs-theme="dark">
      {news.map((article, index) => (
        <Carousel.Item key={index}>
          <img
            className="d-block w-100"
            src={article.urlToImage}
            alt="Slide"
          />
          <Carousel.Caption>
            <h5>{article.title}</h5>
            <p>{article.description}</p>
          </Carousel.Caption>
        </Carousel.Item>
      ))}
    </Carousel>
  );
}

export default NewsCarousel;
