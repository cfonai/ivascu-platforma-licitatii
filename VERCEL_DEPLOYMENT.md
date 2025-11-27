# Deploying to Vercel - Complete Guide

This guide will help you deploy your procurement platform (full-stack app) to Vercel.

## Prerequisites

- ✅ Vercel account connected to GitHub
- ✅ Project pushed to GitHub
- ✅ GitHub connected to Vercel

## Important Notes

**Database Migration Required**: Your project currently uses SQLite, but Vercel doesn't support SQLite (read-only filesystem). You **must** switch to PostgreSQL for production.

## Step-by-Step Deployment

### Step 1: Set Up PostgreSQL Database

You have two main options for PostgreSQL hosting:

#### Option A: Vercel Postgres (Recommended - Easiest)

1. Go to your Vercel dashboard
2. Click "Storage" → "Create Database"
3. Select "Postgres"
4. Choose a name for your database
5. Click "Create"
6. Copy the connection string (starts with `postgresql://...`)

#### Option B: External PostgreSQL (More Control)

Free options:
- **Supabase**: https://supabase.com (Free tier: 500MB database)
- **Neon**: https://neon.tech (Free tier: 3GB storage)
- **Railway**: https://railway.app (Free tier available)
- **ElephantSQL**: https://www.elephantsql.com (Free tier: 20MB)

For this guide, I'll use **Neon** (recommended for POC):

1. Go to https://neon.tech
2. Sign up with GitHub
3. Create a new project
4. Copy the connection string (looks like: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)

### Step 2: Prepare Your Code for Deployment

**All configuration files have already been created:**

- ✅ `/vercel.json` - Root monorepo configuration
- ✅ `/backend/vercel.json` - Backend-specific config
- ✅ `/backend/package.json` - Updated with `vercel-build` script
- ✅ `/backend/prisma/schema.prisma` - Updated to use PostgreSQL

### Step 3: Create Initial Migration for PostgreSQL

Since we switched from SQLite to PostgreSQL, we need to create a new migration:

```bash
cd backend

# Delete old SQLite migrations (optional but recommended)
rm -rf prisma/migrations

# Create new PostgreSQL migration
npx prisma migrate dev --name init

# This will create the database schema
```

### Step 4: Deploy to Vercel

#### Option 1: Deploy via Vercel Dashboard (Easier)

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select your GitHub repository: `platforma-licitatii`
4. Vercel will auto-detect it's a monorepo
5. Configure the project:

   **Framework Preset**: Other

   **Root Directory**: Leave as `.` (root)

   **Build Command**:
   ```
   cd backend && npm install && npm run vercel-build && cd ../frontend && npm install && npm run build
   ```

   **Output Directory**: `frontend/dist`

   **Install Command**: `npm install` (will run in both directories)

6. Click "Environment Variables" and add the following:

   **Backend Environment Variables:**
   ```
   DATABASE_URL=postgresql://your-connection-string-here
   JWT_SECRET=your-strong-secret-key-min-32-chars
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-url.vercel.app
   ```

   **Important**:
   - Replace `DATABASE_URL` with your PostgreSQL connection string
   - Generate a strong `JWT_SECRET` (use: `openssl rand -base64 32`)
   - You'll update `FRONTEND_URL` after first deployment

7. Click "Deploy"

#### Option 2: Deploy via Vercel CLI (For Developers)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# From project root, deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - What's your project's name? platforma-licitatii
# - In which directory is your code located? ./
```

Then add environment variables:

```bash
# Add environment variables
vercel env add DATABASE_URL
# Paste your PostgreSQL connection string

vercel env add JWT_SECRET
# Paste your JWT secret

vercel env add JWT_EXPIRES_IN
# Enter: 7d

vercel env add NODE_ENV
# Enter: production

vercel env add FRONTEND_URL
# Enter: https://your-project.vercel.app
```

Finally, deploy to production:

```bash
vercel --prod
```

### Step 5: Run Database Migrations on Vercel

After the first deployment, you need to run migrations to create the database schema:

#### Option A: Via Vercel Dashboard

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Functions"
3. Under "Environment Variables", ensure `DATABASE_URL` is set
4. The `vercel-build` script automatically runs `prisma migrate deploy`

#### Option B: Via Vercel CLI

```bash
# Deploy and run migrations
vercel --prod
```

The migrations should run automatically during the build process.

### Step 6: Seed the Database (Create Admin User)

You need to seed the database with the initial admin user. You have two options:

#### Option A: Run Seed Script Locally with Production Database

```bash
cd backend

