import { createClient } from "@/lib/supabase/server"
import { InviteLanding, type InvitePreview } from "@/components/invite-landing"
import { OnboardingLottie } from "@/components/onboarding/onboarding-lottie"

export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  let invite: InvitePreview | null = null
  if (UUID_PATTERN.test(token)) {
    const { data } = await supabase.rpc("get_invitation_preview", { p_token: token })
    invite = (Array.isArray(data) ? data[0] : data) ?? null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-svh">
      <div className="hidden lg:flex w-1/2 min-h-svh items-center justify-center bg-zinc-900 p-8">
        <div className="w-full max-w-3xl">
          <OnboardingLottie />
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10 min-h-svh">
        <div className="w-full max-w-md">
          <InviteLanding token={token} invite={invite} signedInEmail={user?.email ?? null} />
        </div>
      </div>
    </div>
  )
}
