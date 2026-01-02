import { NextRequest, NextResponse } from "next/server"
import { getPhpApiBase } from "@/lib/php-api-config"

async function forward(req: NextRequest) {
  try {
    const base = getPhpApiBase().replace(/\/?$/, "") // includes index.php when using fallback
    const url = `${base}?r=/auth/register`

    const headers: Record<string, string> = {}
    req.headers.forEach((v, k) => {
      const lk = k.toLowerCase()
      if (["host", "connection", "content-length"].includes(lk)) return
      headers[k] = v
    })

    const init: RequestInit = { method: "POST", headers }
    const body = await req.arrayBuffer()
    init.body = Buffer.from(body)

    const res = await fetch(url, init)
    const buf = await res.arrayBuffer()
    const out = new Headers()
    const ct = res.headers.get("content-type"); if (ct) out.set("content-type", ct)
    return new NextResponse(Buffer.from(buf), { status: res.status, headers: out })
  } catch (e: any) {
    return NextResponse.json({ error: "proxy_failed", message: e?.message || String(e) }, { status: 502 })
  }
}

export async function POST(req: NextRequest) { return forward(req) }
