import { NextRequest, NextResponse } from "next/server"
import { getPhpApiBase } from "@/lib/php-api-config"

async function forward(req: NextRequest, method: string) {
  try {
    const base = getPhpApiBase().replace(/\/?$/, "") // should include index.php
    const searchParams = req.nextUrl?.searchParams
    let query = ""
    if (searchParams) {
      const params = new URLSearchParams(searchParams)
      params.delete('r')
      const qs = params.toString()
      query = qs ? `&${qs}` : ""
    }
    const url = `${base}?r=/admin/activities${query}`

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
    const bodyBuf = await res.arrayBuffer()
    const outHeaders = new Headers()
    const ct = res.headers.get("content-type")
    if (ct) outHeaders.set("content-type", ct)
    return new NextResponse(Buffer.from(bodyBuf), { status: res.status, headers: outHeaders })
  } catch (e: any) {
    return NextResponse.json({ error: "proxy_failed", message: e?.message || String(e) }, { status: 502 })
  }
}

export async function GET(req: NextRequest) { return forward(req, "GET") }
export async function POST(req: NextRequest) { return forward(req, "POST") }
