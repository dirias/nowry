# 💎 Nowry Subscription & User Management System - JIRA Ticket Plan

## 📋 Epic Overview

### **Epic 1: User Profile & Account Management**
**Epic Key:** NOW-100  
**Priority:** High  
**Story Points:** 34

---

### **Epic 2: Subscription Tiers & Payment Integration**
**Epic Key:** NOW-200  
**Priority:** Critical  
**Story Points:** 55

---

### **Epic 3: User Preferences & Personalization**
**Epic Key:** NOW-300  
**Priority:** Medium  
**Story Points:** 21

---

## 🎯 Detailed User Stories

---

## **EPIC 1: User Profile & Account Management (NOW-100)**

### **Story NOW-101: User Profile Page**
**Priority:** High | **Story Points:** 8

**Description:**  
Create a comprehensive user profile page where users can view and edit their account information.

**Acceptance Criteria:**
- [ ] Display user's full name, email, username, and avatar
- [ ] Allow users to upload/change profile picture
- [ ] Edit bio and personal information
- [ ] Display account creation date and statistics
- [ ] Show current subscription tier with badge
- [ ] Responsive design for mobile and desktop

**Technical Notes:**
- Create `/profile` route
- Use Material UI components for consistency
- Implement image upload with compression
- Max avatar size: 2MB

---

### **Story NOW-102: Account Settings Page**
**Priority:** High | **Story Points:** 5

**Description:**  
Build account settings page for managing security and account preferences.

**Acceptance Criteria:**
- [ ] Change password functionality
- [ ] Email notification preferences
- [ ] Two-factor authentication setup
- [ ] Account deletion with confirmation
- [ ] Session management (view active sessions, logout from devices)

**Technical Notes:**
- Implement password strength validation
- Add email verification for sensitive changes
- Create backup codes for 2FA

---

### **Story NOW-103: User Dashboard Statistics**
**Priority:** Medium | **Story Points:** 5

**Description:**  
Display comprehensive user statistics on profile/dashboard.

**Acceptance Criteria:**
- [ ] Total study time
- [ ] Cards reviewed count
- [ ] Books created/read
- [ ] Quiz completion rate
- [ ] Visual diagrams created
- [ ] Current streak and longest streak
- [ ] Activity heatmap (like GitHub)

---

## **EPIC 2: Subscription Tiers & Payment Integration (NOW-200)**

### **Story NOW-201: Define Subscription Tiers**
**Priority:** Critical | **Story Points:** 3

**Description:**  
Define and document subscription tier structure with feature limitations.

**Proposed Tiers:**

#### **FREE Tier** (Default)
- ✅ 3 books (max 50 pages each)
- ✅ 50 flashcards
- ✅ 10 quiz questions
- ✅ 5 visual diagrams
- ✅ Basic study tracking
- ❌ No AI content generation
- ❌ No export functionality
- ❌ Basic news feed (limited items)

#### **STUDENT Tier** ($4.99/month)
- ✅ 15 books (max 200 pages each)
- ✅ 500 flashcards
- ✅ 100 quiz questions
- ✅ 50 visual diagrams
- ✅ AI-powered quiz generation (50/month)
- ✅ PDF export
- ✅ Full news feed access
- ✅ Custom themes (3 color presets)
- ✅ Priority support

#### **PRO Tier** ($9.99/month)
- ✅ Unlimited books (max 500 pages each)
- ✅ Unlimited flashcards
- ✅ Unlimited quiz questions
- ✅ Unlimited visual diagrams
- ✅ Unlimited AI content generation
- ✅ Advanced export (PDF, Markdown, Anki)
- ✅ API access (basic)
- ✅ Full customization (colors, fonts, layout)
- ✅ Collaboration features (share decks)
- ✅ Priority support + live chat

#### **ENTERPRISE Tier** (Custom pricing)
- ✅ Everything in PRO
- ✅ Team management (unlimited members)
- ✅ Admin dashboard
- ✅ SSO integration
- ✅ Custom branding
- ✅ Dedicated account manager
- ✅ SLA guarantee
- ✅ Advanced analytics
- ✅ Full API access

**Acceptance Criteria:**
- [ ] Document all feature limits in database schema
- [ ] Create feature flags system
- [ ] Define upgrade/downgrade policies

