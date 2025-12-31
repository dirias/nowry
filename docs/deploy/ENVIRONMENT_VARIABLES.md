# Environment Variables Reference

Complete guide to all environment variables used in Nowry.

## Frontend Environment Variables

Create `nowry/.env` for local development:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000
# Production: https://your-backend.railway.app

# Application Info
REACT_APP_VERSION=1.0.0-beta
REACT_APP_APP_NAME=Nowry

# Feature Flags (Optional)
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_PAYMENT=false
REACT_APP_ENABLE_AI_FEATURES=true

# External Services (Optional)
REACT_APP_SENTRY_DSN=
REACT_APP_GOOGLE_ANALYTICS_ID=
```

### Production (Vercel)

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_VERSION=1.0.0
```

## Backend Environment Variables

Create `Nowry-API/.env` for local development:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================

# MongoDB Connection String
# Format: mongodb+srv://username:password@cluster.mongodb.net/database
MONGO_URI=mongodb+srv://nowry-admin:YOUR_PASSWORD@nowry-beta.xxxxx.mongodb.net/nowry_db?retryWrites=true&w=majority

# Database Name (Optional - included in URI)
MONGO_DB_NAME=nowry_db

# ============================================
# SECURITY
# ============================================

# Secret key for JWT token generation
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-secret-key-32-chars-minimum-here

# Algorithm for JWT encoding
ALGORITHM=HS256

# Token expiration (minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ============================================
# AI / LANGUAGE MODEL
# ============================================

# Groq API Key
# Get from: https://console.groq.com
GROQ_API_KEY=gsk_your_groq_api_key_here

# LangChain Configuration (Optional)
LANGCHAIN_TRACING_V2=false
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=nowry

# ============================================
# CORS CONFIGURATION
# ============================================

# Allowed origins for CORS (comma-separated)
# Development: http://localhost:3000
# Production: https://your-app.vercel.app
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app

# ============================================
# APPLICATION SETTINGS
# ============================================

# Environment: development, production, staging
ENV=development

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Logging Level
LOG_LEVEL=INFO
# Options: DEBUG, INFO, WARNING, ERROR, CRITICAL

# File Upload Limits
MAX_UPLOAD_SIZE_MB=16
ALLOWED_EXTENSIONS=pdf,docx,txt

# ============================================
# OPTIONAL SERVICES
# ============================================

# Redis Cache (for scaling)
# REDIS_URL=redis://localhost:6379

# Email Service (for notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# EMAIL_FROM=noreply@nowry.app

# Sentry (Error Tracking)
# SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# ============================================
# RATE LIMITING (Optional)
# ============================================

# RATE_LIMIT_PER_MINUTE=100
# RATE_LIMIT_PER_HOUR=1000

# ============================================
# PAYMENT (Future)
# ============================================

# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# STRIPE_PRICE_ID_MONTHLY=price_...
# STRIPE_PRICE_ID_YEARLY=price_...
```

### Production (Railway/Render)

**Required Variables:**

```env
MONGO_URI=mongodb+srv://...
GROQ_API_KEY=gsk_...
SECRET_KEY=<generate-random-32-chars>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=https://your-app.vercel.app
ENV=production
```

**Optional but Recommended:**

```env
LOG_LEVEL=INFO
MAX_UPLOAD_SIZE_MB=16
SENTRY_DSN=<for-error-tracking>
```

## Generating Secrets

### SECRET_KEY (Required)

```bash
# Method 1: Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Method 2: Using OpenSSL
openssl rand -base64 32

# Method 3: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Example Output
```
fJ8kL3mP9qR2sT5vX8yA1bD4eG7hK0nQ
```

## Environment-Specific Configurations

### Local Development

```env
# Frontend (.env)
REACT_APP_API_URL=http://localhost:8000

# Backend (.env)
MONGO_URI=mongodb://localhost:27017/nowry_dev
ALLOWED_ORIGINS=http://localhost:3000
ENV=development
LOG_LEVEL=DEBUG
```

### Staging (Optional)

```env
# Frontend
REACT_APP_API_URL=https://staging-backend.railway.app

# Backend
MONGO_URI=mongodb+srv://...staging-cluster...
ALLOWED_ORIGINS=https://staging.vercel.app
ENV=staging
LOG_LEVEL=INFO
```

