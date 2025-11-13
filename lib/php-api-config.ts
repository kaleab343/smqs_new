// Minimal client-side config to target the PHP backend directly from the frontend
// Configure via NEXT_PUBLIC_PHP_API_BASE, e.g.
// NEXT_PUBLIC_PHP_API_BASE=http://localhost/db_samp/api

export function getPhpApiBase(): string {
  const env = (process.env.NEXT_PUBLIC_PHP_API_BASE || "").trim()
  if (env) return env.replace(/\/?$/, "")
  // Fallback for local XAMPP path. Encode parentheses to avoid some Apache setups failing on () in URL
  const base = "http://127.0.0.1/code_(1)/db_samp/api/index.php"
  return base.replace("(", "%28").replace(")", "%29")
}
