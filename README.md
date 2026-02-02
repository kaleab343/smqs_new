# SMQS Backend API - Render Deployment

This is a **backend-only** version of the SMQS project for deploying to Render.com.

## Structure

```
backend-only/
├── Dockerfile          # Docker configuration
├── api/                # Copy your db_samp/api/ folder here
│   ├── config.php
│   ├── index.php
│   ├── .htaccess
│   ├── controllers/
│   ├── core/
│   └── models/
└── README.md
```

## Deployment Steps

### 1. Copy API Files

Copy all files from `db_samp/api/` to `backend-only/api/`:

```powershell
# From your project root
xcopy /E /I db_samp\api backend-only\api
```

### 2. Create New GitHub Repository

```powershell
cd backend-only
git init
git add .
git commit -m "Initial commit - SMQS Backend API"
git branch -M main
git remote add origin https://github.com/kaleab343/smqs-backend.git
git push -u origin main
```

### 3. Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +" → "Web Service"**
3. Connect repository: `kaleab343/smqs-backend`
4. Render will **automatically detect Docker** (no package.json to confuse it!)
5. Add environment variables:
   ```
   APP_ENV=production
   DB_HOST=your-database-host
   DB_NAME=smart_queue_management
   DB_USER=your-database-user
   DB_PASS=your-database-password
   DB_CHARSET=utf8mb4
   DB_PORT=3306
   JWT_SECRET=your-random-secret-key
   ```
6. Click **"Create Web Service"**
7. ✅ **Success!**

## Why This Works

No `package.json` = No Node.js detection = Docker is used automatically!

## Environment Variables

See `.env.example` for required variables.
