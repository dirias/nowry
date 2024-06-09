import axios from 'axios';

const SERVER = 'http://localhost:8000/'

export const saveBookPage = async (pageIndex, content) => {
  
    console.log('Reaching backend')
    const token = localStorage.getItem('authToken');
    console.log(token)
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    console.log(config, 'config');
    const response = await axios.post(`${SERVER}book_page/save_book_page`, {
        title: 'Book Title',
        page_number: pageIndex + 1,
        content: content[pageIndex],
    }, config);
    console.log(response, 'response')
};

export const getAllBooks = async () => {
  
  console.log('Reaching backend')
  const token = localStorage.getItem('authToken');
  console.log(token)
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  console.log(config, 'config');
  const response = await axios.get(`${SERVER}book/all`, config);
  console.log(response, 'response')
  return response.data
};

export const searchBooks = async (searchTerm) => {
  console.log('Searching books...');
  const token = localStorage.getItem('authToken');
  const config = {
      headers: {
          'Authorization': `Bearer ${token}`,
      },
  };
  const response = await axios.get(`${SERVER}book/search?title=${searchTerm}`, config);
  console.log(response, 'response');
  return response.data;
};


export const createBook = async (title, author, isbn) => {
  
  console.log('Reaching backend')
  const token = localStorage.getItem('authToken'); 
  console.log(token)
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  const response = await axios.post(`${SERVER}book/create`, {
      title: title,
      author: author,
      isbn: isbn,
  }, config);

  console.log(response, 'response')
  return response.data
};
