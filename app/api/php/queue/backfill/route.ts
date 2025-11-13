import { NextRequest, NextResponse } from "next/server"
import { getPhpApiBase } from "@/lib/php-api-config"

export async function POST(req: NextRequest) {
  try {
    const base = getPhpApiBase().replace(/\/?$/, "")
    const hasIndex = /\/index\.php$/.test(base)
    const url = hasIndex
      ? `${base}?r=/queue/backfill`
      : `${base}/index.php?r=/queue/backfill`

    const headers: Record<string, string> = {}
    req.headers.forEach((v, k) => {
      const lk = k.toLowerCase(); if (["host","connection","content-length"].includes(lk)) return; headers[k] = v
    })

    const res = await fetch(url, { method: 'POST', headers })
    const buf = await res.arrayBuffer()
    const out = new Headers()
    const ct = res.headers.get('content-type'); if (ct) out.set('content-type', ct)
    return new NextResponse(Buffer.from(buf), { status: res.status, headers: out })
  } catch (e: any) {
    return NextResponse.json({ error: 'proxy_failed', message: e?.message || String(e) }, { status: 502 })
  }
}
