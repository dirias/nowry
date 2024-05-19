import axios from 'axios';

export const saveBookPage = async (pageIndex, content) => {
    console.log('Reaching backend')
    const token = localStorage.getItem('authToken'); // Replace with the actual token from your authentication
    console.log(token)
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    console.log(config, 'config');
    const response = await axios.post('http://localhost:8000/save_book_page', {
        title: 'Book Title', // Provide the book title here
        page_number: pageIndex + 1,
        content: content[pageIndex],
    }, config);
    console.log(response, 'response')
};
