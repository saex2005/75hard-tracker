import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, storeRefreshToken } from '@/lib/oura'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }
  if (!code) {
    return NextResponse.json({ error: 'missing code' }, { status: 400 })
  }

  const redirectUri = new URL('/api/oura/callback', request.url).toString()
  const tokens = await exchangeCodeForTokens(code, redirectUri)
  await storeRefreshToken(tokens.refresh_token)

  return NextResponse.json({ ok: true, message: 'Oura conectado. Ya podés cerrar esta pestaña.' })
}
