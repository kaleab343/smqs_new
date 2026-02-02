import { NextResponse } from "next/server"
import { buildPhpUrl, getPhpApiBase } from "@/lib/php-api-config"

export async function GET() {
  const urls: string[] = []
  try {
    const primary = buildPhpUrl('/ping')
    const base = getPhpApiBase().replace(/\/?$/, "")
    const alt1 = /index\.php$/i.test(base) ? `${base}?r=/ping` : `${base}/index.php?r=/ping`
    const alt2 = /index\.php$/i.test(base) ? base.replace(/index\.php$/i, '') + 'ping' : `${base}/ping`
    for (const url of [primary, alt1, alt2]) {
      urls.push(url)
      try {
        const res = await fetch(url)
        const text = await res.text()
        return new NextResponse(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'text/plain' } })
      } catch (e: any) {
        urls.push(`error: ${e?.message || String(e)}`)
      }
    }
    return NextResponse.json({ error: 'proxy_failed', message: 'All ping attempts failed', attempts: urls }, { status: 502 })
  } catch (e: any) {
    return NextResponse.json({ error: 'proxy_failed', message: e?.message || String(e), attempts: urls }, { status: 502 })
  }
}
