"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { publicPath, withBasePath } from "@/lib/base-path"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export interface InvitePreview {
  status: "pending" | "accepted" | "expired" | "revoked"
  email: string
  name: string | null
  role: string
  organization_name: string
  client_name: string | null
  inviter_name: string | null
}

const ACCEPT_MESSAGES: Record<string, string> = {
  not_signed_in: "Please sign in again, then open the invite link.",
  not_verified: "Verify your email first, then open the invite link again.",
  not_found: "This invite link isn't valid.",
  email_mismatch: "This invite is for a different email address.",
  expired: "This invite has expired. Ask for a new one.",
  revoked: "This invite was withdrawn.",
  already_client:
    "You're already a client reviewer in this workspace, and one account can have only one role per workspace. Ask the owner to change your role.",
  no_seat:
    "This workspace has no free team seats right now. Ask its owner to free one up or upgrade their plan, then open the link again.",
  waitlisted:
    "You're on the waiting list: this workspace has no free guest reviewer seats right now. You'll get access as soon as one frees up.",
}

function Logo() {
  return (
    <div className="flex justify-center">
      <Image
        src={publicPath("/Logo/Artboard_5.png")}
        alt="Revue"
        width={160}
        height={49}
        priority
        className="dark:hidden"
      />
      <Image
        src={publicPath("/Logo/Artboard_1.png")}
        alt="Revue"
        width={160}
        height={49}
        priority
        className="hidden dark:block"
      />
    </div>
  )
}

const primaryButton =
  "w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"

export function InviteLanding({
  token,
  invite,
  signedInEmail,
}: {
  token: string
  invite: InvitePreview | null
  signedInEmail: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc("accept_invitation", { p_token: token })
    if (rpcError) {
      setError("Couldn't accept the invite. Please try again.")
      setBusy(false)
      return
    }
    if (data === "joined") {
      // Studio sends people on to onboarding or the client portal as needed.
      router.push("/studio")
      router.refresh()
      return
    }
    setError(ACCEPT_MESSAGES[String(data)] ?? "Couldn't accept the invite. Please try again.")
    setBusy(false)
  }

  const handleSignOut = async () => {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    setBusy(false)
  }

  let body: React.ReactNode

  if (!invite) {
    body = (
      <Message title="Invite not found">
        This invite link isn&apos;t valid. Check that you copied the whole link, or ask for a new
        invite.
      </Message>
    )
  } else if (invite.status === "expired") {
    body = (
      <Message title="This invite has expired">
        Ask {invite.inviter_name || invite.organization_name} to send you a new invite.
      </Message>
    )
  } else if (invite.status === "revoked") {
    body = (
      <Message title="This invite was withdrawn">
        Ask {invite.inviter_name || invite.organization_name} if you still need access.
      </Message>
    )
  } else {
    const who = invite.inviter_name || invite.organization_name
    const what = invite.client_name
      ? `review ${invite.client_name}'s designs with ${invite.organization_name}`
      : `join ${invite.organization_name}`
    const emailMatches =
      !!signedInEmail && signedInEmail.toLowerCase() === invite.email.toLowerCase()

    const signupParams = new URLSearchParams({ token, email: invite.email })
    if (invite.name) signupParams.set("name", invite.name)
    const loginParams = new URLSearchParams({ invite: token, email: invite.email })

    body = (
      <>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold">You&apos;re invited</h1>
          <p className="text-muted-foreground text-base">
            {who} invited you to {what} on Revue.
          </p>
          <p className="text-sm text-muted-foreground">
            Invite for <span className="font-medium text-foreground break-all">{invite.email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md" role="alert">
            {error}
          </div>
        )}

        {signedInEmail && emailMatches ? (
          <Button type="button" onClick={handleAccept} disabled={busy} className={primaryButton}>
            {busy ? "Joining..." : `Join ${invite.organization_name}`}
          </Button>
        ) : signedInEmail ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              You&apos;re signed in as{" "}
              <span className="font-medium text-foreground break-all">{signedInEmail}</span>. Sign
              out, then open the invite link again with {invite.email}.
            </p>
            <Button type="button" variant="outline" onClick={handleSignOut} disabled={busy} className="w-full h-12 text-base">
              Sign out
            </Button>
          </div>
        ) : invite.status === "accepted" ? (
          <Button asChild className={primaryButton}>
            <a href={withBasePath(`/login?${loginParams.toString()}`)}>Sign in to continue</a>
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <Button asChild className={primaryButton}>
              <a href={withBasePath(`/signup?${signupParams.toString()}`)}>Create account</a>
            </Button>
            <Button asChild variant="outline" className="w-full h-12 text-base">
              <a href={withBasePath(`/login?${loginParams.toString()}`)}>I already have an account</a>
            </Button>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <Logo />
      {body}
    </div>
  )
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground text-base">{children}</p>
      <a href={withBasePath("/login")} className="text-base underline underline-offset-4 hover:text-primary">
        Go to sign in
      </a>
    </div>
  )
}