### Production

```env
# Frontend
REACT_APP_API_URL=https://api.nowry.app

# Backend
MONGO_URI=mongodb+srv://...production-cluster...
ALLOWED_ORIGINS=https://nowry.app
ENV=production
LOG_LEVEL=WARNING
```

## Accessing Environment Variables

### Frontend (React)

```javascript
// In your React components
const apiUrl = process.env.REACT_APP_API_URL
const version = process.env.REACT_APP_VERSION

// Example usage
fetch(`${process.env.REACT_APP_API_URL}/api/books`)
```

> **Note**: Only variables starting with `REACT_APP_` are exposed to the browser.

### Backend (FastAPI)

```python
# Using python-dotenv
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
SECRET_KEY = os.getenv("SECRET_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# With default values
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
PORT = int(os.getenv("PORT", 8000))
```

### Using Pydantic Settings (Recommended)

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    mongo_uri: str
    mongo_db_name: str = "nowry_db"
    
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # API Keys
    groq_api_key: str
    
    # CORS
    allowed_origins: str = "http://localhost:3000"
    
    # Environment
    env: str = "development"
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Usage
settings = Settings()
```

## Security Best Practices

### ✅ DO

- Use strong, randomly generated secrets (32+ characters)
- Keep secrets in `.env` files (never commit to git)
- Use different secrets for dev/staging/production
- Rotate secrets periodically (every 3-6 months)
- Use environment variables in hosting platforms
- Restrict CORS to specific domains in production

### ❌ DON'T

- Hard-code secrets in source code
- Commit `.env` files to version control
- Share secrets in plain text (Slack, email)
- Use same secrets across environments
- Allow `ALLOWED_ORIGINS=*` in production
- Share your Groq API key publicly

## Validation Script

Create `scripts/validate-env.sh`:

```bash
#!/bin/bash

# Frontend validation
echo "Validating Frontend Environment..."
if [ -z "$REACT_APP_API_URL" ]; then
    echo "❌ REACT_APP_API_URL is not set"
    exit 1
fi
echo "✅ Frontend environment valid"

# Backend validation
echo "Validating Backend Environment..."
required_vars=("MONGO_URI" "SECRET_KEY" "GROQ_API_KEY")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ $var is not set"
        exit 1
    fi
done

echo "✅ Backend environment valid"
echo "✅ All environment variables validated successfully"
```

Usage:
```bash
chmod +x scripts/validate-env.sh
./scripts/validate-env.sh
```

## Platform-Specific Instructions

### Railway

1. Go to your project → **Variables** tab
2. Click **New Variable**
3. Add key-value pairs from the required variables list
4. Click **Save**
5. Railway will automatically redeploy

### Render

1. Go to your service → **Environment** tab
2. Click **Add Environment Variable**
3. Add key-value pairs
4. Click **Save Changes**
5. Manually trigger redeploy if needed

### Vercel

1. Go to your project → **Settings** → **Environment Variables**
2. Select environments: Production, Preview, Development
3. Add variables
4. Redeploy to apply changes

### Heroku

```bash
# Using Heroku CLI
heroku config:set MONGO_URI="mongodb+srv://..." --app your-app-name
heroku config:set SECRET_KEY="..." --app your-app-name
```

## Troubleshooting

### Issue: Variables not loading

**Solutions:**
- Verify `.env` file is in the correct directory (project root)
- Restart your development server
- Check for typos in variable names
- Ensure `python-dotenv` is installed (backend)

### Issue: CORS errors despite setting ALLOWED_ORIGINS

**Solutions:**
- Verify no trailing slashes in URLs
- Check URL protocol (http vs https)
- Use comma-separated list (no spaces)
- Restart backend after changes

### Issue: 401 Unauthorized errors

**Solutions:**
- Verify `SECRET_KEY` matches between environments
- Check token expiration settings
- Ensure `ALGORITHM` is set to `HS256`

## Next Steps

- See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for deployment instructions
- See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for scaling guidance
- See [SECURITY.md](./SECURITY.md) for security best practices
