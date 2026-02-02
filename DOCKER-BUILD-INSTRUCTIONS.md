# Docker Build Instructions for SMQS

This guide will help you build and run the SMQS (Smart Queue Management System) Docker containers on any PC.

## Prerequisites

Before starting, ensure you have installed:
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
  - Download from: https://www.docker.com/products/docker-desktop
- **Docker Compose** (usually included with Docker Desktop)

Verify installation by running:
```bash
docker --version
docker-compose --version
```

## Quick Start (Recommended)

### Option 1: Using Docker Compose (Easiest)

1. **Navigate to the project directory:**
   ```bash
   cd path/to/SMQS
   ```

2. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

   This single command will:
   - Build the web frontend (Next.js)
   - Build the API backend (PHP)
   - Pull and configure MySQL database
   - Start all services together

3. **Access the application:**
   - **Frontend:** http://localhost:3000
   - **API:** http://localhost:8080
   - **Database:** localhost:3306

4. **Stop the services:**
   ```bash
   # Press Ctrl+C in the terminal, then:
   docker-compose down
   ```

### Option 2: Build Individual Images

If you want to build images separately:

#### Build the Web Frontend (Next.js)
```bash
docker build -t smqs-web -f Dockerfile.web .
```

#### Build the API Backend (PHP)
```bash
docker build -t smqs-api -f Dockerfile.api .
```

#### Run with Docker Compose after building
```bash
docker-compose up
```

## Detailed Steps

### Step 1: Clone/Copy the Project
```bash
# If using Git
git clone <repository-url>
cd SMQS

# Or simply copy the entire project folder to your friend's PC
```

### Step 2: Configure Environment (Optional)

Create a `.env` file in the project root to customize settings:
```env
# Database Configuration
DB_ROOT_PASSWORD=root
DB_NAME=smart_queue_management
DB_USER=smqs
DB_PASSWORD=smqs

# API URL for frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

### Step 3: Build and Run

**For Windows (PowerShell):**
```powershell
# Build and start
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**For Windows (Command Prompt):**
```cmd
docker-compose up --build -d
docker-compose logs -f
docker-compose down
```

**For Linux/Mac:**
```bash
# Build and start
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Step 4: Initialize Database

The database will automatically initialize using the SQL script in `docker/db/init/01_schema.sql`. If you need to manually initialize:

1. Access the API endpoint: http://localhost:8080/init-db.php
2. Or use the frontend's database initializer component

## Useful Docker Commands

### View Running Containers
```bash
docker ps
```

### View All Containers (including stopped)
```bash
docker ps -a
```

### View Container Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f api
docker-compose logs -f db
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild After Code Changes
```bash
# Rebuild and restart
docker-compose up --build -d

# Rebuild specific service
docker-compose up --build -d web
```

### Stop and Remove Containers
```bash
# Stop containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (⚠️ deletes database data)
docker-compose down -v
```

### Access Container Shell
```bash
# Web container
docker exec -it smqs_web sh

# API container
docker exec -it smqs_api bash

# Database container
docker exec -it smqs_db bash
```

## Troubleshooting

### Port Already in Use

If ports 3000, 8080, or 3306 are already in use:

**Option 1: Stop conflicting services**
- Stop XAMPP, WAMP, or other services using these ports
- On Windows: Stop IIS or other web servers

**Option 2: Change ports in docker-compose.yml**
```yaml
services:
  web:
    ports:
      - "3001:3000"  # Change 3001 to any available port
  
  api:
    ports:
      - "8081:80"    # Change 8081 to any available port
  
  db:
    ports:
      - "3307:3306"  # Change 3307 to any available port
```

### Build Fails

1. **Check Docker is running:**
   ```bash
   docker info
   ```

2. **Clear Docker cache:**
   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

3. **Check disk space:**
   ```bash
   docker system df
   ```

### Database Connection Issues

1. **Wait for database to be ready:**
   The database takes ~30 seconds to initialize on first run

2. **Check database health:**
   ```bash
   docker-compose ps
   ```

3. **View database logs:**
   ```bash
   docker-compose logs db
   ```

### Frontend Build Issues

If the Next.js build fails:
```bash
# Rebuild with verbose output
docker-compose build --no-cache web

# Check logs
docker-compose logs web
```

## Windows-Specific Notes

### Using PowerShell Script (Recommended for Windows)

Run the included PowerShell script:
```powershell
.\docker-build.ps1
```

### Docker Desktop Settings

1. Open Docker Desktop
2. Go to Settings → Resources
3. Allocate sufficient resources:
   - **CPU:** 2+ cores
   - **Memory:** 4GB+ RAM
   - **Disk:** 20GB+ space

### WSL 2 Backend (Recommended)

Docker Desktop on Windows works best with WSL 2:
1. Open Docker Desktop
2. Go to Settings → General
3. Enable "Use the WSL 2 based engine"

## Production Deployment Notes

For production deployment:

1. **Use environment variables for secrets:**
   - Don't commit `.env` file
   - Set strong passwords
   - Change default credentials

2. **Enable HTTPS:**
   - Use reverse proxy (Nginx/Caddy)
   - Configure SSL certificates

3. **Security hardening:**
   - Change default database passwords
   - Restrict port access
   - Enable firewall rules

4. **Data persistence:**
   - Use named volumes for database
   - Regular backups

## System Requirements

- **OS:** Windows 10/11, macOS 10.15+, or Linux
- **RAM:** Minimum 4GB (8GB+ recommended)
- **Disk:** 10GB free space
- **CPU:** 2+ cores recommended

## Getting Help

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Review the troubleshooting section above
3. Ensure all prerequisites are installed
4. Check Docker Desktop is running

## Quick Reference

```bash
# Build and start (detached)
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up --build -d

# Access application
# Frontend: http://localhost:3000
# API: http://localhost:8080
```

---

## Next Steps After Build

1. Open http://localhost:3000 in your browser
2. The database will auto-initialize on first API call
3. Create a super admin account
4. Start using the system!

For more details, see:
- `README.md` - Project overview
- `SETUP-GUIDE.md` - Development setup
- `DATABASE.md` - Database information
