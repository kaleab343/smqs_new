# Deploy Backend-Only Branch to Render

## ✅ The Solution

Your backend code is on the **`backend-only`** branch of your repository.

**Repository**: https://github.com/kaleab343/smqs_new  
**Branch**: `backend-only` ← THIS IS KEY!

---

## 🚨 CRITICAL STEPS

### Step 1: Delete Current Service

1. Go to Render Dashboard
2. Find your service (the one that keeps failing)
3. Click **Settings** (bottom of left sidebar)
4. Scroll down and click **"Delete Web Service"**
5. Confirm deletion

### Step 2: Create New Web Service

1. Click **"New +"** (top right)
2. Click **"Web Service"**
3. Select your repository: **kaleab343/smqs_new**

### Step 3: CRITICAL - Select Correct Branch!

**On the configuration page, look for:**

```
┌─────────────────────────────────────────┐
│ Branch: [main ▼]                        │  ← CLICK THIS DROPDOWN!
│                                         │
│ Options:                                │
│   • main                                │
│   • backend-only  ← SELECT THIS ONE!    │
└─────────────────────────────────────────┘
```

**⚠️ YOU MUST SELECT `backend-only` BRANCH!**

### Step 4: Configure Service

**After selecting `backend-only` branch:**

- **Name**: `smqs-api`
- **Region**: Choose any
- **Root Directory**: Leave **EMPTY**
- **Environment**: Should show **Docker** (automatic - no package.json on this branch!)
- **Dockerfile Path**: `Dockerfile`
- **Instance Type**: Free

### Step 5: Add Environment Variables

Click **"Add from .env"** and paste:

```env
APP_ENV=production
DB_HOST=your-database-host
DB_NAME=smart_queue_management
DB_USER=your-database-user
DB_PASS=your-database-password
DB_CHARSET=utf8mb4
DB_PORT=3306
JWT_SECRET=your-random-secret-key-minimum-32-characters
```

**Replace the placeholder values with your actual database credentials!**

### Step 6: Create Service

1. Click **"Create Web Service"**
2. Watch the build logs

---

## ✅ Success Indicators

You'll know it's working when you see:

```
==> Checking out commit xxxxx in branch backend-only  ← Shows backend-only!
==> Building image from Dockerfile
==> Step 1/15 : FROM php:8.2-apache
```

**NOT this:**
```
==> Checking out commit xxxxx in branch main  ← Wrong branch!
==> Using Node.js version 22.22.0
```

---

## 🔍 Verify Branch Before Creating

Before clicking "Create Web Service", **double-check**:

- [ ] Branch is set to **`backend-only`** (not `main`)
- [ ] Environment shows **Docker** (not Node)
- [ ] Dockerfile Path is **`Dockerfile`**

---

## 📸 Visual Reference

**What you should see:**

```
Repository: kaleab343/smqs_new
Branch: backend-only        ← MUST BE THIS!
Root Directory: (empty)
Environment: Docker         ← Should detect automatically
Dockerfile Path: Dockerfile
```

---

## 🆘 Still Not Working?

### Option 1: Check Service Settings After Creation

If you already created the service:

1. Go to your service in Render
2. Click **"Settings"**
3. Look for **"Branch"** setting
4. Is it set to `main`? → **Change it to `backend-only`**
5. Click **"Save Changes"**
6. Go to **"Manual Deploy"** → **"Deploy latest commit"**

### Option 2: Create a Separate Repository

If Render keeps using the wrong branch, we can create a completely separate repository:

1. Go to https://github.com/new
2. Create new repository: `smqs-backend`
3. I'll help you push the backend-only code there
4. Deploy from that repository (no branches to confuse)

---

## 📝 Summary

**The problem**: You're deploying from the `main` branch (has package.json)  
**The solution**: Deploy from the `backend-only` branch (only has Dockerfile + API)

**Key action**: Select **`backend-only`** in the Branch dropdown!
