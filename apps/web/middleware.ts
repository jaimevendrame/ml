import { NextRequest, NextResponse } from 'next/server'
import { betterFetch } from '@better-fetch/fetch'

type Session = { user: { id: string; email: string } }

const PUBLIC = ['/login', '/signup', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const { data: session } = await betterFetch<Session>('/api/auth/get-session', {
    baseURL: request.nextUrl.origin,
    headers: { cookie: request.headers.get('cookie') ?? '' },
  })

  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
