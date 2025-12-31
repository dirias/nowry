# Quick Start Deployment

This is a condensed version of the [full deployment guide](./DEPLOYMENT_GUIDE.md) for experienced developers.

## 30-Minute Deployment

### 1. Database (5 min)

```bash
# MongoDB Atlas
1. Create free M0 cluster at mongodb.com/cloud/atlas
2. Get connection string
3. Save as MONGO_URI
```

### 2. Backend (10 min)

```bash
# Railway (recommended) or Render
1. Connect GitHub repo (Nowry-API)
2. Add env vars:
   MONGO_URI=mongodb+srv://...
   GROQ_API_KEY=gsk_...
   SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
   ALLOWED_ORIGINS=*
3. Deploy
4. Copy backend URL
```

### 3. Frontend (10 min)

```bash
# Vercel
1. Connect GitHub repo (nowry)
2. Add env var:
   REACT_APP_API_URL=<your-backend-url>
3. Deploy
4. Copy frontend URL
```

### 4. Update CORS (5 min)

```bash
# Go back to Railway/Render
# Update ALLOWED_ORIGINS to your frontend URL
ALLOWED_ORIGINS=https://your-app.vercel.app
# Redeploy
```

## Environment Variables Checklist

### Backend
- [ ] `MONGO_URI` - MongoDB connection string
- [ ] `GROQ_API_KEY` - Groq API key
- [ ] `SECRET_KEY` - Random 32-char string
- [ ] `ALLOWED_ORIGINS` - Frontend URL
- [ ] `ALGORITHM=HS256`
- [ ] `ACCESS_TOKEN_EXPIRE_MINUTES=30`

### Frontend
- [ ] `REACT_APP_API_URL` - Backend URL

## Free Tier Limits

- **MongoDB**: 512MB storage (~1000 books with content)
- **Railway**: $5/month credit (~750 hours)
- **Vercel**: Unlimited deployments, 100GB bandwidth
- **Total Cost**: **$0/month**

## Quick Commands

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Test backend health
curl https://your-backend.railway.app/health

# Test frontend
curl https://your-app.vercel.app

# View logs
# Railway: Dashboard → Logs tab
# Vercel: Dashboard → Logs tab
```

## Next Steps

1. Test user registration
2. Upload a test book/PDF
3. Try AI features
4. Setup monitoring (UptimeRobot)
5. Add custom domain (optional)

## Common Issues

**CORS Error**: Update `ALLOWED_ORIGINS` in backend
**500 Error**: Check backend logs for database connection
**Build Failed**: Check `package.json` and build logs

For detailed troubleshooting, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#troubleshooting)
