import { NextRequest, NextResponse } from "next/server"
import { getPhpApiBase } from "@/lib/php-api-config"

export async function GET(req: NextRequest) {
  try {
    const base = getPhpApiBase().replace(/\/?$/, "") // includes index.php
    // Forward query params (e.g., patient_id)
    const inUrl = new URL(req.url)
    const search = inUrl.search ? inUrl.search : ""
    const url = `${base}?r=/appointments/current${search}`

    const res = await fetch(url, { method: 'GET' })
    const buf = await res.arrayBuffer()
    const out = new Headers()
    const ct = res.headers.get("content-type"); if (ct) out.set("content-type", ct)
    return new NextResponse(Buffer.from(buf), { status: res.status, headers: out })
  } catch (e: any) {
    return NextResponse.json({ error: "proxy_failed", message: e?.message || String(e) }, { status: 502 })
  }
}
