"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Always show success — Supabase doesn't reveal if email exists
      setEmailSent(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Success State ──
  if (emailSent) {
    return (
      <div className={cn("flex flex-col gap-8", className)} {...props}>
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/Logo/Artboard 8@2x.png"
            alt="Revue"
            width={160}
            height={49}
            priority
            className="dark:hidden"
          />
          <Image
            src="/Logo/Artboard 8 copy@2x.png"
            alt="Revue"
            width={160}
            height={49}
            priority
            className="hidden dark:block"
          />
        </div>

        {/* Success message */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#DBFE52]/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#DBFE52]" />
          </div>
          <h1 className="text-3xl font-bold">Check your email</h1>
          <p className="text-muted-foreground text-base">
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="text-muted-foreground text-sm">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => {
                setEmailSent(false)
                setEmail("")
              }}
              className="underline underline-offset-4 hover:text-primary"
            >
              try again
            </button>
          </p>
        </div>

        {/* Back to login */}
        <div className="flex justify-center">
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </a>
        </div>
      </div>
    )
  }

  // ── Email Input State ──
  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      {/* Logo */}
      <div className="flex justify-center">
        <Image
          src="/Logo/Artboard 8@2x.png"
          alt="Revue"
          width={160}
          height={49}
          priority
          className="dark:hidden"
        />
        <Image
          src="/Logo/Artboard 8 copy@2x.png"
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
          <Mail className="w-6 h-6 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold">Reset your password</h1>
        <p className="text-muted-foreground text-base">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Label htmlFor="reset-email" className="w-24 shrink-0 text-base">
            Email
          </Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="xyz@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-base"
            required
            autoFocus
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>

        {/* Footer link */}
        <p className="text-center text-base text-muted-foreground">
          Remember your password?{" "}
          <a
            href="/login"
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </a>
        </p>
      </form>
    </div>
  )
}