---

### **Story NOW-202: Backend Feature Limitation System**
**Priority:** Critical | **Story Points:** 13

**Description:**  
Implement backend service to enforce subscription tier limitations.

**Acceptance Criteria:**
- [ ] Create `Subscription` model with tier, limits, and status
- [ ] Implement middleware to check user permissions before actions
- [ ] Create rate limiting for AI features
- [ ] Add usage tracking (books created, cards added, etc.)
- [ ] Return clear error messages when limits are reached
- [ ] Implement grace period for expired subscriptions (7 days read-only)

**Technical Implementation:**

```python
# models/Subscription.py
class Subscription:
    user_id: ObjectId
    tier: str  # free, student, pro, enterprise
    status: str  # active, expired, cancelled
    starts_at: datetime
    ends_at: datetime
    limits: dict  # feature-specific limits
    usage: dict  # current usage counters

# Middleware example
@require_subscription(tier="student", feature="ai_quiz_generation")
async def generate_quiz():
    # Check if user has quota
    if user.usage.ai_generations >= user.limits.ai_generations:
        raise QuotaExceeded("AI generation limit reached")
```

---

### **Story NOW-203: Frontend Feature Gating**
**Priority:** Critical | **Story Points:** 8

**Description:**  
Implement UI components to show/hide features based on subscription tier.

**Acceptance Criteria:**
- [ ] Show upgrade prompts when users hit limits
- [ ] Display "Pro" badges on locked features
- [ ] Show usage progress bars (e.g., "3/50 flashcards used")
- [ ] Gracefully disable locked features
- [ ] Add upgrade CTAs throughout the app
- [ ] Show feature comparison modal

**UI Components:**
- `<UpgradePrompt />` - Modal to encourage upgrades
- `<FeatureLock />` - Lock icon with upgrade button
- `<UsageIndicator />` - Progress bar for limits
- `<PlanBadge />` - Display current tier

---

### **Story NOW-204: Payment System Integration**
**Priority:** Critical | **Story Points:** 21

**Description:**  
Integrate payment processing system for subscriptions.

**Payment Provider Comparison:**

#### **Stripe** ⭐ RECOMMENDED
**Pros:**
- Industry leader, trusted brand
- Built-in subscription management
- Excellent documentation
- Supports 135+ currencies
- Strong fraud prevention
- Hosted checkout pages (easier implementation)
- Webhooks for automation

**Cons:**
- 2.9% + $0.30 per transaction (US)
- Higher fees than some alternatives

**Cost per $9.99 subscription:** ~$0.59

---

#### **Paddle**
**Pros:**
- Acts as merchant of record (handles taxes, compliance)
- Simpler international billing
- Fixed 5% + $0.50 per transaction
- No need to manage VAT/sales tax

**Cons:**
- Higher fees
- Less customization

**Cost per $9.99 subscription:** ~$1.00

---

#### **PayPal**
**Pros:**
- Well-known brand
- Easy integration
- Lower international fees

**Cons:**
- Less developer-friendly
- Higher chargeback rates
- 2.9% + $0.30 per transaction

**Cost per $9.99 subscription:** ~$0.59

---

**RECOMMENDATION: Stripe**
- Best balance of features, cost, and developer experience
- Excellent for recurring subscriptions
- Easy to add additional payment methods later

**Acceptance Criteria:**
- [ ] Set up Stripe account and API keys
- [ ] Create subscription products in Stripe dashboard
- [ ] Implement Stripe Checkout integration
- [ ] Add webhook endpoint for subscription events
- [ ] Handle subscription lifecycle (created, updated, cancelled, expired)
- [ ] Implement proration for upgrades/downgrades
- [ ] Add customer portal for managing subscriptions
- [ ] Store subscription data in database
- [ ] Send email confirmations for payments

**Webhook Events to Handle:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

### **Story NOW-205: Subscription Management UI**
**Priority:** High | **Story Points:** 8

**Description:**  
Create subscription management interface for users.

**Acceptance Criteria:**
- [ ] Pricing page with tier comparison
- [ ] Checkout flow with Stripe integration
- [ ] Subscription status in settings
- [ ] Upgrade/downgrade functionality
- [ ] Cancel subscription option
- [ ] View billing history
- [ ] Download invoices
- [ ] Update payment method

