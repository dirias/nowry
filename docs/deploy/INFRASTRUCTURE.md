# Infrastructure as Code (Future Scaling)

This document outlines the infrastructure setup for when you're ready to move beyond free tiers.

## Current Architecture (Free Tier)

```
Frontend (Vercel) → Backend (Railway) → MongoDB Atlas (Free)
```

## Scaling Recommendation

### Option 1: Stick with Managed Services (Easier)

**When you hit 1K users**, upgrade to:

```
Frontend (Vercel Pro $20/mo)
Backend (Railway Pro $20/mo) 
Database (MongoDB M10 $10/mo)
Cache (Upstash Redis - Free tier)
```

**Total: ~$50/month**

### Option 2: Move to AWS/GCP (More Control)

**For 10K+ users**:

```yaml
# Infrastructure Stack
Cloud: AWS
Frontend: S3 + CloudFront CDN
Backend: ECS Fargate (containers)
Database: DocumentDB or MongoDB Atlas M20
Cache: ElastiCache Redis
Load Balancer: Application Load Balancer
```

**Estimated: $150-300/month**

## Docker Configuration

For future container deployment:

### Backend Dockerfile

```dockerfile
# /Nowry-API/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY ./app ./app

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile

```dockerfile
# /nowry/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./Nowry-API
    ports:
      - "8000:8000"
    environment:
      MONGO_URI: mongodb://admin:password@mongodb:27017
      GROQ_API_KEY: ${GROQ_API_KEY}
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - mongodb

  frontend:
    build: ./nowry
    ports:
      - "3000:80"
    environment:
      REACT_APP_API_URL: http://localhost:8000
    depends_on:
      - backend

volumes:
  mongo_data:
```

## Kubernetes (Advanced Scaling)

For 50K+ users, consider Kubernetes:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nowry-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nowry-backend
  template:
    metadata:
      labels:
        app: nowry-backend
    spec:
      containers:
      - name: backend
        image: nowry/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: nowry-secrets
              key: mongo-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        run: |
          curl -X POST ${{ secrets.RAILWAY_WEBHOOK_URL }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
```

## Monitoring Stack (Production)

When you outgrow free tiers:

### 1. Application Performance

- **Sentry** (Error tracking): Free up to 5K errors/month
- **Datadog** or **New Relic**: APM monitoring

### 2. Infrastructure Monitoring

- **Prometheus + Grafana** (self-hosted)
- **CloudWatch** (if on AWS)

### 3. Log Aggregation

- **Grafana Loki** (free, self-hosted)
- **AWS CloudWatch Logs**
- **Logtail** (free tier: 1GB/month)

## Cost Optimization Tips

### Database
```python
# Implement connection pooling
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(
    MONGO_URI,
    maxPoolSize=10,  # Limit connections
    minPoolSize=2
)
```

### Caching
```python
# Add Redis cache for frequent queries
from redis import Redis
import json

cache = Redis.from_url(REDIS_URL)

async def get_user_books(user_id):
    cached = cache.get(f"books:{user_id}")
    if cached:
        return json.loads(cached)
    
    # Fetch from DB
    books = await db.books.find({"user_id": user_id}).to_list(100)
    
    # Cache for 5 minutes
    cache.setex(f"books:{user_id}", 300, json.dumps(books))
    return books
```

### API Rate Limiting
```python
# Prevent abuse
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/books")
@limiter.limit("100/minute")
async def get_books():
    # Your endpoint
    pass
```

## Migration Path

### Phase 1: Free Tier (Current)
- Cost: $0/month
- Users: 0-100
- No changes needed

### Phase 2: Hybrid
- Cost: ~$15/month
- Users: 100-1K
- Actions:
  1. Upgrade MongoDB to M10
  2. Keep Railway/Vercel free tier

### Phase 3: All Paid
- Cost: ~$50/month
- Users: 1K-10K
- Actions:
  1. Railway Pro
  2. Vercel Pro (optional)
  3. Add Redis cache

### Phase 4: AWS Migration
- Cost: ~$150-300/month
- Users: 10K+
- Actions:
  1. Migrate to ECS/EKS
  2. Setup Auto-scaling
  3. CDN for static assets
  4. Multi-region deployment (optional)

## Decision Matrix

| Metric | Keep Current | Upgrade Tier | Migrate to AWS |
|--------|--------------|--------------|----------------|
| Users | < 1K | 1K - 10K | 10K+ |
| Monthly Cost | $0 | $50 | $200+ |
| Complexity | Low | Low | High |
| Control | Limited | Limited | Full |
| DevOps Time | 0 hrs/week | 1 hr/week | 5+ hrs/week |

## Next Steps

1. **Now**: Deploy on free tier
2. **At 100 users**: Monitor MongoDB storage
3. **At 500 users**: Upgrade DB to M10
4. **At 1K users**: Add caching layer
5. **At 5K users**: Consider dedicated infrastructure
6. **At 10K users**: Migrate to AWS/GCP or enterprise plans

For immediate deployment, return to [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
