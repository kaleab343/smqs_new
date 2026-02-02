# Database Auto-Initialization

## Overview
The SMQS application now automatically creates all required database tables when it launches. No manual SQL execution is needed!

## How It Works

### 1. On Application Launch
When the Next.js app starts, the `DBInitializer` component (in `components/db-initializer.tsx`) runs automatically.

### 2. Initialization Process
1. Component calls `/api/php/init-db` endpoint
2. Endpoint forwards request to `db_samp/api/init-db.php`
3. PHP script creates all tables using `CREATE TABLE IF NOT EXISTS`
4. Returns success status with results
5. Results logged to browser console

### 3. Tables Created
The following tables are created automatically if they don't exist:
- ✓ `users`
- ✓ `doctors`
- ✓ `patients`
- ✓ `appointments`
- ✓ `queue`
- ✓ `customer_satisfaction`
- ✓ `hospital_information`

## Files Involved

### PHP Backend
- **`db_samp/api/init-db.php`** - Main initialization script
  - Creates all tables with proper schema
  - Uses `CREATE TABLE IF NOT EXISTS` for safety
  - Returns JSON status response

### Next.js API
- **`app/api/php/init-db/route.ts`** - API endpoint
  - Proxies requests to PHP script
  - Handles errors gracefully

### React Components
- **`components/db-initializer.tsx`** - Auto-init component
  - Runs on app startup
  - Called from `app/layout.tsx`
  - Logs results to console

### Utilities
- **`lib/db-init.ts`** - Helper functions
  - `initializeDatabase()` - Single initialization
  - `initializeDatabaseWithRetry()` - Retry logic
  - `checkDatabaseTables()` - Status check

## Usage

### Automatic (Recommended)
Just start your Next.js app. Tables will be created automatically:
```bash
npm run dev
```

Check browser console for initialization logs:
```
[SMQS] Initializing database...
[SMQS] ✓ Database initialized successfully
[SMQS] Tables status: { users: "created/verified", ... }
```

### Manual Trigger
You can manually trigger initialization:

**Method 1: Direct PHP Access**
```
http://localhost/SMQS/db_samp/api/init-db.php?init=true
```

**Method 2: Via API**
```bash
curl -X POST http://localhost:3000/api/php/init-db
```

**Method 3: Using PowerShell**
```powershell
php db_samp\api\init-db.php
```

## Safety Features

### Idempotent
- Uses `CREATE TABLE IF NOT EXISTS`
- Safe to run multiple times
- Won't overwrite existing data
- Only creates missing tables

### Error Handling
- Graceful failure (won't block app)
- Detailed error messages
- Console logging for debugging

### Foreign Key Order
Tables are created in the correct order to respect foreign key constraints:
1. `users` (no dependencies)
2. `doctors` (no dependencies)
3. `patients` (depends on `users`)
4. `appointments` (depends on `patients`, `doctors`)
5. `queue` (depends on `appointments`)
6. `customer_satisfaction` (depends on `patients`)
7. `hospital_information` (no dependencies)

## Troubleshooting

### Tables Not Creating
1. Check that XAMPP MySQL is running
2. Verify database `smart_queue_management` exists
3. Check database credentials in `db_samp/api/config.php`
4. Look for errors in browser console

### Manual Database Creation
If you need to create the database manually:
```sql
CREATE DATABASE IF NOT EXISTS `smart_queue_management` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Viewing Logs
Open browser DevTools (F12) and check the Console tab for initialization messages.

## Benefits

✅ **Zero Manual Setup** - No need to run SQL scripts manually  
✅ **Fresh Installs** - Works perfectly on new environments  
✅ **Development** - Easy to reset and start fresh  
✅ **Production** - Safe deployment with automatic schema setup  
✅ **Maintenance** - Add new tables by updating the init script  

## Configuration

Database connection settings are in:
- `db_samp/api/config.php` - PHP configuration
- `.env.local` - Next.js environment variables

## Testing

Test the initialization manually:
```bash
# Test PHP script directly
php db_samp\api\init-db.php

# Test via HTTP
curl http://localhost/SMQS/db_samp/api/init-db.php?init=true
```

Expected response:
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "tables": {
    "users": "created/verified",
    "doctors": "created/verified",
    ...
  }
}
```

## Summary

The database auto-initialization system ensures that your SMQS application is ready to use immediately after deployment, with no manual database setup required. It's safe, automatic, and developer-friendly!
