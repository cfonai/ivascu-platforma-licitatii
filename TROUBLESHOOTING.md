# Troubleshooting Vercel Deployment

## Issue: "Eroare la autentificare" (Authentication Error)

This error typically means one of these issues:

### 1. Database Not Seeded (Most Common)

**Check if you seeded the production database:**

```bash
cd backend

# Add your production DATABASE_URL to .env temporarily
# DATABASE_URL="postgresql://your-production-connection-string"

# Run seed
npm run prisma:seed

# You should see: ✅ Admin user created successfully
```

### 2. Check Backend API is Working

Open your browser and visit:
```
https://your-vercel-app.vercel.app/api/health
```

**Expected response**: Should show something or a 404 if route doesn't exist (that's OK)

**If you get "This page could not be found"**: Your backend isn't deployed correctly.

### 3. Check Browser Console for Errors

1. Open your Vercel site
2. Press F12 (Developer Tools)
3. Go to "Console" tab
4. Try logging in
5. Look for errors (usually red text)

Common errors:
- **`Failed to fetch`** or **`Network Error`**: Backend not accessible
- **`401 Unauthorized`**: Wrong credentials or database not seeded
- **`500 Internal Server Error`**: Backend crash, check Vercel logs

### 4. Check Vercel Logs

1. Go to Vercel Dashboard
2. Click your project
3. Click "Deployments"
4. Click the latest deployment
5. Click "Functions" tab
6. Look for any error messages

### 5. Verify Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string (starts with `postgresql://`)
- `JWT_SECRET` - 32+ character random string
- `JWT_EXPIRES_IN` - `7d`
- `NODE_ENV` - `production`
- `FRONTEND_URL` - Your Vercel URL (e.g., `https://yourapp.vercel.app`)

**Important**: After adding/changing env vars, you MUST redeploy!

### 6. Check Database Connection

Test if your database is accessible:

```bash
cd backend

# Temporarily add production DATABASE_URL to .env
# DATABASE_URL="your-production-connection-string"

# Test connection
npx prisma db push

# Should connect successfully
```

### 7. Check Network Tab

1. Open Developer Tools (F12)
2. Go to "Network" tab
3. Try logging in
4. Look for the `/api/auth/login` request
5. Click on it
6. Check:
   - **Status**: Should be 200 or 401
   - **Response**: What error message do you see?

---

## Step-by-Step Diagnosis

Run these checks in order:

### Step 1: Verify Backend Deployment

Visit: `https://your-app.vercel.app/api/`

**Expected**: Any response (even 404 is OK)
**Problem**: "This page could not be found" = Backend not deployed

**Fix**:
1. Check `vercel.json` routes configuration
2. Redeploy with proper build settings

### Step 2: Check if Database Has Admin User

```bash
# Option A: Using Prisma Studio (Easiest)
cd backend
# Edit .env to use production DATABASE_URL
npx prisma studio
# Check Users table - should have admin user

# Option B: Using psql (if you have it)
psql "your-production-database-url"
SELECT * FROM "User" WHERE username = 'admin';
```

**Expected**: Should see admin user with hashed password
**Problem**: No rows returned = Database not seeded

**Fix**: Run `npm run prisma:seed` with production DATABASE_URL

### Step 3: Test Login API Directly

Use curl or Postman to test the login endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Expected**: Should return user data and set cookie
**Problem**: Error message tells you what's wrong

---

## Common Fixes

### Fix 1: Database Not Seeded

```bash
cd backend

# Edit .env to use PRODUCTION database
# DATABASE_URL="postgresql://your-production-url"

npm run prisma:seed

# Switch back to local database after
```

### Fix 2: Environment Variables Not Set

1. Vercel Dashboard → Settings → Environment Variables
2. Add all required variables
3. **Important**: Redeploy after adding variables!
4. Deployments → ... → Redeploy

### Fix 3: CORS Issues

Make sure `FRONTEND_URL` in Vercel environment variables matches your actual Vercel URL exactly:

```
FRONTEND_URL=https://your-actual-app.vercel.app
```

Then redeploy.

### Fix 4: Build Failed

Check build logs:
1. Vercel Dashboard → Deployments
2. Click latest deployment
3. Check "Building" section for errors

Common build errors:
- Missing dependencies
- TypeScript errors
- Prisma client not generated

**Fix**: Make sure `vercel-build` script includes `prisma generate`

### Fix 5: Backend Route Not Working

Your Vercel deployment might not be routing API calls correctly.

Check `/vercel.json` in root:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

---

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] Production database created and accessible
- [ ] Database migrations ran successfully
- [ ] Database seeded with admin user
- [ ] All environment variables set in Vercel
- [ ] Redeployed after setting environment variables
- [ ] Backend API responding (test with `/api/` endpoint)
- [ ] Browser console shows specific error
- [ ] Vercel function logs checked for errors

---

## Still Not Working?

Share the following information:

1. **Browser console error** (F12 → Console → screenshot)
2. **Network tab error** (F12 → Network → click failed request → screenshot Response)
3. **Vercel function logs** (Vercel Dashboard → Deployments → Functions)
4. **Database connection test result**
5. **Output of seed command**

This will help diagnose the exact issue!
