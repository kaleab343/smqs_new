// Minimal client-side config to target the PHP backend directly from the frontend
// Configure via NEXT_PUBLIC_PHP_API_BASE, e.g.
// NEXT_PUBLIC_PHP_API_BASE=http://localhost/db_samp/api

export function getPhpApiBase(): string {
  // Use NEXT_PUBLIC_API_BASE_URL for production (Vercel) or development
  const env = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_PHP_API_BASE || "").trim()
  if (env) return env.replace(/\/?$/, "")
  
  // Fallback for local XAMPP path based on this repo structure:
  // htdocs/SMQS/db_samp/api/index.php
  const base = "http://localhost/SMQS/db_samp/api/index.php"
  return base
}

export function buildPhpUrl(path: string): string {
  const base = getPhpApiBase().replace(/\/?$/, "")
  const cleanPath = path.startsWith('/') ? path : '/' + path
  
  // Check if we're using production API (Render) or local XAMPP
  const isProduction = base.includes('onrender.com') || base.includes('railway.app') || base.includes('fly.io')
  
  if (isProduction) {
    // Production API uses direct paths (e.g., /auth/login, /doctors)
    return `${base}${cleanPath}`
  }
  
  // Local XAMPP uses index.php routing
  if (/\/index\.php$/i.test(base)) {
    // Front-controller style
    return `${base}?r=${cleanPath}`
  }
  // Explicit index.php path
  return `${base}/index.php${cleanPath}`
}
