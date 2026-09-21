import { NextRequest, NextResponse } from 'next/server'
import { buildAuthorizeUrl } from '@/lib/oura'

// Setup manual, una sola vez: Santiago visita esta ruta logueado en Oura,
// autoriza la app "100 Días" y Oura lo redirige a /api/oura/callback con un
// código de autorización que se cambia por el refresh_token de larga vida.
export async function GET(request: NextRequest) {
  const redirectUri = new URL('/api/oura/callback', request.url).toString()
  const state = crypto.randomUUID()
  return NextResponse.redirect(buildAuthorizeUrl(redirectUri, state))
}
