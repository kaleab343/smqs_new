import { NextRequest, NextResponse } from "next/server"
import { getPhpApiBase } from "@/lib/php-api-config"

export async function GET(_req: NextRequest) {
  try {
    const base = getPhpApiBase().replace(/\/?$/, "")
    const hasIndex = /\/index\.php$/.test(base)
    const url = hasIndex ? `${base}?r=/doctors` : `${base}/index.php?r=/doctors`

    const res = await fetch(url, { method: "GET", cache: "no-store" })
    const ct = res.headers.get("content-type") || "application/json"
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": ct, "cache-control": "no-store" },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: "proxy_failed", message: e?.message || String(e) },
      { status: 502 },
    )
  }
}
