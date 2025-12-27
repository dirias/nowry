# EPIC: Multi-Modal AI Study Companion & Unified Knowledge Base

**Status:** Draft  
**Priority:** High  
**Assignee:** Development Team  
**Labels:** #AI-Agents, #LangGraph, #OpenSource, #EdTech, #Scalability

---

## 🎯 Objective
Transform the platform from a simple document reader into a **multi-modal AI Tutor** that helps users learn through their preferred methods (Visual, Textual, Auditory, Testing). This involves creating a suite of specialized AI Agents and a Unified Study Section.

---

## 🏗 Technology Stack & Scalability Recommendations (Open Source)

To ensure the system is "free forever" (self-hostable) and scalable to thousands of users, we recommend the following stack:

### 1. **Core Agent Orchestration**
*   **Technology**: **LangGraph** (Already Implemented)
*   **Why**: Best-in-class for stateful, multi-step agent workflows (e.g., "Research topic" -> "Verify facts" -> "Write summary").

### 2. **Questionnaire & Deep Learning (Backend)**
*   **Task Queue**: **Redis Queue (RQ)** or **Celery** with Redis.
    *   *Scalability Check*: As Quiz generation takes time (5-10s), moving this off the main web thread prevents server locking.
*   **Vector Database** (for "Related Text" RAG): **Qdrant** or **ChromaDB**.
    *   *Why*: Both are open-source, run via Docker, and handle millions of vectors efficiently.

### 3. **Visual Support (Diagrams & Mind Maps)**
*   **Generation**: **Mermaid.js** (Syntax generation via LLM).
*   **Rendering & Editing**: **React Flow**.
    *   *Why*: Allows users to *interactively edit* the AI-generated mind maps. It's the industry standard for node-based UIs in React.

### 4. **Reproduce Text (Audio/TTS)**
*   **Engine**: **Piper** (Fast, low-latency) or **Coqui XTTS** (High realistic quality).
    *   *Why*: Fully offline/local. No dependency on expensive APIs like ElevenLabs.
    *   *Scalability*: Can be served via a dedicated microservice container.

---

## 📋 Implementation Roadmap (Stories & Tasks)

### 🟢 Story 1: The Examiner Agent (Questionnaires)
**Goal:** Allow users to generate multiple-choice/true-false quizzes from selected text.
*   **Backend**: Add `quiz_graph` to `AIOrchestrator`. Define Pydantic models for `Quiz`, `Question`, `Option`.
*   **Frontend**: Create `QuestionnaireModal.js`.
*   **Data**: Create `quizzes` collection in MongoDB.

### 🔵 Story 2: The Visualizer Agent (Visual Support)
**Goal:** Turn complex text concepts into visual flowcharts or mind maps.
*   **Backend**: Prompt Engineering to output strictly valid **Mermaid.js** or JSON node/edge data.
*   **Frontend**: Implement `React Flow` canvas to render the output. Allow saving diagram as an image or "Study Asset".

### 🟣 Story 3: The Researcher Agent (Deep Dives)
**Goal:** "Generate related text" helps users understand context beyond the PDF.
*   **Process**:
    1.  Extract keywords.
    2.  Query **DuckDuckGo API** (via `duckduckgo-search` python lib - Free/No Auth).
    3.  Summarize findings.
*   **UI**: Show results in a "Marginalia" sidebar or a "Deep Dive" modal.

### 🟠 Story 4: The Unified Study Hub
**Goal:** A central dashboard combining all study assets.
*   **UI**: Redesign "Cards" page into "Study Center".
*   **Tabs**:
    *   🗂 **Decks** (Flashcards)
    *   📝 **Workbooks** (Quizzes & Exams)
    *   🗺 **Gallery** (Mind Maps & Diagrams)
    *   📊 **Progress** (Stats)

---

## 🚀 Future Scalability Vision
1.  **Agent Swarm**: Move from single `Orchestrator` to a swarm where the "Manager" agent delegates to "Quiz Specialist", "Visual Artist", etc.
2.  **Federated Learning**: Allow users to share optimal decks/quizzes anonymously to fine-tune the local LLaMA/Mistral models.
3.  **Local-First Sync**: Use **RxDB** or **PouchDB** on frontend for offline-first support, syncing with Mongo when online.

---

**Next Immediate Action:** Begin implementation of **Story 1 (Examiner Agent)**.

---

## 🔮 Innovative Expansions (Beyond the Basics)

To truly differentiate the platform and cover **all** learning styles, consider these additions:

### 🎙 Idea 5: The "Audio Podcast" Agent (NotebookLM Style)
*   **Concept**: Instead of a boring monologue (TTS), generate a **lively dialogue** between two AI hosts discussing the concepts in the text.
*   **Why**: Extremely engaging for auditory learners. Turns passive listening into entertainment.
*   **Tech**: Prompt Engineering + Multi-Speaker TTS (Coqui XTTS).

### 🗣 Idea 6: The Socratic Tutor (Interactive Chat)
*   **Concept**: An agent that doesn't just answer questions, but **challenges** the user.
    *   *User*: "Mitochondria is the powerhouse of the cell."
    *   *Agent*: "Why do you say that? What creates the energy specifically?"
*   **Why**: Promotes deep understanding and critical thinking (Active Learning).

### 🎮 Idea 7: The Gamification Agent (Text RPG)
*   **Concept**: Turn the study material into a scenario.
    *   *Example (Medical)*: "You are a doctor in the ER. A patient comes in with symptoms matching [Text Selection]. What do you do?"
*   **Why**: Maximum engagement through application of knowledge.

### 📅 Idea 8: The "Study Planner" Agent
*   **Concept**: Analyzes the *entire book* and generates a 4-week calendar schedule.
*   **Output**: "Day 1: Read Ch.1 + Quiz. Day 2: Review Deck A."
*   **Why**: Solves the "overwhelmed student" problem.
