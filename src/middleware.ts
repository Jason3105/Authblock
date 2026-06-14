import { NextRequest, NextResponse } from 'next/server'

/**
 * Lightweight server-side guard for admin pages.
 *
 * After a successful Google sign-in the link-firebase API sets an
 * `admin_session` cookie.  Any request hitting /admin/** (except the login
 * page itself) that lacks this cookie is redirected straight to /admin/login.
 *
 * This does NOT replace the client-side Firebase auth check inside AdminShell
 * — both layers run and complement each other.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect admin pages — skip the login page itself to avoid redirect loops
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminSession = req.cookies.get('admin_session')
    if (!adminSession?.value) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Run on /admin/** page routes only — never on API routes or static assets
  matcher: ['/admin/:path*'],
}
