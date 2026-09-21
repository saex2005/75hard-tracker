import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

// Integración personal (single-user) con la Oura Ring API v2. Los Personal
// Access Tokens de Oura se dejaron de emitir en diciembre 2025 — esto usa
// OAuth2 Authorization Code con un solo usuario (Santiago). Solo se guarda
// el refresh_token (de vida larga) en `oura_tokens`; el access_token se pide
// fresco en cada uso y nunca se persiste.

const OURA_AUTHORIZE_URL = 'https://cloud.ouraring.com/oauth/authorize'
const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token'
const OURA_API_BASE = 'https://api.ouraring.com/v2'

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.OURA_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'daily personal',
    state,
  })
  return `${OURA_AUTHORIZE_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error(`Oura token exchange failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function storeRefreshToken(refreshToken: string): Promise<void> {
  const supabase = getSupabase()
  await supabase
    .from('oura_tokens')
    .upsert({ id: 1, refresh_token: refreshToken, updated_at: new Date().toISOString() })
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error(`Oura token refresh failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function getValidAccessToken(): Promise<string | null> {
  const supabase = getSupabase()
  const { data: row } = await supabase.from('oura_tokens').select('*').eq('id', 1).maybeSingle()
  if (!row) return null

  const tokens = await refreshAccessToken(row.refresh_token)
  // Oura puede rotar el refresh_token en cada refresh — guardar el nuevo
  if (tokens.refresh_token && tokens.refresh_token !== row.refresh_token) {
    await storeRefreshToken(tokens.refresh_token)
  }
  return tokens.access_token
}

export async function fetchStepsForDate(dateISO: string): Promise<number> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) return 0

  const params = new URLSearchParams({ start_date: dateISO, end_date: dateISO })
  const res = await fetch(`${OURA_API_BASE}/usercollection/daily_activity?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Oura daily_activity failed: ${res.status} ${await res.text()}`)

  const json = await res.json()
  return json?.data?.[0]?.steps ?? 0
}
