# Deploy Frontend to Vercel - Complete Guide

## 🎯 Overview

Your backend API is already deployed on Render at:
```
https://smqs-api.onrender.com
```

Now we'll deploy the Next.js frontend to Vercel and connect them together.

---

## ✅ What We've Configured

The following files have been updated to connect frontend with backend:

1. **`.env.production`** - Production environment variables
2. **`vercel.json`** - Vercel configuration
3. **`lib/php-api-config.ts`** - Updated to use Render API in production
4. **`.env.local.example`** - Template for local development

---

## 🚀 Deployment Steps

### Step 1: Push Changes to GitHub

First, let's push all the configuration changes:

```powershell
git add .
git commit -m "Configure frontend for Vercel deployment with Render backend"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Website (Easiest) ⭐

1. **Go to [Vercel](https://vercel.com)**
2. **Sign Up / Log In** with GitHub
3. Click **"Add New..."** → **"Project"**
4. **Import your repository:**
   - Find and select: `kaleab343/smqs_new`
   - Click **"Import"**

5. **Configure Project:**
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: Leave as `.` (project root)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   
6. **Environment Variables** (IMPORTANT!):
   Click **"Environment Variables"** and add:
   
   ```
   Key: NEXT_PUBLIC_API_BASE_URL
   Value: https://smqs-api.onrender.com
   ```
   
   Apply to: **Production, Preview, and Development**

7. Click **"Deploy"**
8. Wait 2-3 minutes for deployment
9. ✅ **Your app is live!**

#### Option B: Deploy via Vercel CLI

```powershell
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

---

## 🌐 Your Deployed URLs

After deployment, you'll have:

- **Frontend (Vercel)**: `https://smqs-new.vercel.app` (or custom domain)
- **Backend (Render)**: `https://smqs-api.onrender.com`

---

## ✅ Testing the Connection

### Test 1: Check Frontend Loads

Visit your Vercel URL:
```
https://your-app.vercel.app
```

You should see the SMQS homepage.

### Test 2: Test Login Functionality

1. Go to: `https://your-app.vercel.app/auth/login`
2. Try logging in
3. Check browser console (F12) for API calls
4. Should call: `https://smqs-api.onrender.com/auth/login`

### Test 3: Check API Calls in Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Navigate through your app
4. You should see requests to `smqs-api.onrender.com`

---

## 🔧 Configuration Files Explained

### `.env.production`
Used by Vercel in production:
```env
NEXT_PUBLIC_API_BASE_URL=https://smqs-api.onrender.com
```

### `vercel.json`
Vercel deployment configuration:
```json
{
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_BASE_URL": "https://smqs-api.onrender.com"
  }
}
```

### `lib/php-api-config.ts`
Automatically detects production vs local:
- **Production**: Uses Render API directly
- **Local**: Uses XAMPP with index.php routing

---

## 🗄️ Database Setup (If Not Done)

If you haven't set up the database yet, your backend won't work fully. Quick setup:

1. **Create Railway MySQL** (2 minutes):
   - Go to [railway.app](https://railway.app)
   - New Project → Add MySQL
   - Copy credentials

2. **Add to Render**:
   - Render Dashboard → smqs-api → Environment
   - Add: DB_HOST, DB_NAME, DB_USER, DB_PASS
   - Save (auto-redeploys)

3. **Initialize Database**:
   - Visit: `https://smqs-api.onrender.com/init-db.php`

---

## 🔄 CORS Configuration

The backend API should already have CORS enabled in `.htaccess`:

```apache
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type, Authorization"
```

If you encounter CORS errors:
1. Check backend logs in Render
2. Verify `.htaccess` is present in `db_samp/api/`
3. Check Apache headers module is enabled (already in Dockerfile)

---

## 🆘 Troubleshooting

### Issue: "API_BASE_URL is not defined"

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_BASE_URL = https://smqs-api.onrender.com`
3. Redeploy: Deployments → Three dots → Redeploy

### Issue: "Network Error" or "Failed to Fetch"

**Check:**
1. Is backend API running? Test: `https://smqs-api.onrender.com/ping`
2. Is backend on free tier and sleeping? (Wait 50 seconds for cold start)
3. Check CORS headers in backend response

### Issue: Build Fails on Vercel

**Common causes:**
1. TypeScript errors → Already disabled in `next.config.mjs`
2. Missing dependencies → Check `package.json`
3. Build timeout → Contact Vercel support

### Issue: Environment Variables Not Working

**Solution:**
1. Make sure variable starts with `NEXT_PUBLIC_`
2. Redeploy after adding environment variables
3. Check it's applied to "Production" environment

---

## 📱 Custom Domain (Optional)

To add a custom domain to Vercel:

1. Go to Vercel Dashboard → Your Project
2. Click **"Settings"** → **"Domains"**
3. Add your domain
4. Update DNS records as instructed
5. SSL certificate is automatic

---

## 🚀 Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- **Push to `main`** → Production deployment
- **Push to other branches** → Preview deployment
- Each pull request gets its own preview URL

---

## 💰 Cost

Both services have generous free tiers:

- **Vercel**: Free for personal projects
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS

- **Render**: Free tier includes
  - 750 hours/month
  - Spins down after 15 min inactivity
  - 50-second cold start

**Total Cost: $0/month** 🎉

---

## 📋 Deployment Checklist

- [x] Backend deployed to Render
- [x] Frontend configured with API URL
- [x] Changes pushed to GitHub
- [ ] Deploy to Vercel
- [ ] Test frontend loads
- [ ] Test API connection
- [ ] Set up database (if not done)
- [ ] Initialize database schema
- [ ] Test login functionality
- [ ] Test all features

---

## 🎉 Next Steps After Deployment

1. ✅ Test all features (login, appointments, queue, etc.)
2. 🗄️ Set up MySQL database if not done
3. 👥 Create admin/doctor/patient accounts
4. 📱 Share your app URL!
5. 🎨 Customize branding and colors
6. 📊 Monitor usage and performance

---

## 📞 Support

If you encounter issues:

- **Vercel Logs**: Dashboard → Your Project → Deployments → View Function Logs
- **Render Logs**: Dashboard → smqs-api → Logs tab
- **Browser Console**: F12 → Console tab (for frontend errors)
- **Network Tab**: F12 → Network tab (for API calls)

---

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Render Documentation](https://render.com/docs)

---

**Ready to deploy? Follow Step 1 above to push your changes to GitHub!**
