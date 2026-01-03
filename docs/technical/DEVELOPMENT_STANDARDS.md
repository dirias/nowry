# Nowry Development Standards

This document outlines the technical standards and coding conventions for the Nowry project. Adherence to these standards is mandatory to ensure code quality, consistency, and stability.

---

## 1. API & Backend Standards (Python/FastAPI)

### URL Conventions
*   **NO Trailing Slashes:** API endpoints MUST NOT end with a `/`.
    *   *Correct:* `@router.get("/annual-plan")`
    *   *Incorrect:* `@router.get("/annual-plan/")`
    *   *Reason:* Trailing slashes trigger a 307 Temporary Redirect in FastAPI, which often strips Authorization headers and causes CORS preflight failures in the browser.
*   **Plural Resources:** Use plural nouns for resource collections.
    *   *Correct:* `/users`, `/books`, `/goals`
    *   *Incorrect:* `/user`, `/book_list`
*   **Hyphens for Multi-word:** Use hyphens for multi-word paths.
    *   *Correct:* `/focus-areas`
    *   *Incorrect:* `/focusAreas`, `/focus_areas`

### Request & Response
*   **PyDantic Models:** All request bodies and response schemas must be defined as Pydantic models in `app/models/`.
*   **JSON Response:** APIs must return JSON.
*   **HTTP Status Codes:** Use appropriate status codes.
    *   `200 OK`: Successful synchronous request.
    *   `201 Created`: Successful creation.
    *   `400 Bad Request`: Validation or client errors.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Valid token but insufficient permissions (e.g., accessing another user's data).
    *   `404 Not Found`: Resource does not exist.

### Authentication
*   **Dependency Injection:** All protected endpoints MUST use the `get_current_user_authorization` dependency.
    ```python
    @router.get("/items")
    async def get_items(current_user: dict = Depends(get_current_user_authorization)):
        user_id = current_user.get("user_id")
    ```

### Database
*   **ObjectId Handling:** Use `PyObjectId` helpers or string conversion to handle MongoDB `_id` serialization.
*   **Async Driver:** Always use `await` with the `motor` asynchronous MongoDB driver.

---

## 2. Frontend Standards (React)

### Service Layer Pattern
*   **Centralized Endpoints:** NEVER hardcode API URLs in components.
    *   Register all URLs in `src/api/utils/endpoints.js`.
*   **Service Modules:** Create dedicated service files in `src/api/services/` for each feature (e.g., `annualPlanning.service.js`).
    *   Components should call `annualPlanningService.getAnnualPlan()` NOT `axios.get(...)`.

### Component Structure
*   **Directory Organization:** Group related components in feature-specific folders (e.g., `src/components/AnnualPlanning/`).
*   **Imports:** Use clean imports.

### Internationalization (i18n)
*   **Mandatory:**  Refer to `docs/design/DESIGN_GUIDELINES.md`. No hardcoded strings.

### Layout & Styling
*   **Page Containers:** Main pages MUST use `<Container maxWidth='xl'>` for layout consistency.
*   **Responsiveness:** Mobile-first design is mandatory.

---

## 3. Project Structure
*   **Frontend:** `nowry/` (React App)
*   **Backend:** `Nowry-API/` (FastAPI App)
*   **Documentation:** `nowry/docs/`
    *   `design/`: UI/UX Guidelines.
    *   `technical/`: Architecture and Standards.

