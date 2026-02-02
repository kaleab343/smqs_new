# Setup Railway MySQL Database (2 Minutes)

## 🚂 Railway Setup Steps

### Step 1: Create Railway Account & Project

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign up with GitHub (easiest)
4. Click **"Deploy"** or **"New Project"**

### Step 2: Add MySQL Database

1. Click **"+ New"** button
2. Select **"Database"**
3. Choose **"MySQL"**
4. Wait 30 seconds for provisioning

### Step 3: Get Database Credentials

1. Click on the **MySQL service** (database icon)
2. Go to **"Variables"** tab
3. You'll see these variables:
   ```
   MYSQLHOST
   MYSQLPORT
   MYSQLDATABASE
   MYSQLUSER
   MYSQLPASSWORD
   MYSQL_PUBLIC_URL
   ```

4. **Copy these values:**
   - `MYSQLHOST` → This is your **DB_HOST**
   - `MYSQLDATABASE` → This is your **DB_NAME** (usually "railway")
   - `MYSQLUSER` → This is your **DB_USER** (usually "root")
   - `MYSQLPASSWORD` → This is your **DB_PASS**
   - `MYSQLPORT` → This is your **DB_PORT** (usually 3306)

### Step 4: Add to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **smqs-api** service
3. Go to **"Environment"** tab (left sidebar)
4. Click **"Add Environment Variable"**
5. Add each one:

   ```
   Key: DB_HOST
   Value: [Paste MYSQLHOST from Railway]
   
   Key: DB_NAME
   Value: railway
   
   Key: DB_USER
   Value: root
   
   Key: DB_PASS
   Value: [Paste MYSQLPASSWORD from Railway]
   
   Key: DB_PORT
   Value: [Paste MYSQLPORT from Railway]
   ```

6. Click **"Save Changes"**
7. Service will automatically redeploy (wait 2 minutes)

### Step 5: Initialize Database Schema

Once redeployed, run this command to initialize your database:

```bash
curl -X POST https://smqs-api.onrender.com/init-db.php
```

Or open in browser:
```
https://smqs-api.onrender.com/init-db.php
```

You should see:
```json
{
  "success": true,
  "message": "Database initialized successfully"
}
```

### Step 6: Test API

Now test your API endpoints:

```bash
# Test doctors endpoint
curl https://smqs-api.onrender.com/doctors

# Should return empty array or list of doctors
```

---

## ✅ Done!

Your backend is now:
- ✅ Deployed on Render
- ✅ Connected to Railway MySQL database
- ✅ Database schema initialized
- ✅ Ready to use!

---

## 💰 Cost

- **Railway**: Free tier includes 500 hours/month ($0)
- **Render**: Free tier includes 750 hours/month ($0)
- **Total**: FREE! 🎉

---

## 🔒 Security Note

Railway databases are publicly accessible but require credentials. Make sure:
- Keep your DB_PASS secret
- Don't commit `.env` files to Git
- Use strong passwords

---

## 🆘 Troubleshooting

### Issue: Can't connect to Railway database from Render

Check:
1. Are you using `MYSQLHOST` (public host)?
2. Is `MYSQLPORT` correct (usually 3306)?
3. Did you save changes in Render and wait for redeploy?

### Issue: "Database connection failed"

1. Verify credentials in Render Environment tab
2. Check Railway database is running (green status)
3. Wait for Render to redeploy (takes 2 minutes)

---

## 📋 Railway MySQL Public URL Format

Railway also provides a connection string:
```
mysql://root:PASSWORD@HOST:PORT/railway
```

You can use this format if needed.
