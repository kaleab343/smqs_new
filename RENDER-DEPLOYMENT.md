# Deploying PHP Backend to Render.com

This guide explains how to deploy the SMQS PHP backend API to Render.com.

## Prerequisites

1. A [Render.com](https://render.com) account (free tier available)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. A MySQL database (you can use Render's PostgreSQL or external MySQL service)

## Step 1: Set Up Database

### Option A: Use External MySQL Database
You can use:
- **PlanetScale** (free MySQL-compatible serverless database)
- **AWS RDS** or **Google Cloud SQL**
- **Railway** or **Aiven** (free tiers available)

### Option B: Use Render PostgreSQL
1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Name it (e.g., `smqs-database`)
4. Select free tier
5. Click "Create Database"
6. Note: You'll need to modify your PHP code to support PostgreSQL

## Step 2: Deploy Backend API to Render

### 2.1: Create Web Service

1. Go to your [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository
4. Configure the service:

   **Basic Settings:**
   - **Name**: `smqs-api` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your deployment branch)
   - **Root Directory**: Leave empty (uses repository root)
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile.render`

   **Instance Type:**
   - Select **Free** tier (or paid if needed)

### 2.2: Configure Environment Variables

In the "Environment Variables" section, add:

```
DB_HOST=your-database-host
DB_NAME=smart_queue_management
DB_USER=your-database-user
DB_PASS=your-database-password
DB_CHARSET=utf8mb4
APP_ENV=production
```

**For MySQL databases:**
- Get the host, username, and password from your database provider
- Example PlanetScale: `xxxx.aws.connect.psdb.cloud`

### 2.3: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Build the Docker image using `Dockerfile.render`
   - Deploy your API
3. Wait for deployment (usually 2-5 minutes)

## Step 3: Initialize Database

Once deployed, you need to initialize your database tables:

### Method 1: Using the API Endpoint
```bash
curl -X POST https://your-api-name.onrender.com/init-db.php
```

### Method 2: Manual SQL Import
1. Connect to your database using MySQL client
2. Import the schema: `db_samp/api/db.sql` or `docker/db/init/01_schema.sql`

## Step 4: Test Your API

Test the deployment:

```bash
# Check if API is running
curl https://your-api-name.onrender.com/ping

# Test login endpoint
curl -X POST https://your-api-name.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Step 5: Update Frontend Configuration

Update your Next.js frontend to use the Render API URL:

In `docker-compose.yml` or `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-name.onrender.com
```

## Important Notes

### Free Tier Limitations
- **Sleep after inactivity**: Free services sleep after 15 minutes of inactivity
- **Cold starts**: First request after sleep takes ~30 seconds
- **750 hours/month**: Free tier limit

### Production Recommendations
1. **Upgrade to paid tier** ($7/month) for:
   - No sleep/cold starts
   - Better performance
   - Custom domains

2. **Enable Health Checks**: Already configured in Dockerfile.render
   - Path: `/ping`
   - Interval: 30 seconds

3. **Configure Auto-Deploy**:
   - Enable "Auto-Deploy" in Render settings
   - Automatically deploys on git push

4. **Add Custom Domain**:
   - Go to service settings
   - Add custom domain
   - Update DNS records

## Database Connection String Examples

### PlanetScale (MySQL-compatible)
```env
DB_HOST=xxxx.aws.connect.psdb.cloud
DB_NAME=your-database-name
DB_USER=xxxx
DB_PASS=pscale_pw_xxxx
```

### Railway MySQL
```env
DB_HOST=containers-us-west-xxx.railway.app
DB_NAME=railway
DB_USER=root
DB_PASS=xxxx
```

### Aiven MySQL
```env
DB_HOST=mysql-xxx.aivencloud.com
DB_PORT=12345
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASS=xxxx
```

## Troubleshooting

### Issue: Database Connection Failed
- Verify environment variables are set correctly
- Check database host allows external connections
- Ensure database user has proper permissions

### Issue: 502 Bad Gateway
- Check Render logs: Dashboard → Your Service → Logs
- Verify Apache is starting correctly
- Check for PHP syntax errors

### Issue: CORS Errors
- Verify `.htaccess` file is present in `db_samp/api/`
- Check Apache headers module is enabled (already in Dockerfile)

### View Logs
```bash
# From Render Dashboard
Dashboard → Your Service → Logs (tab)
```

## Alternative: Use Existing Dockerfile.api

If you prefer to use the existing `Dockerfile.api`, you can:
1. In Render dashboard, set **Dockerfile Path** to: `Dockerfile.api`
2. Everything else remains the same

The `Dockerfile.render` includes additional optimizations for production deployment.

## Next Steps

After successful deployment:
1. ✅ Test all API endpoints
2. ✅ Deploy frontend (Next.js) to Vercel or Render
3. ✅ Set up monitoring and alerts
4. ✅ Configure backups for database
5. ✅ Add custom domain (optional)

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community Forum](https://community.render.com/)