# Temporarily update .env with production DATABASE_URL
# Add: DATABASE_URL="postgresql://your-production-connection-string"

# Run seed
npm run prisma:seed

# Don't forget to revert .env back to local settings!
```

#### Option B: Create Admin User via API

Once deployed, you can create the admin user by making a direct database insert or by creating a temporary endpoint.

For now, use **Option A** (run seed locally with production database URL).

### Step 7: Update CORS Settings

After deployment, update the `FRONTEND_URL` environment variable:

1. Copy your Vercel URL (e.g., `https://platforma-licitatii.vercel.app`)
2. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
3. Edit `FRONTEND_URL` to your actual Vercel URL
4. Redeploy (Vercel → Deployments → Click "..." → Redeploy)

### Step 8: Test Your Deployment

1. Visit your Vercel URL
2. Try logging in with the admin credentials:
   - Username: `admin`
   - Password: `admin123`
3. Test creating clients, suppliers, RFQs, offers, etc.

---

## Troubleshooting

### Build Fails with "Prisma Client not generated"

**Solution**: Make sure `vercel-build` script includes `prisma generate`:

```json
"vercel-build": "prisma generate && prisma migrate deploy"
```

### Database Connection Fails

**Solution**:
- Verify `DATABASE_URL` is correct in environment variables
- Make sure the PostgreSQL database is accessible from the internet
- Check if SSL is required (add `?sslmode=require` to connection string)

### CORS Errors

**Solution**:
- Make sure `FRONTEND_URL` environment variable matches your Vercel URL
- Check backend CORS configuration in `src/index.ts`

### Prisma Migration Errors

**Solution**:
- Delete old migrations: `rm -rf prisma/migrations`
- Create fresh migration: `npx prisma migrate dev --name init`
- Push to GitHub and redeploy

---

## Alternative Deployment Strategy: Separate Deployments

If you encounter issues with the monorepo setup, you can deploy frontend and backend separately:

### Deploy Frontend Only

1. Create new Vercel project
2. Select `frontend` as root directory
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`

### Deploy Backend Only

1. Create another Vercel project
2. Select `backend` as root directory
3. Framework: Other
4. Build command: `npm run vercel-build`
5. Add all environment variables
6. Update frontend API baseURL to point to backend URL

---

## Cost Estimate

**Free Tier (Hobby Plan):**
- ✅ Frontend hosting: Free
- ✅ Backend serverless functions: 100GB-hrs/month free
- ✅ Database (Vercel Postgres): 256MB free, $0.40/GB after
- ✅ Database (Neon): 3GB free forever

Your POC should run completely free on the free tiers!

---

## Environment Variables Summary

Here are all the environment variables you need to set in Vercel:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Strong random string (32+ chars) | `a1b2c3d4e5f6...` |
| `JWT_EXPIRES_IN` | Token expiry time | `7d` |
| `NODE_ENV` | Environment | `production` |
| `FRONTEND_URL` | Your Vercel frontend URL | `https://yourapp.vercel.app` |

---

## Next Steps After Deployment

1. ✅ Test all features: Login, RFQs, Offers, Negotiations, Orders
2. ✅ Create test users (clients and suppliers)
3. ✅ Test the Supplier Map feature
4. ✅ Monitor Vercel logs for any errors
5. ✅ Set up custom domain (optional)

---

## Need Help?

- Vercel Documentation: https://vercel.com/docs
- Prisma with Vercel: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
- Neon Documentation: https://neon.tech/docs

---

## Files Modified for Deployment

1. ✅ `/vercel.json` - Created
2. ✅ `/backend/vercel.json` - Created
3. ✅ `/backend/package.json` - Added `vercel-build` script
4. ✅ `/backend/prisma/schema.prisma` - Changed provider to `postgresql`
5. ✅ `/backend/.env.example` - Updated with PostgreSQL example

---

**Good luck with your deployment! 🚀**
