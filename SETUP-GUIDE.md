# SMQS Setup Guide - Fix Proxy Errors

## Common Error: "Proxy Error" or "Cannot Connect to Backend"

If you're seeing proxy errors when trying to signup/login, follow these steps:

---

## Step 1: Verify XAMPP is Running

### Windows:
1. Open **XAMPP Control Panel**
2. Ensure these services are **RUNNING** (green):
   - ✅ **Apache** (Port 80, 443)
   - ✅ **MySQL** (Port 3306)
3. If not running, click **Start** for each service

### Check Ports:
- Apache should be on port **80** (not 8080 or other)
- MySQL should be on port **3306**
- If ports are blocked, configure different ports in XAMPP

---

## Step 2: Verify Installation Path

The application expects to be in:
```
C:\xampp\htdocs\SMQS\
```

### If your path is DIFFERENT:
You need to update the API configuration!

**Option A: Set Environment Variable (Recommended)**
Create a `.env.local` file in the root:
```env
NEXT_PUBLIC_PHP_API_BASE=http://localhost/YOUR_FOLDER_NAME/db_samp/api/index.php
```

Example if installed in `C:\xampp\htdocs\hospital-system\`:
```env
NEXT_PUBLIC_PHP_API_BASE=http://localhost/hospital-system/db_samp/api/index.php
```

**Option B: Modify Config File**
Edit `lib/php-api-config.ts`:
```typescript
const base = "http://localhost/YOUR_FOLDER_NAME/db_samp/api/index.php"
```

---

## Step 3: Test Backend Connection

### Test 1: Direct PHP Access
Open browser and go to:
```
http://localhost/SMQS/db_samp/api/index.php?r=/ping
```

**Expected Response:**
```json
{"status":"ok","message":"API is running"}
```

**If you see an error:**
- ❌ Apache is not running → Start Apache in XAMPP
- ❌ Wrong folder name → Check your installation path
- ❌ PHP files missing → Re-extract the project

### Test 2: Database Connection
```
http://localhost/SMQS/db_samp/api/init-db.php?init=true
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "tables": { ... }
}
```

**If you see an error:**
- ❌ MySQL not running → Start MySQL in XAMPP
- ❌ Database doesn't exist → Create database (see Step 4)
- ❌ Wrong credentials → Check `db_samp/api/config.php`

---

## Step 4: Create Database

### Option A: Auto-create (Recommended)
The app will create the database automatically on first run!

### Option B: Manual Creation
1. Open **phpMyAdmin**: http://localhost/phpmyadmin
2. Click **New** in left sidebar
3. Database name: `smart_queue_management`
4. Collation: `utf8mb4_unicode_ci`
5. Click **Create**

The tables will be created automatically by the app.

---

## Step 5: Verify Database Configuration

Check `db_samp/api/config.php`:

```php
<?php
define('DB_HOST', 'localhost');     // ← Should be 'localhost'
define('DB_NAME', 'smart_queue_management');  // ← Database name
define('DB_USER', 'root');          // ← Default XAMPP user
define('DB_PASS', '');              // ← Default XAMPP password (empty)
define('DB_CHARSET', 'utf8mb4');
```

**Common Issues:**
- If MySQL has a password, update `DB_PASS`
- If MySQL is on different port, update `DB_HOST` to `localhost:PORT`

---

## Step 6: Restart Development Server

After making any configuration changes:

```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Quick Diagnostic Script

Run this PowerShell script to check your setup:

```powershell
# Run from project root
.\scripts\diagnose-setup.ps1
```

This will check:
- ✅ XAMPP services status
- ✅ PHP backend accessibility
- ✅ Database connection
- ✅ API endpoints
- ✅ Configuration files

---

## Common Scenarios

### Scenario 1: Friend's PC (Different Installation)

**Problem:** App installed in different folder (e.g., `hospital-queue` instead of `SMQS`)

**Solution:**
Create `.env.local`:
```env
NEXT_PUBLIC_PHP_API_BASE=http://localhost/hospital-queue/db_samp/api/index.php
```

### Scenario 2: Port Conflicts

**Problem:** Apache won't start (port 80 in use)

**Solution 1 - Change Apache Port:**
1. XAMPP Control → Apache Config → httpd.conf
2. Find `Listen 80` → Change to `Listen 8080`
3. Find `ServerName localhost:80` → Change to `ServerName localhost:8080`
4. Restart Apache
5. Update `.env.local`:
```env
NEXT_PUBLIC_PHP_API_BASE=http://localhost:8080/SMQS/db_samp/api/index.php
```

**Solution 2 - Stop Conflicting Service:**
- Windows: Stop IIS, Skype, or other services using port 80

### Scenario 3: Fresh Windows Installation

**Problem:** XAMPP not installed

**Solution:**
1. Download XAMPP: https://www.apachefriends.org/
2. Install to `C:\xampp`
3. Start Apache and MySQL
4. Follow this guide from Step 2

---

## Testing the Fix

After following the steps:

1. **Start Services:**
   - XAMPP: Apache ✅ MySQL ✅
   - Dev Server: `npm run dev` ✅

2. **Open App:**
   ```
   http://localhost:3000
   ```

3. **Try Signup:**
   - Go to signup page
   - Fill in details
   - Click "Sign Up"
   - Should work without proxy error! 🎉

---

## Still Having Issues?

### Check Browser Console
1. Press `F12` (DevTools)
2. Go to **Console** tab
3. Look for error messages
4. Copy and share the error

### Check Network Tab
1. Press `F12` (DevTools)
2. Go to **Network** tab
3. Try signup/login
4. Look for failed requests (red)
5. Click on failed request → Preview tab
6. Share the error response

### Common Error Messages

**"Failed to fetch"**
- Apache is not running
- Wrong URL/port
- Firewall blocking

**"404 Not Found"**
- Wrong installation path
- PHP files missing
- Wrong API URL

**"500 Internal Server Error"**
- PHP error (check XAMPP logs)
- Database connection failed
- Wrong credentials

**"Connection refused"**
- Port blocked/wrong
- Service not running
- Firewall blocking

---

## Need Help?

Share these details:
1. XAMPP installation path
2. Project installation path  
3. Apache/MySQL status (running/stopped)
4. Browser console errors
5. Response from: http://localhost/SMQS/db_samp/api/index.php?r=/ping
