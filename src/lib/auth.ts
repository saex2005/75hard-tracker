// Auth simple de dispositivo: una password (env APP_PASSWORD) → cookie httpOnly de larga duración.
// Web Crypto para que funcione igual en edge (middleware) y node (routes).
// Fail-open: sin APP_PASSWORD seteada la app queda abierta — un deploy sin env vars no la brickea.

export const AUTH_COOKIE = 'hard75_auth'

export async function expectedToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD
  if (!password) return null
  const data = new TextEncoder().encode(`${password}::75hard-v1`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  const expected = await expectedToken()
  if (expected === null) return true // sin password configurada → abierto
  return token === expected
}
