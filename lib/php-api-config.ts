// Minimal client-side config to target the PHP backend directly from the frontend
// Configure via NEXT_PUBLIC_PHP_API_BASE, e.g.
// NEXT_PUBLIC_PHP_API_BASE=http://localhost/db_samp/api

export function getPhpApiBase(): string {
  const env = (process.env.NEXT_PUBLIC_PHP_API_BASE || "").trim()
  if (env) return env.replace(/\/?$/, "")
  // Fallback for local XAMPP path based on this repo structure:
  // htdocs/SMQS/db_samp/api/index.php
  // Keep index.php in the path so query-style routing works in the Next.js proxy.
  const base = "http://localhost/SMQS/db_samp/api/index.php"
  return base
}
