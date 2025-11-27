# Vercel Deployment - Quick Start

## TL;DR - Fast Deployment Steps

### 1. Set Up PostgreSQL Database (5 minutes)

Choose one:

**Option A: Neon (Recommended for POC)**
```
1. Go to https://neon.tech
2. Sign up with GitHub
3. Create new project → Copy connection string
```

**Option B: Vercel Postgres**
```
1. Vercel Dashboard → Storage → Create Database → Postgres
2. Copy connection string
```

### 2. Prepare Database Locally (2 minutes)

```bash
cd backend

# Delete old SQLite migrations
rm -rf prisma/migrations

# Create PostgreSQL migration
npx prisma migrate dev --name init
```

### 3. Deploy to Vercel (3 minutes)

**Via Vercel Dashboard:**

1. https://vercel.com/dashboard → Add New → Project
2. Import your GitHub repo: `platforma-licitatii`
3. Configure:
   - Root Directory: `.` (leave as root)
   - Framework: Other
   - Build Command:
     ```
     cd backend && npm install && npm run vercel-build && cd ../frontend && npm install && npm run build
     ```
   - Output Directory: `frontend/dist`

4. Add Environment Variables:
   ```
   DATABASE_URL=your-postgresql-connection-string
   JWT_SECRET=generate-strong-32-char-secret
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   FRONTEND_URL=https://your-app.vercel.app
   ```

5. Click Deploy

### 4. Seed the Database (2 minutes)

```bash
cd backend

# Temporarily edit .env to use production DATABASE_URL
# DATABASE_URL="your-production-connection-string"

npm run prisma:seed

# Revert .env back to local settings
```

### 5. Update CORS (1 minute)

1. Copy your Vercel URL from deployment
2. Vercel Dashboard → Settings → Environment Variables
3. Update `FRONTEND_URL` to your actual URL
4. Deployments → Redeploy

### 6. Test

Visit your Vercel URL and login:
- Username: `admin`
- Password: `admin123`

---

## Environment Variables Checklist

Copy-paste these into Vercel Environment Variables section:

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-32-char-secret-here
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://your-app-name.vercel.app
```

Generate JWT_SECRET:
```bash
openssl rand -base64 32
```

---

## Common Issues

**Build fails**: Make sure both `backend/package.json` and `frontend/package.json` have all dependencies listed.

**Database connection fails**: Check `DATABASE_URL` format and ensure `?sslmode=require` is added.

**CORS errors**: Update `FRONTEND_URL` to match your Vercel domain.

---

## Files Already Configured

- ✅ `/vercel.json`
- ✅ `/backend/vercel.json`
- ✅ `/backend/package.json` (vercel-build script)
- ✅ `/backend/prisma/schema.prisma` (PostgreSQL provider)

---

**Total Time: ~15 minutes**

For detailed instructions, see `VERCEL_DEPLOYMENT.md`