**Pages to Create:**
- `/pricing` - Public pricing page
- `/settings/subscription` - Manage subscription
- `/settings/billing` - Billing history

---

### **Story NOW-206: Trial Period System**
**Priority:** Medium | **Story Points:** 5

**Description:**  
Implement 14-day free trial for PRO tier.

**Acceptance Criteria:**
- [ ] Offer 14-day trial on signup (no credit card required)
- [ ] Show trial status in UI with countdown
- [ ] Send email reminders (7 days left, 1 day left)
- [ ] Auto-downgrade to FREE if no payment after trial
- [ ] Track trial usage to prevent abuse
- [ ] One trial per email address

---

## **EPIC 3: User Preferences & Personalization (NOW-300)**

### **Story NOW-301: User Preferences Model**
**Priority:** Medium | **Story Points:** 5

**Description:**  
Create user preferences system for storing customization settings.

**Preferences Structure:**

```javascript
{
  user_id: ObjectId,
  appearance: {
    theme: "light" | "dark" | "auto",
    color_scheme: "default" | "blue" | "purple" | "green",
    font_family: "default" | "serif" | "mono",
    font_size: "small" | "medium" | "large",
    compact_mode: boolean
  },
  notifications: {
    email_digest: "daily" | "weekly" | "never",
    study_reminders: boolean,
    news_updates: boolean,
    marketing_emails: boolean
  },
  news_feed: {
    categories: ["technology", "science", "sports", ...],
    sources: ["espn", "bbc", "cnn", ...],
    language: "en" | "es" | "fr",
    items_per_page: number
  },
  study: {
    default_deck_type: "flashcard" | "quiz" | "visual",
    cards_per_session: number,
    auto_advance: boolean,
    show_hints: boolean
  },
  privacy: {
    profile_visibility: "public" | "private",
    show_activity: boolean,
    analytics_opt_out: boolean
  }
}
```

**Acceptance Criteria:**
- [ ] Create preferences API endpoints (GET, PUT)
- [ ] Set sensible defaults on user creation
- [ ] Validate preference values
- [ ] Return preferences with user authentication

---

### **Story NOW-302: Appearance Customization**
**Priority:** Medium | **Story Points:** 8

**Description:**  
Implement visual customization options for personalized experience.

**Acceptance Criteria:**
- [ ] Theme switcher (light/dark/auto)
- [ ] Color scheme selector (PRO feature)
- [ ] Font family options (PRO feature)
- [ ] Font size adjustment (accessibility)
- [ ] Compact mode toggle
- [ ] Preview changes in real-time
- [ ] Save preferences per device/browser

