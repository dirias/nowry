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
    all: '/study-cards',
    create: '/study-cards',
    update: (id) => `/study-cards/${id}`,
    delete: (id) => `/study-cards/${id}`
  },
  decks: {
    all: '/decks',
    create: '/decks',
    update: (id) => `/decks/${id}`,
    delete: (id) => `/decks/${id}`,
    byId: (id) => `/decks/${id}`
  },
  annualPlan: {
    base: '/annual-plan',
    get: '/annual-plan'
  },
  focusAreas: {
    base: '/annual-plan/focus-areas',
    all: (planId) => `/annual-plan/focus-areas?annual_plan_id=${planId}`,
    create: '/annual-plan/focus-areas',
    update: (id) => `/annual-plan/focus-areas/${id}`,
    delete: (id) => `/annual-plan/focus-areas/${id}`
  },
  priorities: {
    all: (planId) => `/annual-plan/priorities?annual_plan_id=${planId}`,
    create: '/annual-plan/priorities',
    update: (id) => `/annual-plan/priorities/${id}`,
    delete: (id) => `/annual-plan/priorities/${id}`
  },
  goals: {
    all: (focusAreaId) => `/annual-plan/goals?focus_area_id=${focusAreaId}`,
    create: '/annual-plan/goals',
    update: (id) => `/annual-plan/goals/${id}`,
    delete: (id) => `/annual-plan/goals/${id}`
  },
  activities: {
    byGoal: (goalId) => `/annual-plan/goals/${goalId}/activities`,
    create: (goalId) => `/annual-plan/goals/${goalId}/activities`,
    update: (id) => `/annual-plan/activities/${id}`,
    delete: (id) => `/annual-plan/activities/${id}`
  },
  dailyRoutine: {
    base: '/annual-plan/daily-routine',
    get: '/annual-plan/daily-routine',
    update: '/annual-plan/daily-routine'
  }
}
