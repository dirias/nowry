/**
 * API endpoint constants
 * Centralized location for all API endpoints
 */
export const ENDPOINTS = {
  books: {
    base: '/book',
    all: '/book/all',
    byId: (id) => `/book/${id}`,
    create: '/book/create',
    update: (id) => `/book/edit/${id}`,
    delete: (id) => `/book/delete/${id}`,
    search: '/book/search'
  },
  pages: {
    save: '/book_page/save_book_page',
    delete: (id) => `/book_page/delete/${id}`
  },
  studyCards: {
    generate: '/card/generate',
    all: '/study-cards/',
    create: '/study-cards/',
    update: (id) => `/study-cards/${id}`,
    delete: (id) => `/study-cards/${id}`
  },
  decks: {
    all: '/decks/',
    create: '/decks/',
    update: (id) => `/decks/${id}`,
    delete: (id) => `/decks/${id}`,
    byId: (id) => `/decks/${id}`
  }
}
