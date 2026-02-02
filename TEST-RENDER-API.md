# Test Your Deployed Render API

## 🔍 Find Your API URL

1. Go to your Render service dashboard
2. At the top, you'll see your service URL
3. It looks like: `https://smqs-api.onrender.com` or `https://smqs-api-xxxx.onrender.com`

---

## 🧪 Test Endpoints

### Test 1: Health Check (Ping)

```bash
curl https://YOUR-SERVICE-URL.onrender.com/ping
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "API is running"
}
```

### Test 2: Initialize Database

```bash
curl -X POST https://YOUR-SERVICE-URL.onrender.com/init-db.php
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully"
}
```

### Test 3: Test Login

```bash
curl -X POST https://YOUR-SERVICE-URL.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Test 4: Get Doctors

```bash
curl https://YOUR-SERVICE-URL.onrender.com/doctors
```

---

## 🌐 Test in Browser

Simply open your browser and go to:

```
https://YOUR-SERVICE-URL.onrender.com/ping
```

You should see a JSON response!

---

## 🗄️ Database Status

**Did you add database credentials?**

If you see database connection errors, you need to:

1. Set up a MySQL database (Railway/PlanetScale/Aiven)
2. Go to Render → Your Service → Environment
3. Add/update these variables:
   ```
   DB_HOST=your-database-host
   DB_NAME=smart_queue_management
   DB_USER=your-database-username
   DB_PASS=your-database-password
   ```
4. Service will auto-redeploy

---

## ⚠️ First Request May Be Slow

Since you're on the free tier:
- First request after inactivity takes ~50 seconds (cold start)
- Service "spins down" after 15 minutes of no requests
- Subsequent requests are fast

---

## 📋 Next Steps

1. ✅ Test the API endpoints
2. 🗄️ Set up MySQL database (if not done)
3. 🔄 Initialize database schema
4. 🌐 Deploy frontend to Vercel (connects to this API)
5. 🎉 Your full app is live!

---

## 🆘 Troubleshooting

### Issue: "Service Unavailable"
- Wait 50 seconds for cold start
- Refresh the page

### Issue: Database Connection Error
- Add database credentials in Environment variables
- Make sure database is initialized with schema

### Issue: 404 Not Found
- Check the URL is correct
- Make sure you're accessing `/ping` or valid endpoint

---

## 🎯 Get Your Service URL

1. Go to Render Dashboard
2. Click on **smqs-api** service
3. Look at the top - you'll see: `https://smqs-api-xxxx.onrender.com`
4. Copy that URL!
