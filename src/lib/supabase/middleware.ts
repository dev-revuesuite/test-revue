import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { appRoute, stripBasePath } from '@/lib/base-path'

function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'
  const supabaseHost = (() => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      return url ? new URL(url).host : ''
    } catch {
      return ''
    }
  })()

  // HSTS (only when not on http://localhost dev server)
  if (isProd || !request.nextUrl.hostname.includes('localhost')) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Clickjacking protection
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Content-Security-Policy', "frame-ancestors 'self'")

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy: disable powerful features we don't use
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Isolate the browsing context group
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')

  // Tell shared/CDN caches to vary by auth cookie so each user gets a unique
  // RSC payload, but still allow browser re-use on rapid re-navigation.
  // `private` = only the browser may cache (not shared caches),
  // `max-age=10` = safe browser re-use window for the same user,
  // `must-revalidate` = after that window the browser must re-validate.
  const isRsc = request.headers.get('rsc') === '1' || request.nextUrl.searchParams.has('_rsc')
  if (isRsc) {
    response.headers.set(
      'Cache-Control',
      'private, max-age=10, must-revalidate'
    )
    response.headers.set('Vary', 'Cookie, RSC, Next-Router-State-Tree')
  }

  // Content Security Policy - allow Supabase, Google Fonts, and self
  const scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
  const styleSrc = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']
  const fontSrc = ["'self'", 'data:', 'https://fonts.gstatic.com']
  const imgSrc = ["'self'", 'data:', 'blob:', 'https:']
  const connectSrc = ["'self'", 'https:', 'wss:', supabaseHost].filter(Boolean)
  const frameAncestors = ["'self'"]

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    `font-src ${fontSrc.join(' ')}`,
    `img-src ${imgSrc.join(' ')}`,
    `connect-src ${connectSrc.join(' ')}`,
    `frame-ancestors ${frameAncestors.join(' ')}`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // If Supabase is unreachable, allow the request through
  }

  const pathname = stripBasePath(request.nextUrl.pathname)

  // Protected routes
  const protectedRoutes = ['/studio', '/creative-zone', '/productive-zone']
  const authRoutes = ['/login', '/signup']

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = appRoute('/login')
    return applySecurityHeaders(NextResponse.redirect(url), request)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = appRoute('/studio')
    return applySecurityHeaders(NextResponse.redirect(url), request)
  }

  return applySecurityHeaders(supabaseResponse, request)
}
