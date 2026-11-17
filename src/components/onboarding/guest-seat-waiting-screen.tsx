"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Clock, Loader2 } from "lucide-react"

import { publicPath } from "@/lib/base-path"
import { createClient } from "@/lib/supabase/client"

interface GuestSeatWaitingScreenProps {
  organizationNames: string[]
}

/**
 * Shown instead of onboarding to a client whose access is on hold because the
 * organization's guest reviewer seats are full.
 */
export function GuestSeatWaitingScreen({ organizationNames }: GuestSeatWaitingScreenProps) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [stillWaiting, setStillWaiting] = useState(false)

  const names = organizationNames.join(", ")
  const plural = organizationNames.length > 1

  const handleCheckAgain = async () => {
    setChecking(true)
    setStillWaiting(false)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.email) return

      // Tries to link again; succeeds once a seat is free.
      await supabase.rpc("link_user_to_client", {
        p_user_id: user.id,
        p_email: user.email,
      })

      const { data: waiting } = await supabase.rpc("get_my_guest_seat_waitlist")
      if (Array.isArray(waiting) && waiting.length > 0) {
        setStillWaiting(true)
        return
      }

      // Linked: continue with normal client onboarding.
      router.refresh()
    } finally {
      setChecking(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center min-h-svh bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#DBFE52]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#DBFE52]/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full flex items-center justify-between px-8 pt-8 relative z-10">
        <Image src={publicPath("/Logo/Artboard_1.png")} alt="Revue" width={120} height={37} priority />
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut || checking}
          className="text-sm text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10 w-full">
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-[#DBFE52]/10 flex items-center justify-center">
            <Clock className="w-7 h-7 text-[#DBFE52]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-3">Almost there</h1>
            <p className="text-zinc-400 text-base leading-relaxed">
              <span className="text-white font-medium">{names}</span>{" "}
              {plural ? "have" : "has"} reached {plural ? "their" : "its"} limit for client
              reviewers, so your access is on hold. We&apos;ve let them know. Once they free up a
              seat or upgrade, you&apos;ll get access.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleCheckAgain()}
            disabled={checking || signingOut}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#DBFE52] text-black text-sm font-semibold hover:bg-[#c9ec48] transition-colors disabled:opacity-60"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {checking ? "Checking..." : "Check again"}
          </button>

          {stillWaiting ? (
            <p className="text-sm text-zinc-500" role="status">
              Still on hold. Try again after they&apos;ve freed a seat or upgraded.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
