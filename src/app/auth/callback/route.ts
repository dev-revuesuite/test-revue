import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/studio'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Ensure profile exists for OAuth signups
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        )

        // Auto-link to organization if email was pre-added as a team member
        if (user.email) {
          await supabase.rpc('link_user_to_org_member', {
            p_user_id: user.id,
            p_email: user.email,
          })
        }

        // Check onboarding status
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('id', user.id)
          .single()

        if (!profile || !profile.onboarded) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }

        // Role-based routing: check if user is a linked member (designer/client)
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        if (membership) {
          const role = membership.role
          if (role === 'client') {
            return NextResponse.redirect(`${origin}/productive-zone`)
          }
          // admin/owner/designer goes to studio (default)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
