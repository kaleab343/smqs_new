import { NextRequest, NextResponse } from "next/server"
import { getPhpApiBase } from "@/lib/php-api-config"

function buildUrls(base: string, relPath: string) {
  const b = base.replace(/\/$/, "")
  const isFront = /\/index\.php$/.test(b)
  const pretty = `${b}${relPath}`
  const front = isFront ? `${b}?r=${relPath}` : `${b}/index.php${relPath}`
  return Array.from(new Set([pretty, front]))
}

async function fetchJsonWithFallback(relPath: string) {
  const base = getPhpApiBase().replace(/\/$/, "")
  const urls = buildUrls(base, relPath)
  let last: Response | null = null
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store" })
      last = r
      if (r.ok) {
        const t = await r.text()
        try { return t ? JSON.parse(t) : null } catch { return { message: t } }
      }
    } catch {}
  }
  const msg = last ? await last.text().catch(() => "") : ""
  throw new Error(msg || `Fetch failed: ${relPath}`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as any
    const rateRaw = body?.rate ?? body?.rating
    const userIdRaw = body?.user_id ?? body?.userId
    let patientIdRaw = body?.patient_id ?? body?.patientId

    const rate = Number(rateRaw)
    const user_id = userIdRaw ? Number(userIdRaw) : undefined
    let patient_id = patientIdRaw ? Number(patientIdRaw) : undefined

    if (!rate || Number.isNaN(rate) || rate < 1 || rate > 5) {
      return NextResponse.json({ error: "Invalid rate. Must be 1..5" }, { status: 400 })
    }

    // Resolve patient_id from user_id if needed
    if (!patient_id && user_id) {
      try {
        const cur = await fetchJsonWithFallback(`/appointments/current?user_id=${encodeURIComponent(String(user_id))}`)
        if (cur && (cur.patient_id || cur?.patient?.patient_id)) {
          patient_id = Number(cur.patient_id || cur?.patient?.patient_id)
        }
      } catch {}
    }

    // Forward to PHP backend (allow PHP to resolve patient_id if we couldn't)
    const base = getPhpApiBase().replace(/\/$/, "")
    const endpoints = [
      ...buildUrls(base, "/customer-satisfaction/insert"),
      ...buildUrls(base, "/customer-satisfaction"),
    ]

    const payload: Record<string, any> = { rate }
    if (patient_id) payload.patient_id = patient_id
    if (user_id) payload.user_id = user_id

    let last: Response | null = null
    for (const url of Array.from(new Set(endpoints))) {
      const attempts: Array<RequestInit> = [
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(payload as any).toString() },
      ]
      for (const opts of attempts) {
        try {
          const r = await fetch(url, opts)
          last = r
          if (r.ok) {
            const t = await r.text()
            try {
              const json = t ? JSON.parse(t) : { success: true }
              return NextResponse.json(json)
            } catch {
              return NextResponse.json({ message: t || 'ok' })
            }
          }
        } catch {}
      }
    }

    const msg = last ? await last.text().catch(() => '') : ''
    return NextResponse.json({ error: msg || 'Failed to insert satisfaction' }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
