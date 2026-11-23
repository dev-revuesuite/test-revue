"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"

import { publicPath, withBasePath } from "@/lib/base-path"
import { completeSignup } from "@/lib/complete-signup"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

export function VerifyEmailForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")?.trim() ?? ""
  const inviteToken = searchParams.get("token")

  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  // A code was just sent when the user arrives here, so start with the wait.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from the email.`)
      return
    }

    setError(null)
    setNotice(null)
    setVerifying(true)

    const supabase = createClient()
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    })

    if (verifyError || !data.user) {
      setError("That code is wrong or has expired. Check it, or send a new code.")
      setVerifying(false)
      return
    }

    await completeSignup(supabase, { user: data.user, inviteToken })

    // Onboarding sends people who have already finished it on to the studio.
    router.push("/onboarding")
    router.refresh()
  }

  const handleResend = async () => {
    if (cooldown > 0 || resending) return
    setError(null)
    setNotice(null)
    setResending(true)

    const supabase = createClient()
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    })

    setResending(false)
    if (resendError) {
      setError(
        resendError.status === 429
          ? "Please wait a minute before asking for another code."
          : "We couldn't send a new code. Please try again in a minute."
      )
      return
    }
    setNotice(`We sent a new code to ${email}.`)
    setCode("")
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
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

      {!email ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-bold">Verify your email</h1>
          <p className="text-muted-foreground text-base">
            This link is missing your email address.{" "}
            <a href={withBasePath("/signup")} className="underline underline-offset-4 hover:text-primary">
              Sign up again
            </a>{" "}
            or{" "}
            <a href={withBasePath("/login")} className="underline underline-offset-4 hover:text-primary">
              sign in
            </a>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-3xl font-bold">Verify your email</h1>
            <p className="text-muted-foreground text-base">
              We sent a {CODE_LENGTH}-digit code to{" "}
              <span className="font-medium text-foreground break-all">{email}</span>.
              Enter it below to continue.
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="bg-muted text-foreground text-sm p-4 rounded-md" role="status">
              {notice}
            </div>
          )}

          <form onSubmit={handleVerify} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code" className="text-base">
                Verification code
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="123456"
                maxLength={CODE_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
                className="h-14 text-center text-2xl tracking-[0.5em] font-semibold"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={verifying || code.length !== CODE_LENGTH}
              className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
            >
              {verifying ? "Verifying..." : "Verify email"}
            </Button>

            <div className="flex flex-col items-center gap-2 text-base text-muted-foreground">
              <p>
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className="underline underline-offset-4 hover:text-primary disabled:no-underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resending
                    ? "sending..."
                    : cooldown > 0
                      ? `send a new code in ${cooldown}s`
                      : "send a new code"}
                </button>
                .
              </p>
              <p>
                Wrong email?{" "}
                <a href={withBasePath("/signup")} className="underline underline-offset-4 hover:text-primary">
                  Sign up again
                </a>
              </p>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
