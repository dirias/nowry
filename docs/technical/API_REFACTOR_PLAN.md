# JIRA Ticket: Refactor API Layer for Scalability

---

## 📋 **Summary**
Refactor `src/api` folder to improve scalability, maintainability, and type safety with TypeScript and modern patterns optimized for FastAPI backend.

---

## 📝 **Description**

### **Current State:**
- All API calls are in monolithic `Books.js` and `StudyCards.js` files
- Repeated authentication logic in every function
- No TypeScript types for API responses
- No centralized error handling
- Manual token management in each function
- No request/response caching

### **Desired State:**
- Modular service-based architecture
- Centralized axios instance with interceptors
- TypeScript types auto-generated from FastAPI OpenAPI spec
- Consistent error handling across the app
- Optional React Query integration for caching and state management
- Environment-aware configuration

### **Business Value:**
- **Faster development** - Reusable patterns and DRY code
- **Fewer bugs** - TypeScript catches errors at compile time
- **Better UX** - React Query provides caching, optimistic updates, and loading states
- **Easier onboarding** - Clear structure for new developers
- **Production-ready** - Proper error handling and logging

---

## ✅ **Acceptance Criteria**

- [ ] Axios client created with request/response interceptors
- [ ] Authentication token automatically added to all requests
- [ ] Unauthorized (401) errors redirect to login page
- [ ] API services refactored into separate modules (books, pages, cards)
- [ ] TypeScript types defined for all API requests/responses
- [ ] Environment variables used for API base URL
- [ ] All existing API functionality works identically
- [ ] No breaking changes to components using the API
- [ ] Console.log statements removed or replaced with proper logging
- [ ] Error handling is consistent across all services

---

## 🏗️ **Technical Implementation**

### **New Folder Structure:**
```
src/api/
├── client/
│   ├── index.ts              # Axios instance with interceptors
│   ├── interceptors.ts       # Auth & error interceptors
│   └── config.ts            # Base URL, timeout config
├── services/
│   ├── books.service.ts     # Book CRUD operations
│   ├── pages.service.ts     # Page operations
│   ├── cards.service.ts     # Study cards operations
│   └── auth.service.ts      # Authentication (future)
├── types/
│   ├── api.ts              # Auto-generated from OpenAPI
│   ├── book.types.ts       # Custom book types
│   └── common.types.ts     # Shared types
├── hooks/ (optional)
│   ├── useBooks.ts         # React Query hooks
│   ├── usePages.ts
│   └── useCards.ts
└── utils/
    ├── endpoints.ts        # Endpoint constants
    └── queryKeys.ts        # React Query keys
```

### **Core Features:**

#### **1. Axios Client (`client/index.ts`)**
- Single axios instance with baseURL
- Request interceptor to add JWT token
- Response interceptor for global error handling
- 401 errors auto-redirect to login
- Configurable timeout (10s default)

#### **2. Service Modules**
- **books.service.ts**: getAll, getById, create, update, delete, search
- **pages.service.ts**: savePage, getPagesByBookId
- **cards.service.ts**: generateCard, getCards

#### **3. TypeScript Integration**
- Types generated from FastAPI OpenAPI spec
- Type-safe API calls and responses
- Autocomplete for API payloads
- Compile-time error checking

#### **4. Environment Configuration**
```env
VITE_API_URL=http://localhost:8000
VITE_API_TIMEOUT=10000
```

---

## 🔨 **Sub-tasks**

### **Phase 1: Setup & Infrastructure (4 points)**
- [ ] Install dependencies (axios, TypeScript, openapi-typescript)
- [ ] Create `api/client/index.ts` with axios instance
- [ ] Add request/response interceptors
- [ ] Setup environment variables (.env)
- [ ] Test axios client with existing endpoints

### **Phase 2: Migrate Books API (5 points)**
- [ ] Create `api/services/books.service.ts`
- [ ] Migrate all functions from `Books.js`
- [ ] Remove duplicate auth logic
- [ ] Handle camelCase ↔ snake_case conversion
- [ ] Update all components using book API
- [ ] Remove old `Books.js` file

### **Phase 3: Migrate Pages & Cards (3 points)**
- [ ] Create `api/services/pages.service.ts`
- [ ] Create `api/services/cards.service.ts`
- [ ] Migrate functions from `StudyCards.js`
- [ ] Update components using these services
- [ ] Remove old files

### **Phase 4: TypeScript Types (5 points)**
- [ ] Setup OpenAPI type generation script
- [ ] Create `api/types/` folder structure
- [ ] Generate types from FastAPI: `npm run types:generate`
- [ ] Define custom types not in OpenAPI spec
- [ ] Update all services to use TypeScript

### **Phase 5: React Query Integration (Optional - 8 points)**
- [ ] Install `@tanstack/react-query`
- [ ] Create `QueryClient` provider
- [ ] Create custom hooks (`useBooks`, `useBook`, etc.)
- [ ] Add optimistic updates for mutations
- [ ] Setup query key factory
- [ ] Migrate components to use hooks
- [ ] Add loading/error states to UI

### **Phase 6: Testing & Documentation (3 points)**
- [ ] Add JSDoc comments to all service functions
- [ ] Create API documentation in README
- [ ] Test all API endpoints work correctly
- [ ] Verify error handling (network errors, 401, 404, 500)
- [ ] Remove all console.logs or add proper logging
- [ ] Performance test with DevTools

---

## 📦 **Dependencies**

### **Required:**
```bash
npm install axios
npm install -D typescript @types/node
npm install -D openapi-typescript
```

### **Optional (React Query):**
```bash
npm install @tanstack/react-query
npm install @tanstack/react-query-devtools
```

---

## 🎯 **Story Points Estimate**

- **Without React Query**: 13 points (Phases 1-4 + 6)
- **With React Query**: 21 points (All phases)

**Recommended**: Start without React Query (13 points), add it later if needed.

---

## 📚 **References**

- [Axios Documentation](https://axios-http.com/docs/intro)
- [TypeScript with Axios](https://axios-http.com/docs/typescript)
- [OpenAPI TypeScript Generator](https://github.com/drwpow/openapi-typescript)
- [React Query Docs](https://tanstack.com/query/latest)
- [FastAPI OpenAPI](https://fastapi.tiangolo.com/tutorial/metadata/)

---

## ⚠️ **Risks & Mitigation**

| Risk | Mitigation |
|------|------------|
| Breaking changes to existing components | Thorough testing, gradual migration |
| Type mismatches between FE/BE | Use OpenAPI spec as source of truth |
| Performance regression | Benchmark before/after, use React Query caching |
| Learning curve for team | Good documentation, pair programming |

---

## 🚀 **Success Metrics**

- ✅ 100% of API calls use new service layer
- ✅ Zero auth-related bugs in production
- ✅ TypeScript types for all API interactions
- ✅ Reduced duplicate code (measure LOC before/after)
- ✅ Faster development of new API features
- ✅ Improved error handling and user feedback

---

## 📌 **Labels**
`refactor` `api` `typescript` `fastapi` `technical-debt` `scalability`

---

## 👥 **Assignee**
_To be assigned_

---

## ⏱️ **Sprint**
_To be scheduled_

---

## 📎 **Attachments**
- Current `Books.js` file
- Proposed folder structure diagram
- Example service implementation
