import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingLottie } from "@/components/onboarding/onboarding-lottie"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-svh">
      <div className="hidden lg:flex w-1/2 min-h-svh items-center justify-center bg-zinc-900 p-8">
        <div className="w-full max-w-3xl">
          <OnboardingLottie />
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10 min-h-svh">
        <div className="w-full max-w-md">
          <OnboardingForm userEmail={user.email ?? ""} />
        </div>
      </div>
    </div>
  )
}
