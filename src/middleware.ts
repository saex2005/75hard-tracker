import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, isValidToken } from '@/lib/auth'

// Rutas que NO pasan por el login:
// - /login y /api/login: el login mismo
// - /api/notify: la llama n8n con su propio Bearer
// - /api/cron: la llama Vercel Cron con su propio Bearer
const PUBLIC_PREFIXES = ['/login', '/api/login', '/api/notify', '/api/cron']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (await isValidToken(token)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Excluye assets estáticos y archivos de la PWA (sw.js, manifest, íconos, etc.)
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons/|.*\\.(?:png|jpg|svg|ico|webmanifest)$).*)'],
}
