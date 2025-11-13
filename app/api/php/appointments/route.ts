import { NextRequest, NextResponse } from "next/server"
import { getPhpApiBase } from "@/lib/php-api-config"

async function forward(req: NextRequest, method: string) {
  try {
    const base = getPhpApiBase().replace(/\/?$/, "") // includes index.php
    const url = `${base}?r=/appointments`

    const headers: Record<string, string> = {}
    req.headers.forEach((v, k) => {
      const lk = k.toLowerCase()
      if (["host", "connection", "content-length"].includes(lk)) return
      headers[k] = v
    })

    const init: RequestInit = { method, headers }
    if (method !== "GET" && method !== "HEAD") {
      const body = await req.arrayBuffer()
      init.body = Buffer.from(body)
    }

    const res = await fetch(url, init)
    const buf = await res.arrayBuffer()
    const out = new Headers()
    const ct = res.headers.get("content-type"); if (ct) out.set("content-type", ct)
    return new NextResponse(Buffer.from(buf), { status: res.status, headers: out })
  } catch (e: any) {
    return NextResponse.json({ error: "proxy_failed", message: e?.message || String(e) }, { status: 502 })
  }
}

export async function POST(req: NextRequest) { return forward(req, "POST") }
export async function GET(req: NextRequest) { return forward(req, "GET") }
