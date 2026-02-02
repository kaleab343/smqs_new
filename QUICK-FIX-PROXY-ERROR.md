# 🚨 QUICK FIX: Proxy Error on Friend's PC

## The Problem
Getting this error when trying to signup/login:
```
Proxy error / Cannot connect to backend server
```

## 3-Step Quick Fix

### ✅ Step 1: Start XAMPP Services
1. Open **XAMPP Control Panel**
2. Click **Start** next to:
   - **Apache** (must turn GREEN)
   - **MySQL** (must turn GREEN)
3. If they don't start, check for port conflicts

### ✅ Step 2: Run Diagnostic Script
Open PowerShell in the project folder and run:
```powershell
.\scripts\diagnose-setup.ps1
```

This will tell you EXACTLY what's wrong!

### ✅ Step 3: Fix the Issue Found

---

## Common Issues & Solutions

### Issue #1: "Wrong Installation Path"

**If your folder is NOT named `SMQS`:**

1. Create file: `.env.local` in project root
2. Add this line (replace with YOUR folder name):
```env
NEXT_PUBLIC_PHP_API_BASE=http://localhost/YOUR_FOLDER_NAME/db_samp/api/index.php
```

Example:
```env
# If folder is "hospital-system"
NEXT_PUBLIC_PHP_API_BASE=http://localhost/hospital-system/db_samp/api/index.php

# If folder is "queue-app"  
NEXT_PUBLIC_PHP_API_BASE=http://localhost/queue-app/db_samp/api/index.php
```

3. Restart dev server:
```bash
npm run dev
```

---

### Issue #2: "Apache Port Already in Use"

**If Apache won't start (port 80 taken):**

**Option A: Use Port 8080**
1. XAMPP Control → Apache Config → httpd.conf
2. Find `Listen 80` → Change to `Listen 8080`
3. Find `ServerName localhost:80` → Change to `ServerName localhost:8080`
4. Save and restart Apache
5. Create `.env.local`:
```env
NEXT_PUBLIC_PHP_API_BASE=http://localhost:8080/SMQS/db_samp/api/index.php
```

**Option B: Stop IIS/Skype**
- Stop Windows IIS service
- Stop Skype (it uses port 80)

---

### Issue #3: "Database Connection Failed"

**Check database credentials:**

1. Open `db_samp\api\config.php`
2. Verify:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'smart_queue_management');
define('DB_USER', 'root');
define('DB_PASS', '');  // Empty for default XAMPP
```

3. If MySQL has a password, update `DB_PASS`

**Create database if missing:**
1. Go to: http://localhost/phpmyadmin
2. Click "New"
3. Name: `smart_queue_management`
4. Click "Create"

---

### Issue #4: "Backend Not Accessible"

**Test backend directly:**

Open browser and go to:
```
http://localhost/SMQS/db_samp/api/index.php?r=/ping
```

**Should see:**
```json
{"status":"ok","message":"API is running"}
```

**If you see error:**
- Apache is not running → Start it in XAMPP
- Wrong folder name → Update `.env.local` (see Issue #1)
- PHP files missing → Re-extract project

---

## After Fixing

1. **Restart everything:**
```bash
# Stop dev server (Ctrl+C)
npm run dev
```

2. **Test:**
   - Go to: http://localhost:3000
   - Try signup
   - Should work now! 🎉

---

## Still Not Working?

Run the diagnostic again:
```powershell
.\scripts\diagnose-setup.ps1
```

Share the output to get help!

---

## Prevention

**For new installations, always:**
1. Install to: `C:\xampp\htdocs\SMQS\`
2. Start Apache & MySQL before running app
3. Run diagnostic script first: `.\scripts\diagnose-setup.ps1`