**Color Schemes (PRO):**
- Default Blue (#0B6BCB)
- Purple (#7C3AED)
- Green (#059669)
- Orange (#EA580C)
- Pink (#DB2777)

---

### **Story NOW-303: News Feed Customization**
**Priority:** Medium | **Story Points:** 5

**Description:**  
Allow users to customize their news feed preferences.

**Acceptance Criteria:**
- [ ] Select news categories (technology, sports, science, etc.)
- [ ] Choose preferred news sources
- [ ] Set language preference
- [ ] Adjust number of items shown
- [ ] Save favorite articles
- [ ] Hide/block specific sources

---

### **Story NOW-304: Notification Preferences**
**Priority:** Low | **Story Points:** 3

**Description:**  
Let users control notification settings.

**Acceptance Criteria:**
- [ ] Email digest frequency (daily/weekly/never)
- [ ] Study reminder notifications
- [ ] News update alerts
- [ ] Marketing email opt-in/out
- [ ] Update preferences without unsubscribing

---

## 🎨 UI/UX Mockup Requirements

### Pricing Page Design
- Clean comparison table
- Highlight recommended tier (STUDENT or PRO)
- Toggle for monthly/yearly pricing (20% discount on yearly)
- Feature tooltips for clarification
- Testimonials section
- FAQ accordion

### Settings Page Structure
```
Settings
├── Profile
├── Account Security
├── Subscription & Billing
├── Appearance
├── Notifications
├── News Preferences
└── Privacy
```

---

## 🔧 Technical Architecture

### Database Collections

#### `users`
```javascript
{
  _id: ObjectId,
  username: string,
  email: string,
  password_hash: string,
  avatar_url: string,
  subscription_id: ObjectId,
  preferences_id: ObjectId,
  created_at: datetime,
  updated_at: datetime
}
```

#### `subscriptions`
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  tier: "free" | "student" | "pro" | "enterprise",
  status: "active" | "trialing" | "past_due" | "cancelled" | "expired",
  stripe_customer_id: string,
  stripe_subscription_id: string,
  starts_at: datetime,
  current_period_end: datetime,
  cancel_at_period_end: boolean,
  limits: {
    books: number,
    pages_per_book: number,
    flashcards: number,
    quizzes: number,
    visual_diagrams: number,
    ai_generations_per_month: number
  },
  usage: {
    books_count: number,
    flashcards_count: number,
    quizzes_count: number,
    visual_diagrams_count: number,
    ai_generations_used: number,
    ai_reset_date: datetime
  }
}
```

### API Endpoints

```
# Subscription Management
POST   /api/subscriptions/create-checkout-session
POST   /api/subscriptions/cancel
POST   /api/subscriptions/update-tier
GET    /api/subscriptions/usage
POST   /api/webhooks/stripe

# User Profile
GET    /api/users/profile
PUT    /api/users/profile
POST   /api/users/avatar

# Preferences
GET    /api/users/preferences
PUT    /api/users/preferences

# Feature Checks (Middleware)
GET    /api/features/check/{feature_name}
```

---

## 📊 Success Metrics

### Key Performance Indicators (KPIs)
- **Conversion Rate:** % of free users upgrading to paid
  - Target: 5-10% within 30 days
- **Churn Rate:** % of subscribers cancelling
  - Target: < 5% monthly
- **Average Revenue Per User (ARPU)**
  - Target: $6-8 (accounting for free tier)
- **Trial-to-Paid Conversion**
  - Target: 40-50%
- **Feature Adoption:** % of users trying PRO features
  - Target: 60% of free users interact with locked feature

---

## 🚀 Implementation Phases

### **Phase 1: Foundation (Weeks 1-2)**
- NOW-101, NOW-102, NOW-201, NOW-301
- Set up basic profile and tier structure

### **Phase 2: Payment Integration (Weeks 3-4)**
- NOW-202, NOW-203, NOW-204, NOW-205
- Implement Stripe and feature gating

### **Phase 3: Personalization (Weeks 5-6)**
- NOW-302, NOW-303, NOW-304
- Build customization features

### **Phase 4: Polish & Launch (Week 7)**
- NOW-103, NOW-206
- Testing, bug fixes, documentation
- Marketing materials
- Launch announcement

---

## 💰 Cost Analysis

### Monthly Operating Costs (1000 users)

**Stripe Fees:**
- 200 paid subscribers @ $7.49 avg
- Revenue: $1,498/month
- Stripe fees (2.9% + $0.30): ~$88/month
- **Net Revenue: $1,410/month**

**Infrastructure:**
- Hosting (AWS/Railway): $50-100/month
- MongoDB Atlas: $57/month (M10 tier)
- Email service (SendGrid): $15/month
- CDN (Cloudflare): $0 (free tier)
- **Total: ~$122-172/month**

**Profit Margin:** ~85-90%

---

## ⚠️ Risk Mitigation

### Payment Failures
- Grace period (7 days)
- Retry failed payments (3 attempts)
- Downgrade to free tier, preserve data

### Data Loss on Downgrade
- Don't delete content, just make read-only
- Show upgrade prompts to access content
- Export option before downgrade

### Feature Abuse
- Rate limiting on AI features
- Track suspicious usage patterns
- Implement cooldown periods

---

## 📝 Documentation Requirements

- User-facing subscription FAQ
- Stripe integration guide
- Feature flag system documentation
- API documentation for limits
- Admin playbook for managing subscriptions

---

## 🎯 Definition of Done

Each story is complete when:
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] UI responsive on mobile/tablet/desktop
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Documentation updated
- [ ] QA testing completed
- [ ] Product owner approval

---

**Total Story Points:** 110  
**Estimated Timeline:** 7 weeks (2 developers)  
**Priority Order:** NOW-200 → NOW-100 → NOW-300
