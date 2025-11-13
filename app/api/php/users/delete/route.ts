import { NextRequest, NextResponse } from "next/server"
import { getPhpApiBase } from "@/lib/php-api-config"

export async function POST(req: NextRequest) {
  try {
    const base = getPhpApiBase().replace(/\/?$/, "")
    const urlIn = new URL(req.url)
    const id = urlIn.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })
    const url = `${base}?r=/users/delete&id=${encodeURIComponent(id)}`
    const res = await fetch(url, { method: 'POST' })
    const buf = await res.arrayBuffer()
    const out = new Headers()
    const ct = res.headers.get('content-type'); if (ct) out.set('content-type', ct)
    return new NextResponse(Buffer.from(buf), { status: res.status, headers: out })
  } catch (e: any) {
    return NextResponse.json({ error: 'proxy_failed', message: e?.message || String(e) }, { status: 502 })
  }
}
