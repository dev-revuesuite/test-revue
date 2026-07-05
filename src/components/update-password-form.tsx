"use client"

import { withBasePath, publicPath } from "@/lib/base-path"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/password-input"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { Lock, CheckCircle2, AlertTriangle } from "lucide-react"

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkExpiredFromUrl = searchParams.get("error") === "link_expired"
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null) // null = loading

  // Check if user has a valid session (from the reset email link)
  useEffect(() => {
    let cancelled = false

    const verifyResetSession = async () => {
      const supabase = createClient()

      if (linkExpiredFromUrl) {
        setHasSession(false)
        return
      }

      const code = searchParams.get("code")
      if (code) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
        if (codeError) {
          if (!cancelled) setHasSession(false)
          return
        }
      } else {
        const tokenHash =
          searchParams.get("token_hash") ?? searchParams.get("token")
        const type = searchParams.get("type")

        if (type === "recovery" && tokenHash) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          })

          if (otpError) {
            if (!cancelled) setHasSession(false)
            return
          }
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!cancelled) {
        setHasSession(!!user)
        if (
          user &&
          (searchParams.get("token_hash") ||
            searchParams.get("token") ||
            searchParams.get("code"))
        ) {
          router.replace("/update-password")
        }
      }
    }

    void verifyResetSession()

    return () => {
      cancelled = true
    }
  }, [linkExpiredFromUrl, router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password) {
      setError("Please enter a new password")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Password updated — sign out and redirect to login
      setSuccess(true)
      await supabase.auth.signOut()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Loading state (checking session) ──
  if (hasSession === null) {
    return (
      <div className={cn("flex flex-col items-center gap-4", className)} {...props}>
        <div className="w-10 h-10 border-4 border-muted border-t-foreground rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
      </div>
    )
  }

  // ── No session — link expired or invalid ──
  if (!hasSession) {
    return (
      <div className={cn("flex flex-col gap-8", className)} {...props}>
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src={publicPath("/Logo/Artboard 8@2x.png")}
            alt="Revue"
            width={160}
            height={49}
            priority
            className="dark:hidden"
          />
          <Image
            src={publicPath("/Logo/Artboard 8 copy@2x.png")}
            alt="Revue"
            width={160}
            height={49}
            priority
            className="hidden dark:block"
          />
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold">Link expired</h1>
          <p className="text-muted-foreground text-base">
            This password reset link has expired or is invalid.
            Please request a new one.
          </p>
        </div>

        <Button
          onClick={() => router.push("/forgot-password")}
          className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
        >
          Request New Link
        </Button>

        <p className="text-center text-base text-muted-foreground">
          Remember your password?{" "}
          <a
            href={withBasePath("/login")}
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </a>
        </p>
      </div>
    )
  }

  // ── Success State ──
  if (success) {
    return (
      <div className={cn("flex flex-col gap-8", className)} {...props}>
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src={publicPath("/Logo/Artboard 8@2x.png")}
            alt="Revue"
            width={160}
            height={49}
            priority
            className="dark:hidden"
          />
          <Image
            src={publicPath("/Logo/Artboard 8 copy@2x.png")}
            alt="Revue"
            width={160}
            height={49}
            priority
            className="hidden dark:block"
          />
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#DBFE52]/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#DBFE52]" />
          </div>
          <h1 className="text-3xl font-bold">Password updated!</h1>
          <p className="text-muted-foreground text-base">
            Your password has been successfully changed.
            You can now sign in with your new password.
          </p>
        </div>

        <Button
          onClick={() => router.push("/login")}
          className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
        >
          Go to Login
        </Button>
      </div>
    )
  }

  // ── Password Input State ──
  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      {/* Logo */}
      <div className="flex justify-center">
        <Image
          src={publicPath("/Logo/Artboard 8@2x.png")}
          alt="Revue"
          width={160}
          height={49}
          priority
          className="dark:hidden"
        />
        <Image
          src={publicPath("/Logo/Artboard 8 copy@2x.png")}
          alt="Revue"
          width={160}
          height={49}
          priority
          className="hidden dark:block"
        />
      </div>

      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-2">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold">Set new password</h1>
        <p className="text-muted-foreground text-base">
          Enter your new password below.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Label htmlFor="new-password" className="w-24 shrink-0 text-base">
            Password
          </Label>
          <PasswordInput
            id="new-password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 text-base"
            required
            autoFocus
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="confirm-password" className="w-24 shrink-0 text-base">
            Confirm
          </Label>
          <PasswordInput
            id="confirm-password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>

        {/* Password match indicator */}
        {confirmPassword && (
          <div className="flex items-center gap-2 -mt-2">
            {password === confirmPassword ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#DBFE52]" />
                <span className="text-sm text-[#DBFE52]">Passwords match</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">Passwords do not match</span>
              </>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  )
}
