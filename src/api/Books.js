import axios from 'axios';

const SERVER = 'http://localhost:8000/'

export const saveBookPage = async (pageIndex, pageContent, book_id) => {
  console.log('Reaching backend');
  const token = localStorage.getItem('authToken');
  const username = localStorage.getItem('username');

  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const payload = {
    page_number: pageIndex,
    book_id: book_id,
    content: pageContent,
    word_count: 50

  };

  console.log(config, 'config');
  console.log(payload, 'payload');

  try {
    const response = await axios.post(`${SERVER}book_page/save_book_page`, {
      page_number: pageIndex,
      book_id: book_id,
      content: pageContent,
      word_count: 50
  }, config);
    console.log(response, 'response');
  } catch (error) {
    console.error('Error saving book page:', error);
  }
};

export const getBookById = async (id) => {
  try {
    console.log('Reaching backend');
    const token = localStorage.getItem('authToken');
    console.log(token);
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    console.log(config, 'config');
    const response = await axios.get(`${SERVER}book/${id}`, config);
    console.log(response, 'response');
    return response.data;
  } catch (error) {
    console.error('Error fetching book:', error);
    throw error; // Propagate the error to the caller
  }
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
