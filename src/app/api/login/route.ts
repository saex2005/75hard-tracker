import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, expectedToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  let password: unknown
  try {
    ;({ password } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const configured = process.env.APP_PASSWORD
  if (!configured) {
    // Sin password configurada la app está abierta — no hay nada que validar
    return NextResponse.json({ ok: true })
  }

  if (typeof password !== 'string' || password !== configured) {
    return NextResponse.json({ error: 'Password incorrecta' }, { status: 401 })
  }

  const token = await expectedToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 400, // ~400 días (máximo que respetan los browsers)
  })
  return res
}
