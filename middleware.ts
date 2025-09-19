import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Determine the correct cookie name based on the environment.
  // In production (HTTPS), the cookie is prefixed with `__Secure-`.
  const isProduction = process.env.NODE_ENV === 'production'
  const tokenName = isProduction
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'

  // Get the token using the dynamically determined name.
  const token = request.cookies.get(tokenName)?.value

  const { pathname } = request.nextUrl

  const publicPaths = ['/sign-in', '/sign-up', '/' , '/forgot-password' , '/reset-password']
  const isPublicPath = publicPaths.includes(pathname)

  // If the user has a token and is on a public page, redirect to dashboard.
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/all-task', request.url))
  }

  // If the user has no token and is on a protected page, redirect to sign-in.
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}

// The matcher remains the same, it's already optimized.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}