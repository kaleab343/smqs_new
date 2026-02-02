# Render Deployment Instructions - BACKEND ONLY

## ⚠️ IMPORTANT: Current Issue

If you're seeing this error:
```
==> Running build command 'pnpm install --frozen-lockfile; pnpm run build'...
```

This means Render is trying to build as **Node.js** instead of **Docker**.

---

## ✅ CORRECT DEPLOYMENT METHOD

### Option A: Blueprint Deployment (EASIEST - USE THIS!)

1. **Delete any existing failed service:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Find your service → Settings (bottom) → "Delete Web Service"

2. **Deploy using Blueprint:**
   - Click **"New +"** → **"Blueprint Instance"** (NOT "Web Service")
   - Select your repository: `kaleab343/smqs_new`
   - Render will detect `render.yaml` automatically
   - Click **"Apply"**

3. **Set Required Environment Variables:**
   
   You'll be prompted to fill in these values:
   ```
   DB_HOST = [Your database host - e.g., mysql.railway.app]
   DB_USER = [Your database username]
   DB_PASS = [Your database password]
   ```

4. **Click "Apply"** - Done! ✅

---

### Option B: Manual Web Service (If Blueprint doesn't work)

1. **Delete any existing failed service**

2. **Create New Web Service:**
   - Click **"New +"** → **"Web Service"**
   - Connect repository: `kaleab343/smqs_new`
   - **Branch**: `main`

3. **⚠️ CRITICAL SETTINGS - Configure EXACTLY like this:**

   **Name:** `smqs-api` (or your choice)
   
   **Root Directory:** Leave empty or use `.`
   
   **Environment:** **Docker** ← SELECT THIS FROM DROPDOWN (NOT Node!)
   
   **Dockerfile Path:** `Dockerfile.render`
   
   **Docker Build Context Directory:** Leave empty or use `.`
   
   **Docker Command:** Leave empty
   
   **Instance Type:** Free

4. **Add Environment Variables** (in the Environment section):
   ```
   APP_ENV = production
   DB_HOST = your-database-host
   DB_NAME = smart_queue_management
   DB_USER = your-database-user
   DB_PASS = your-database-password
   DB_CHARSET = utf8mb4
   DB_PORT = 3306
   JWT_SECRET = your-random-secret-key-here
   ```

5. **Click "Create Web Service"**

---

## 🔍 How to Verify Correct Configuration

After creating the service, check the **Build Logs**. You should see:

✅ **CORRECT (Docker):**
```
==> Building image from Dockerfile.render
==> Step 1/10 : FROM php:8.2-apache
```

❌ **WRONG (Node.js):**
```
==> Using Node.js version 22.22.0
==> Running build command 'pnpm install...'
```

If you see the Node.js message, **delete and recreate** with Docker environment.

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] MySQL database set up (PlanetScale, Railway, Aiven, etc.)
- [ ] Database credentials (host, username, password)
- [ ] Database initialized with schema (`db_samp/api/db.sql`)
- [ ] Render account created
- [ ] Repository pushed to GitHub

---

## 🗄️ Setting Up a Free MySQL Database

### Option 1: PlanetScale (Recommended)

1. Go to [PlanetScale](https://planetscale.com/)
2. Sign up (free tier available)
3. Create new database
4. Get connection details
5. Import schema using PlanetScale web console

### Option 2: Railway

1. Go to [Railway](https://railway.app/)
2. Create new project → Add MySQL
3. Get connection string from Variables tab
4. Connect and import schema

### Option 3: Aiven

1. Go to [Aiven](https://aiven.io/)
2. Create free MySQL service
3. Get connection details
4. Import schema

---

## 🧪 Testing After Deployment

Once deployed, test these endpoints:

```bash
# Replace YOUR-APP with your Render service name

# Test health check
curl https://YOUR-APP.onrender.com/ping

# Test authentication
curl -X POST https://YOUR-APP.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

---

## ❓ Troubleshooting

### Issue: Still showing Node.js build

**Solution:** You didn't select "Docker" as environment. Delete service and recreate, making sure to select Docker from the Environment dropdown.

### Issue: Can't find "Blueprint Instance" option

**Solution:** Use Manual Web Service method instead, but MUST select "Docker" as environment.

### Issue: Build succeeds but service won't start

**Solution:** Check environment variables are set correctly, especially database credentials.

### Issue: Database connection failed

**Solution:** 
- Verify DB_HOST, DB_USER, DB_PASS are correct
- Make sure database allows external connections
- Check database is initialized with schema

---

## 📞 Need Help?

If you're still having issues:
1. Share the FULL build log from Render
2. Confirm which deployment method you're using
3. Verify your Render settings show "Docker" not "Node"
