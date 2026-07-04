import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { absoluteAppUrl, appRoute } from '@/lib/base-path'

export const dynamic = 'force-dynamic'

function createSupabaseRouteClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

async function resolvePostSignInRedirect(
  supabase: SupabaseClient,
  origin: string,
  nextPath: string
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return absoluteAppUrl(origin, nextPath)
  }

  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  if (user.email) {
    await supabase.rpc('link_user_to_org_member', {
      p_user_id: user.id,
      p_email: user.email,
    })

    try {
      await supabase.rpc('link_user_to_client', {
        p_user_id: user.id,
        p_email: user.email,
      })
    } catch {
      // RPC may not exist, ignore
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.onboarded) {
    return absoluteAppUrl(origin, '/onboarding')
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (membership?.role === 'client') {
    return absoluteAppUrl(origin, '/client-portal')
  }

  return absoluteAppUrl(origin, nextPath)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash') ?? searchParams.get('token')
  const type = searchParams.get('type')
  const nextPath = appRoute(searchParams.get('next') ?? '/studio')
  const isPasswordRecovery = type === 'recovery' || nextPath === '/update-password'

  const recoverySuccessUrl = absoluteAppUrl(origin, '/update-password')
  const recoveryErrorUrl = absoluteAppUrl(origin, '/update-password?error=link_expired')

  if (isPasswordRecovery && tokenHash) {
    const response = NextResponse.redirect(recoverySuccessUrl)
    const supabase = createSupabaseRouteClient(request, response)
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    })

    if (error) {
      return NextResponse.redirect(recoveryErrorUrl)
    }

    return response
  }

  if (code) {
    if (isPasswordRecovery) {
      const response = NextResponse.redirect(recoverySuccessUrl)
      const supabase = createSupabaseRouteClient(request, response)
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        return NextResponse.redirect(recoveryErrorUrl)
      }

      return response
    }

    const provisionalRedirect = absoluteAppUrl(origin, nextPath)
    const response = NextResponse.redirect(provisionalRedirect)
    const supabase = createSupabaseRouteClient(request, response)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(absoluteAppUrl(origin, '/login?error=auth_callback_error'))
    }

    const redirectUrl = await resolvePostSignInRedirect(supabase, origin, nextPath)
    response.headers.set('Location', redirectUrl)
    return response
  }

  if (isPasswordRecovery) {
    return NextResponse.redirect(recoveryErrorUrl)
  }

  return NextResponse.redirect(absoluteAppUrl(origin, '/login?error=auth_callback_error'))
}
