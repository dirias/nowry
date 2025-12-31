# Nowry Documentation

Welcome to the Nowry documentation! This guide will help you navigate all available documentation.

## 📚 Documentation Structure

```
docs/
├── deploy/          Deployment & hosting guides
├── design/          Design system & UI guidelines
├── features/        Feature implementation docs
├── planning/        Project planning & roadmaps
└── technical/       Technical implementation details
```

---

## 🚀 Deployment Documentation

📁 **Location**: [`docs/deploy/`](./deploy/)

Start here to deploy Nowry to production or local environment.

| Document | Description | For |
|----------|-------------|-----|
| [**Deployment Index**](./deploy/DEPLOYMENT_README.md) | Main deployment documentation hub | Everyone |
| [**Quick Deploy**](./deploy/QUICK_DEPLOY.md) | 30-minute deployment guide | First-time deployers |
| [**Full Deployment Guide**](./deploy/DEPLOYMENT_GUIDE.md) | Comprehensive deployment instructions | Detailed setup |
| [**Environment Variables**](./deploy/ENVIRONMENT_VARIABLES.md) | Complete env var reference | Configuration |
| [**Infrastructure**](./deploy/INFRASTRUCTURE.md) | Scaling & advanced infrastructure | Production scaling |

**Quick Start**: [Deploy in 30 minutes](./deploy/QUICK_DEPLOY.md) | [Full Guide](./deploy/DEPLOYMENT_GUIDE.md)

---

## 🎨 Design Documentation

📁 **Location**: [`docs/design/`](./design/)

Design system, color palette, and UI/UX guidelines.

| Document | Description |
|----------|-------------|
| [**Color System**](./design/COLOR_SYSTEM.md) | Complete color palette & usage guidelines |
| [**Design Guidelines**](./design/DESIGN_GUIDELINES.md) | UI/UX design principles & components |

**For**: Designers, frontend developers

---

## ✨ Feature Documentation

📁 **Location**: [`docs/features/`](./features/)

Implementation details for major features.

| Document | Description | Status |
|----------|-------------|--------|
| [**Multi-Column Editor**](./features/MULTI_COLUMN_IMPLEMENTATION.md) | Multi-column layout implementation | ✅ Implemented |
| [**Study System**](./features/STUDY_SYSTEM_IMPLEMENTATION.md) | AI-powered study cards & quizzes | ✅ Implemented |
| [**TTS Study Center**](./features/TTS_STUDY_CENTER.md) | Text-to-speech integration | ✅ Implemented |

**For**: Developers implementing or extending features

---

## 📋 Planning Documentation

📁 **Location**: [`docs/planning/`](./planning/)

Product roadmaps, feature planning, and enhancement proposals.

| Document | Description | Status |
|----------|-------------|--------|
| [**Subscription System**](./planning/SUBSCRIPTION_SYSTEM_PLAN.md) | Payment & subscription architecture | 📝 Planned |
| [**Auth & Onboarding**](./planning/AUTH_ONBOARDING_ENHANCEMENT.md) | Authentication flow improvements | 📝 Planned |
| [**Landing Pages**](./planning/LANDING_PAGES_ENHANCEMENT.md) | Marketing page enhancements | 📝 Planned |

**For**: Product managers, stakeholders, developers planning new features

---

## 🔧 Technical Documentation

📁 **Location**: [`docs/technical/`](./technical/)

API documentation, refactors, and technical implementation details.

| Document | Description | Status |
|----------|-------------|--------|
| [**API Refactor Plan**](./technical/API_REFACTOR_PLAN.md) | Backend API restructuring | ✅ Complete |
| [**API Refactor Complete**](./technical/API_REFACTOR_COMPLETE.md) | Refactor summary & results | ✅ Complete |
| [**User Management API**](./technical/USER_MANAGEMENT_API.md) | User management endpoints | 📖 Reference |

**For**: Backend developers, API consumers

---

## 🗂️ Quick Navigation

### By Role

#### 👨‍💻 **Developers (New to Project)**
1. Start: [Quick Deploy](./deploy/QUICK_DEPLOY.md)
2. Read: [Design Guidelines](./design/DESIGN_GUIDELINES.md)
3. Review: [Feature Docs](./features/)

#### 🎨 **UI/UX Designers**
1. [Color System](./design/COLOR_SYSTEM.md)
2. [Design Guidelines](./design/DESIGN_GUIDELINES.md)

#### 🚀 **DevOps/Infrastructure**
1. [Deployment Guide](./deploy/DEPLOYMENT_GUIDE.md)
2. [Infrastructure Scaling](./deploy/INFRASTRUCTURE.md)
3. [Environment Variables](./deploy/ENVIRONMENT_VARIABLES.md)

#### 📊 **Product Managers**
1. [Planning Docs](./planning/)
2. [Feature Implementations](./features/)

#### 🔌 **API Developers**
1. [User Management API](./technical/USER_MANAGEMENT_API.md)
2. [API Refactor Docs](./technical/)

---

## 📖 Documentation Standards

### Writing Guidelines

- **Markdown**: All docs use GitHub-flavored Markdown
- **Code blocks**: Include language identifiers
- **Links**: Use relative paths within docs
- **Images**: Store in `docs/assets/` (if needed)
- **Updates**: Include "Last Updated" date

### File Naming

- `SCREAMING_SNAKE_CASE.md` for technical docs
- Descriptive names (e.g., `DEPLOYMENT_GUIDE.md`)
- Avoid abbreviations unless widely known

---

## 🔄 Contributing to Documentation

### Adding New Documentation

1. Choose appropriate directory (`deploy/`, `design/`, `features/`, `planning/`, `technical/`)
2. Create file following naming conventions
3. Update this index (README.md)
4. Update any cross-references in related docs

### Updating Documentation

- Keep docs in sync with code changes
- Update "Last Updated" dates
- Fix broken links
- Improve clarity based on user feedback

---

## 🆘 Need Help?

- **Can't find what you need?** Check the directory structure above
- **Documentation outdated?** Please create an issue
- **Want to contribute?** See contributing guidelines

---

## 📎 External Resources

- [React Documentation](https://react.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Lexical Editor](https://lexical.dev/)

---

**Last Updated:** December 30, 2024

---

## Quick Links Summary

| I want to... | Go to |
|--------------|-------|
| Deploy the app | [Quick Deploy](./deploy/QUICK_DEPLOY.md) |
| Understand colors/design | [Design System](./design/COLOR_SYSTEM.md) |
| Learn about a feature | [Features](./features/) |
| See future plans | [Planning](./planning/) |
| Access API docs | [Technical](./technical/) |
| Scale infrastructure | [Infrastructure](./deploy/INFRASTRUCTURE.md) |
| Configure environment | [Env Variables](./deploy/ENVIRONMENT_VARIABLES.md) |
