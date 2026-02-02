import { NextRequest, NextResponse } from "next/server"
import { buildPhpUrl, getPhpApiBase } from "@/lib/php-api-config"

async function forward(req: NextRequest) {
  const attempts: string[] = []
  try {
    const primary = buildPhpUrl('/auth/register')
    const base = getPhpApiBase().replace(/\/?$/, "")
    // Fallback variations if buildPhpUrl doesn't match the server shape
    const alt1 = /index\.php$/i.test(base) ? `${base}?r=/auth/register` : `${base}/index.php?r=/auth/register`
    const alt2 = /index\.php$/i.test(base) ? base.replace(/index\.php$/i, '') + 'auth/register' : `${base}/auth/register`

    const headers: Record<string, string> = {}
    req.headers.forEach((v, k) => {
      const lk = k.toLowerCase()
      if (["host", "connection", "content-length"].includes(lk)) return
      headers[k] = v
    })

    const init: RequestInit = { method: "POST", headers }
    const body = await req.arrayBuffer()
    init.body = Buffer.from(body)

    for (const url of [primary, alt1, alt2]) {
      attempts.push(url)
      try {
        const res = await fetch(url, init)
        const buf = await res.arrayBuffer()
        const out = new Headers()
        const ct = res.headers.get("content-type"); if (ct) out.set("content-type", ct)
        return new NextResponse(Buffer.from(buf), { status: res.status, headers: out })
      } catch (inner: any) {
        // continue to next attempt
        attempts.push(`error: ${inner?.message || String(inner)}`)
      }
    }
    return NextResponse.json({ error: "proxy_failed", message: "All attempts failed", attempts }, { status: 502 })
  } catch (e: any) {
    return NextResponse.json({ error: "proxy_failed", message: e?.message || String(e), attempts }, { status: 502 })
  }
}

export async function POST(req: NextRequest) { return forward(req) }
