import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const TRIP_SHARE_SECRET = Deno.env.get('TRIP_SHARE_SECRET') ?? ''
const TRIP_ALLOWED_ORIGIN = Deno.env.get('TRIP_ALLOWED_ORIGIN') ?? '*'

function getAdminKey(): string {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (modern) {
    try {
      const parsed = JSON.parse(modern)
      if (typeof parsed?.default === 'string' && parsed.default) return parsed.default
      const first = Object.values(parsed ?? {}).find(v => typeof v === 'string' && v)
      if (typeof first === 'string') return first
    } catch {
      // Fall through to the legacy environment variable.
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

const adminKey = getAdminKey()
const supabase = createClient(SUPABASE_URL, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

function allowedOrigins(): string[] {
  return TRIP_ALLOWED_ORIGIN.split(',').map(v => v.trim()).filter(Boolean)
}

function corsHeaders(req: Request): HeadersInit | null {
  const origin = req.headers.get('origin') ?? ''
  const allowed = allowedOrigins()
  const wildcard = allowed.includes('*')
  if (!wildcard && origin && !allowed.includes(origin)) return null
  return {
    'Access-Control-Allow-Origin': wildcard ? '*' : (origin || allowed[0] || '*'),
    'Access-Control-Allow-Headers': 'content-type, x-trip-share-token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

function json(req: Request, body: unknown, status = 200): Response {
  const cors = corsHeaders(req)
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(cors ?? {}),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function validShareToken(req: Request): Promise<boolean> {
  const incoming = req.headers.get('x-trip-share-token') ?? ''
  if (!incoming || !TRIP_SHARE_SECRET) return false
  const [a, b] = await Promise.all([sha256(incoming), sha256(TRIP_SHARE_SECRET)])
  return a === b
}

function validKey(key: string): boolean {
  return /^[a-zA-Z0-9._:-]{1,120}$/.test(key)
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req)
  if (!cors) return new Response('Origin not allowed', { status: 403 })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  if (!SUPABASE_URL || !adminKey) return json(req, { error: 'Supabase server credentials are unavailable.' }, 500)
  if (!TRIP_SHARE_SECRET) return json(req, { error: 'TRIP_SHARE_SECRET is not configured.' }, 500)
  if (!(await validShareToken(req))) return json(req, { error: '共享碼錯誤。' }, 403)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('trip_state')
      .select('key,value,updated_at')
      .order('key', { ascending: true })

    if (error) return json(req, { error: error.message }, 500)
    const states: Record<string, unknown> = {}
    for (const row of data ?? []) states[row.key] = row.value
    return json(req, { ok: true, states })
  }

  if (req.method === 'POST') {
    let body: { changes?: Record<string, unknown> }
    try {
      body = await req.json()
    } catch {
      return json(req, { error: 'Request body 必須是 JSON。' }, 400)
    }

    const changes = body?.changes
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      return json(req, { error: '缺少 changes 物件。' }, 400)
    }

    const entries = Object.entries(changes)
    if (entries.length === 0) return json(req, { ok: true, updated: 0 })
    if (entries.length > 200) return json(req, { error: '單次最多更新 200 個欄位。' }, 413)
    if (entries.some(([key]) => !validKey(key))) return json(req, { error: '包含不合法的 state key。' }, 400)

    const now = new Date().toISOString()
    const rows = entries.map(([key, value]) => ({ key, value, updated_at: now }))
    const { error } = await supabase.from('trip_state').upsert(rows, { onConflict: 'key' })
    if (error) return json(req, { error: error.message }, 500)

    return json(req, { ok: true, updated: rows.length })
  }

  return json(req, { error: 'Method not allowed.' }, 405)
})
