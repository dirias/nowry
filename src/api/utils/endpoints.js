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
    search: '/book/search',
    aiExpand: (bookId) => `/book/${bookId}/ai-expand`,
    diagram: (bookId) => `/book/${bookId}/diagram`,
    diagramConfirm: (bookId) => `/book/${bookId}/diagram/confirm`,
    tts: (bookId) => `/book/${bookId}/tts`
  },
  studyCards: {
    generate: '/card/generate',
    generateStream: '/card/generate/stream',
    all: '/study-cards',
    create: '/study-cards',
    update: (id) => `/study-cards/${id}`,
    delete: (id) => `/study-cards/${id}`,
    generateFromBook: '/card/generate-from-book',
    analyzeDeck: '/card/analyze-deck'
  },
  quiz: {
    generateFromBook: '/v1/assistant/quiz/generate-from-book'
  },
  tts: {
    segment: () => '/v1/tts/segment'
  },
  decks: {
    all: '/decks',
    create: '/decks',
    update: (id) => `/decks/${id}`,
    delete: (id) => `/decks/${id}`,
    byId: (id) => `/decks/${id}`,
    cards: (id) => `/decks/${id}/cards`
  },
  annualPlan: {
    base: '/annual-plan',
    get: '/annual-plan',
    full: '/annual-plan/full',
    create: '/annual-plan',
    update: (id) => `/annual-plan/${id}`,
    delete: (id) => `/annual-plan/${id}`
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
    delete: (id) => `/annual-plan/priorities/${id}`,
    reorder: '/annual-plan/priorities/reorder'
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
  milestones: {
    create: (goalId) => `/annual-plan/goals/${goalId}/milestones`
  },
  dailyRoutine: {
    base: '/annual-plan/daily-routine',
    get: '/annual-plan/daily-routine',
    update: '/annual-plan/daily-routine',
    completions: '/annual-plan/daily-routine/completions'
  },
  sheets: {
    all: '/sheets',
    create: '/sheets',
    byId: (id) => `/sheets/${id}`,
    update: (id) => `/sheets/${id}`,
    delete: (id) => `/sheets/${id}`
  },
  goalAI: {
    analyze: '/goal-ai/analyze'
  },
  comments: {
    list: '/v1/comments',
    create: '/v1/comments',
    update: (id) => `/v1/comments/${id}`,
    delete: (id) => `/v1/comments/${id}`
  }
}
